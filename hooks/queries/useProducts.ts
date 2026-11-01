import { useInfiniteQuery } from '@tanstack/react-query';

import { productsApi, DbProduct } from '@/services/api';
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

interface UseProductsOptions {
  category?: string | null;
  pageSize?: number;
}

function transform(p: DbProduct): Product {
  return {
    id: p.id,
    name: p.name,
    hindiName: p.name,
    category: p.category ?? 'gemstones',
    // Selling price must match create-razorpay-order's server-side rule
    // (discount_price ?? price) so cart totals equal charged amounts.
    price: p.discount_price ?? p.price,
    originalPrice: p.price,
    image: p.images?.[0] ?? '',
    rating: p.rating ?? 0,
    reviews: p.total_reviews ?? 0,
    description: p.description ?? '',
    benefits: [],
    certification: false,
    inStock: (p.stock ?? 0) > 0,
  };
}

export function useProducts(options: UseProductsOptions) {
  const { category, pageSize = 20 } = options;

  return useInfiniteQuery({
    queryKey: ['products', category || 'all', pageSize],
    queryFn: async ({ pageParam = 1 }) => {
      try {
        const response = await productsApi.getProducts({
          category: category || undefined,
          page: pageParam,
          pageSize,
        });

        if (response.error || !response.data) {
          const cachedData = await offlineStorage.get<Product[]>('shop_products');
          return { data: cachedData ?? [], hasMore: false, page: pageParam };
        }

        const transformedData = response.data.data.map(transform);

        // Cache only real results — caching an empty page 1 permanently
        // blanks the offline catalog.
        if (pageParam === 1 && transformedData.length > 0) {
          await offlineStorage.save('shop_products', transformedData);
        }

        return {
          data: transformedData,
          hasMore: response.data.hasMore || false,
          page: pageParam,
        };
      } catch {
        const cachedData = await offlineStorage.get<Product[]>('shop_products');
        return { data: cachedData ?? [], hasMore: false, page: pageParam };
      }
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
