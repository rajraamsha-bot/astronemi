import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator, RefreshControl, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { 
  Gem, Star, ShoppingBag, X, 
  Heart, Package, Truck, Shield, Award, Sparkles, AlertCircle, RefreshCw, ArrowLeft
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { ApiResponse, PaginatedResponse, productsApi, DbProduct } from '@/services/api';
import { offlineStorage } from '@/services/offline-storage';

interface Product {
  id: string;
  name: string;
  hindiName: string;
  category: string;
  price: number;
  originalPrice: number;
  image: string;
  rating: number;
  reviews: number;
  description: string;
  benefits: string[];
  planet?: string;
  weight?: string;
  certification: boolean;
  inStock: boolean;
}

const categories = [
  { id: 'gemstones', name: 'Gemstones', icon: Gem, color: Colors.purple },
  { id: 'rudraksha', name: 'Rudraksha', icon: Star, color: Colors.primary },
  { id: 'yantras', name: 'Yantras', icon: Sparkles, color: Colors.gold },
  { id: 'mala', name: 'Mala & Beads', icon: Package, color: Colors.success },
];

export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { addItem } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchProducts = useCallback(async (pageNum: number = 1, refresh: boolean = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setLoading(true);
      }
      setError(null);

      const response: ApiResponse<PaginatedResponse<DbProduct>> = await productsApi.getProducts({
        category: selectedCategory || undefined,
        page: pageNum,
        pageSize: 20,
      });

      if (response.error || !response.data) {
        // Offline fallback: last successfully-fetched catalog. Never
        // fabricated products — the mock array previously shown here
        // presented purchasable items (prices, "certified" badges) that
        // do not exist in the database.
        const cachedData = await offlineStorage.get<Product[]>('shop_products');
        setProducts(cachedData ?? []);
        setHasMore(false);
        setError('Using offline data. Some features may be limited.');
      } else {
        // Transform DB rows to the Product shape. The selling price is
        // discount_price ?? price — the same rule create-razorpay-order
        // uses server-side, so the cart total and the charged amount agree.
        const transformedData: Product[] = response.data.data.map((p) => ({
          id: p.id,
          name: p.name,
          hindiName: p.name,
          category: p.category ?? 'gemstones',
          price: p.discount_price ?? p.price,
          originalPrice: p.price,
          image: p.images?.[0] ?? '',
          rating: p.rating ?? 0,
          reviews: p.total_reviews ?? 0,
          description: p.description ?? '',
          benefits: [],
          certification: false,
          inStock: (p.stock ?? 0) > 0,
        }));

        let updatedProducts: Product[] = [];
        setProducts(prev => {
          updatedProducts = pageNum === 1 ? transformedData : [...prev, ...transformedData];
          return updatedProducts;
        });

        setHasMore(response.data.hasMore || false);

        // Cache only real results — caching an empty page 1 (the old mock
        // behavior) permanently blanked the offline catalog.
        if (updatedProducts.length > 0) {
          await offlineStorage.save('shop_products', updatedProducts);
        }
      }
    } catch {
      const cachedData = await offlineStorage.get<Product[]>('shop_products');
      setProducts(cachedData ?? []);
      setHasMore(false);
      setError('Connection error. Showing cached data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory]);

  // effect:audited — Event-driven: Fetch products when selectedCategory changes
  // This triggers a data fetch when the user changes the category
  useEffect(() => {
    fetchProducts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  const handleRefresh = useCallback(() => {
    setPage(1);
    fetchProducts(1, true);
  }, [fetchProducts]);

  const handleLoadMore = useCallback(() => {
    if (!loading && !refreshing && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchProducts(nextPage);
    }
  }, [loading, refreshing, hasMore, page, fetchProducts]);

  const filteredProducts = selectedCategory 
    ? products.filter(p => p.category === selectedCategory)
    : products;

  const toggleFavorite = (productId: string) => {
    setFavorites(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const formatPrice = (price: number) => {
    return `Rs. ${price.toLocaleString('en-IN')}`;
  };

  const getDiscount = (product: Product) => {
    return Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
  };

  const getCartType = (category: string): 'gemstone' | 'rudraksha' | 'yantra' | 'mala' | 'book' | 'other' => {
    if (category.includes('gem')) return 'gemstone';
    if (category.includes('rudraksha')) return 'rudraksha';
    if (category.includes('yantra')) return 'yantra';
    if (category.includes('mala')) return 'mala';
    if (category.includes('book')) return 'book';
    return 'other';
  };

  const handleAddToCart = () => {
    if (!selectedProduct || !selectedProduct.inStock) return;
    addItem({
      id: selectedProduct.id,
      name: selectedProduct.name,
      price: selectedProduct.price,
      originalPrice: selectedProduct.originalPrice,
      image: selectedProduct.image,
      type: getCartType(selectedProduct.category),
      weight: selectedProduct.weight,
      certification: selectedProduct.certification,
    });
    setSelectedProduct(null);
    router.push('/cart');
  };

  const renderContent = () => {
    if (loading && products.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.purple} />
          <Text style={styles.loadingText}>{t('shop.loadingProducts')}</Text>
        </View>
      );
    }

    if (error && products.length === 0) {
      return (
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color={Colors.error} />
          <Text style={styles.errorTitle}>{t('shop.unableToLoad')}</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <RefreshCw size={20} color={Colors.white} />
            <Text style={styles.retryText}>{t('shop.tryAgain')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const renderProduct = ({ item: product }: { item: Product }) => (
      <TouchableOpacity
        key={product.id}
        style={styles.productCard}
        onPress={() => setSelectedProduct(product)}
      >
        <View style={styles.productImageContainer}>
          <Image 
            source={{ uri: product.image }} 
            style={styles.productImage}
            contentFit="cover"
            transition={500}
            placeholder="|rF?hV%2WCj[ayj[a|j[ayofayayj[fQoff7azayj[ayj[j[ayofayayayj[fQofayayayj[ayj[ayj[ayj[ayof"
          />
          <TouchableOpacity 
            style={styles.favoriteButton}
            onPress={() => toggleFavorite(product.id)}
          >
            <Heart 
              size={18} 
              color={favorites.includes(product.id) ? Colors.error : Colors.white}
              fill={favorites.includes(product.id) ? Colors.error : 'transparent'}
            />
          </TouchableOpacity>
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{getDiscount(product)}% {t('shop.off')}</Text>
          </View>
          {!product.inStock && (
            <View style={styles.outOfStockBadge}>
              <Text style={styles.outOfStockText}>{t('shop.outOfStock')}</Text>
            </View>
          )}
        </View>

        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
          <Text style={styles.productHindi}>{product.hindiName}</Text>
          
          <View style={styles.ratingRow}>
            <Star size={12} color={Colors.gold} fill={Colors.gold} />
            <Text style={styles.ratingText}>{product.rating}</Text>
            <Text style={styles.reviewsText}>({product.reviews})</Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.productPrice}>{formatPrice(product.price)}</Text>
            <Text style={styles.originalPrice}>{formatPrice(product.originalPrice)}</Text>
          </View>

          {product.certification && (
            <View style={styles.certBadge}>
              <Shield size={10} color={Colors.success} />
              <Text style={styles.certText}>{t('shop.certified')}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );

    const ListHeaderComponent = (
      <>
        {/* Trust Badges */}
        <View style={styles.trustBadges}>
          <View style={styles.badge}>
            <Shield size={16} color={Colors.success} />
            <Text style={styles.badgeText}>{t('shop.authentic')}</Text>
          </View>
          <View style={styles.badge}>
            <Award size={16} color={Colors.primary} />
            <Text style={styles.badgeText}>{t('shop.labCertified')}</Text>
          </View>
          <View style={styles.badge}>
            <Truck size={16} color={Colors.purple} />
            <Text style={styles.badgeText}>{t('shop.freeShipping')}</Text>
          </View>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <AlertCircle size={16} color={Colors.error} />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* Categories */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryList}
        >
          <TouchableOpacity
            style={[styles.categoryTab, !selectedCategory && styles.categoryTabActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <ShoppingBag size={18} color={!selectedCategory ? Colors.white : Colors.text} />
            <Text style={[styles.categoryTabText, !selectedCategory && styles.categoryTabTextActive]}>
              {t('shop.all')}
            </Text>
          </TouchableOpacity>
          {categories.map((cat) => {
            const IconComponent = cat.icon;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryTab, selectedCategory === cat.id && styles.categoryTabActive]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <IconComponent size={18} color={selectedCategory === cat.id ? Colors.white : cat.color} />
                <Text style={[styles.categoryTabText, selectedCategory === cat.id && styles.categoryTabTextActive]}>
                  {t('shop.' + cat.id)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </>
    );

    const ListFooterComponent = (
      <>
        {loading && hasMore && (
          <View style={styles.loadMoreContainer}>
            <ActivityIndicator size="small" color={Colors.purple} />
            <Text style={styles.loadMoreText}>{t('shop.loadingMore')}</Text>
          </View>
        )}
        
        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>{t('shop.whyShop')}</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Shield size={24} color={Colors.primary} />
              <Text style={styles.infoItemTitle}>{t('shop.authentic')}</Text>
              <Text style={styles.infoItemText}>{t('shop.authenticDesc')}</Text>
            </View>
            <View style={styles.infoItem}>
              <Truck size={24} color={Colors.success} />
              <Text style={styles.infoItemTitle}>{t('shop.freeShipping')}</Text>
              <Text style={styles.infoItemText}>{t('shop.freeShippingDesc')}</Text>
            </View>
            <View style={styles.infoItem}>
              <Package size={24} color={Colors.purple} />
              <Text style={styles.infoItemTitle}>{t('shop.easyReturns')}</Text>
              <Text style={styles.infoItemText}>{t('shop.easyReturnsDesc')}</Text>
            </View>
            <View style={styles.infoItem}>
              <Sparkles size={24} color={Colors.gold} />
              <Text style={styles.infoItemTitle}>{t('shop.energized')}</Text>
              <Text style={styles.infoItemText}>{t('shop.energizedDesc')}</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 20 }} />
      </>
    );

    return (
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        numColumns={2}
        columnWrapperStyle={styles.productsRow}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={ListFooterComponent}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.purple]}
            tintColor={Colors.purple}
          />
        }
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft color={Colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('shop.spiritualShop')}</Text>
        <View style={styles.backButton} />
      </View>
      
      {renderContent()}

      {/* Product Detail Modal */}
      <Modal
        visible={!!selectedProduct}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedProduct(null)}
      >
        {selectedProduct && (
          <SafeAreaView style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('shop.productDetails')}</Text>
              <TouchableOpacity onPress={() => setSelectedProduct(null)}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <Image 
                source={{ uri: selectedProduct.image }} 
                style={styles.modalImage}
                contentFit="cover"
                transition={500}
                placeholder="|rF?hV%2WCj[ayj[a|j[ayofayayj[fQoff7azayj[ayj[j[ayofayayayj[fQofayayayj[ayj[ayj[ayj[ayof"
              />

              <View style={styles.modalInfo}>
                <Text style={styles.modalProductName}>{selectedProduct.name}</Text>
                <Text style={styles.modalProductHindi}>{selectedProduct.hindiName}</Text>

                <View style={styles.modalRatingRow}>
                  <Star size={16} color={Colors.gold} fill={Colors.gold} />
                  <Text style={styles.modalRatingText}>{selectedProduct.rating}</Text>
                  <Text style={styles.modalReviewsText}>({selectedProduct.reviews} {t('shop.reviewsSuffix')})</Text>
                  {selectedProduct.certification && (
                    <View style={styles.modalCertBadge}>
                      <Shield size={12} color={Colors.success} />
                      <Text style={styles.modalCertText}>{t('shop.labCertified')}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.modalPriceRow}>
                  <Text style={styles.modalPrice}>{formatPrice(selectedProduct.price)}</Text>
                  <Text style={styles.modalOriginalPrice}>{formatPrice(selectedProduct.originalPrice)}</Text>
                  <View style={styles.modalDiscountBadge}>
                    <Text style={styles.modalDiscountText}>{getDiscount(selectedProduct)}% OFF</Text>
                  </View>
                </View>

                {selectedProduct.planet && (
                  <View style={styles.planetCard}>
                    <Text style={styles.planetLabel}>{t('shop.associatedPlanet')}</Text>
                    <Text style={styles.planetValue}>{selectedProduct.planet}</Text>
                  </View>
                )}

                {selectedProduct.weight && (
                  <View style={styles.specRow}>
                    <Text style={styles.specLabel}>{t('shop.weight')}</Text>
                    <Text style={styles.specValue}>{selectedProduct.weight}</Text>
                  </View>
                )}

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>{t('shop.description')}</Text>
                  <Text style={styles.modalDescription}>{selectedProduct.description}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>{t('shop.benefits')}</Text>
                  {selectedProduct.benefits.map((benefit, idx) => (
                    <View key={idx} style={styles.benefitItem}>
                      <Star size={14} color={Colors.success} fill={Colors.success} />
                      <Text style={styles.benefitText}>{benefit}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity 
                  style={[
                    styles.addToCartButton,
                    !selectedProduct.inStock && styles.addToCartButtonDisabled
                  ]}
                  disabled={!selectedProduct.inStock}
                  onPress={handleAddToCart}
                >
                  <ShoppingBag size={20} color={Colors.white} />
                  <Text style={styles.addToCartText}>
                    {selectedProduct.inStock ? t('shop.addToCart') : t('shop.outOfStock')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.consultButton}>
                  <Gem size={20} color={Colors.primary} />
                  <Text style={styles.consultButtonText}>{t('shop.consultBeforeBuying')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textLight,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.purple,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
  },
  shopHeader: {
    backgroundColor: Colors.purple,
    padding: 20,
    alignItems: 'center',
  },
  shopHeaderTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
    marginTop: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.9,
    marginTop: 4,
  },
  trustBadges: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    padding: 16,
    backgroundColor: Colors.white,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.text,
  },
  categoryScroll: {
    maxHeight: 60,
    backgroundColor: Colors.white,
  },
  categoryList: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background,
    gap: 6,
    marginRight: 8,
  },
  categoryTabActive: {
    backgroundColor: Colors.primary,
  },
  categoryTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
  },
  categoryTabTextActive: {
    color: Colors.white,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 12,
  },
  productsRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  productCard: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
  },
  productImageContainer: {
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: 140,
    backgroundColor: Colors.border,
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 6,
    borderRadius: 12,
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: Colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  discountText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
  },
  outOfStockBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 4,
    alignItems: 'center',
  },
  outOfStockText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.white,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  productHindi: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  reviewsText: {
    fontSize: 11,
    color: Colors.textLight,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  originalPrice: {
    fontSize: 12,
    color: Colors.textLight,
    textDecorationLine: 'line-through',
  },
  certBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  certText: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.success,
  },
  infoSection: {
    backgroundColor: Colors.white,
    margin: 16,
    borderRadius: 16,
    padding: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  infoItem: {
    width: '48%',
    alignItems: 'center',
  },
  infoItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 8,
    textAlign: 'center',
  },
  infoItemText: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 4,
    textAlign: 'center',
  },
  loadMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 20,
    gap: 8,
  },
  loadMoreText: {
    fontSize: 14,
    color: Colors.textLight,
  },
  modal: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  modalContent: {
    flex: 1,
  },
  modalImage: {
    width: '100%',
    height: 250,
    backgroundColor: Colors.border,
  },
  modalInfo: {
    padding: 16,
  },
  modalProductName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  modalProductHindi: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 2,
  },
  modalRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
  },
  modalRatingText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  modalReviewsText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  modalCertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modalCertText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.success,
  },
  modalPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  modalPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
  },
  modalOriginalPrice: {
    fontSize: 16,
    color: Colors.textLight,
    textDecorationLine: 'line-through',
  },
  modalDiscountBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modalDiscountText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
  planetCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  planetLabel: {
    fontSize: 13,
    color: Colors.textLight,
  },
  planetValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  specLabel: {
    fontSize: 13,
    color: Colors.textLight,
  },
  specValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  modalSection: {
    marginTop: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 14,
    color: Colors.text,
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 24,
  },
  addToCartButtonDisabled: {
    backgroundColor: Colors.textLight,
  },
  addToCartText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  consultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  consultButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
});
