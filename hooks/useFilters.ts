/**
 * useFilters Hook
 * 
 * Reusable hook for filtering and searching data
 * Eliminates duplicate filter logic across screens
 */

import { useState, useCallback, useMemo } from 'react';

export interface FilterOption {
  id: string;
  label: string;
}

export interface UseFiltersOptions<T> {
  items: T[];
  searchFields?: (keyof T)[];
  initialCategory?: string | null;
}

export function useFilters<T>({
  items,
  searchFields = [],
  initialCategory = null,
}: UseFiltersOptions<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory);

  // Filter items based on search and category
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Apply category filter
    if (selectedCategory) {
      // For objects with category field
      result = result.filter(item => {
        const category = (item as Record<string, unknown>).category;
        return category === selectedCategory;
      });
    }

    // Apply search filter
    if (searchQuery && searchFields.length > 0) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => {
        return searchFields.some(field => {
          const value = item[field];
          if (typeof value === 'string') {
            return value.toLowerCase().includes(query);
          }
          return false;
        });
      });
    }

    return result;
  }, [items, selectedCategory, searchQuery, searchFields]);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory(initialCategory);
  }, [initialCategory]);

  const hasActiveFilters = useMemo(() => {
    return !!searchQuery || selectedCategory !== initialCategory;
  }, [searchQuery, selectedCategory, initialCategory]);

  return {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    filteredItems,
    clearFilters,
    hasActiveFilters,
    totalCount: items.length,
    filteredCount: filteredItems.length,
  };
}

export default useFilters;
