import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertCircle, RefreshCw } from 'lucide-react-native';
import { useAppTheme, AppTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAstrologers } from '@/hooks/queries/useAstrologers';
import type { UiAstrologer } from '@/lib/database.types';
import { createButtonA11yProps } from '@/utils/accessibility-helpers';
import { FeatureErrorBoundary } from '@/components/FeatureErrorBoundary';
import { AstrologerCard } from '@/components/AstrologerCard';
import { AdvancedSearch, SearchFilters } from '@/components/ui/AdvancedSearch';

export default function AstrologersScreen() {
  const Colors = useAppTheme();
  const { t } = useLanguage();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({ sortBy: 'rating' });

  // Debounce search query to prevent excessive API calls
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ✅ REFACTORED: Replaced useEffect + fetch with React Query infinite query
  const {
    data,
    isLoading: loading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching: refreshing,
    error,
  } = useAstrologers({ 
    pageSize: 20,
    filters: {
      search: debouncedSearch || undefined,
      sortBy: filters.sortBy,
      specialization: filters.specialization?.[0]
    }
  });

  // Flatten paginated data
  const astrologers = React.useMemo(() => {
    return data?.pages.flatMap(page => page.data as UiAstrologer[]) || [];
  }, [data]);


  const handleRefresh = () => {
    refetch();
  };

  const handleLoadMore = () => {
    if (!loading && !isFetchingNextPage && hasNextPage) {
      fetchNextPage();
    }
  };

  // Server already applies the (debounced) search + filters, so render the
  // paginated results directly. Avoid a second local filter here — it would
  // hide rows that match but live on not-yet-loaded pages and break "load more".
  const renderContent = () => {
    if (loading && astrologers.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      );
    }

    if (error && astrologers.length === 0) {
      return (
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color={Colors.error} />
          <Text style={styles.errorTitle}>{t('common.error')}</Text>
          <Text style={styles.errorMessage}>{String(error)}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={handleRefresh}
            {...createButtonA11yProps(
              t('common.retry'),
              'Retry loading astrologers'
            )}
          >
            <RefreshCw size={20} color={Colors.white} />
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.listContainer}>
        {error && (
          <View style={styles.errorBanner}>
            <AlertCircle size={16} color={Colors.error} />
            <Text style={styles.errorBannerText}>{String(error)}</Text>
          </View>
        )}
        
        <FlatList
          data={astrologers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <AstrologerCard astrologer={item} Colors={Colors} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          windowSize={10}
          removeClippedSubviews={true}
          getItemLayout={(_data, index) => ({
            length: 160, // Approximate height of each item
            offset: 160 * index,
            index,
          })}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          ListFooterComponent={
            isFetchingNextPage && hasNextPage ? (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.loadMoreText}>{t('common.loading')}</Text>
              </View>
            ) : null
          }
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('astrologers.title')}</Text>
        <Text style={styles.headerSubtitle}>{t('astrologers.subtitle')}</Text>
      </View>

      <AdvancedSearch 
        onSearch={setSearchQuery}
        onFilterChange={setFilters}
        placeholder={t('astrologers.searchPlaceholder')}
      />

      <FeatureErrorBoundary featureName="Astrologers Screen">
        {renderContent()}
      </FeatureErrorBoundary>
    </SafeAreaView>
  );
}

const createStyles = (Colors: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.primary,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.9,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.white,
    margin: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textLight,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center' as const,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  errorBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.warning + '20',
    marginHorizontal: 20,
    marginBottom: 16,
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
  listContainer: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 20,
    gap: 16,
    paddingBottom: 20,
  },
  loadMoreContainer: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingVertical: 20,
    gap: 8,
  },
  loadMoreText: {
    fontSize: 14,
    color: Colors.textLight,
  },
});
