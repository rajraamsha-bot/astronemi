/**
 * CategorySelector Component
 * 
 * Reusable category selection component to eliminate code duplication
 * Used across: videos, podcasts, mantras, meditation, courses, blog, news, etc.
 */

import React from 'react';
import {
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import Colors from '@/constants/colors';

export interface Category {
  id: string;
  name: string;
}

interface CategorySelectorProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  showAllOption?: boolean;
  allLabel?: string;
}

export function CategorySelector({
  categories,
  selectedCategory,
  onSelectCategory,
  showAllOption = true,
  allLabel = 'All',
}: CategorySelectorProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {showAllOption && (
        <TouchableOpacity
          style={[
            styles.categoryTab,
            !selectedCategory && styles.categoryTabActive,
          ]}
          onPress={() => onSelectCategory(null)}
        >
          <Text
            style={[
              styles.categoryText,
              !selectedCategory && styles.categoryTextActive,
            ]}
          >
            {allLabel}
          </Text>
        </TouchableOpacity>
      )}
      
      {categories.map((category) => (
        <TouchableOpacity
          key={category.id}
          style={[
            styles.categoryTab,
            selectedCategory === category.id && styles.categoryTabActive,
          ]}
          onPress={() => onSelectCategory(category.id)}
        >
          <Text
            style={[
              styles.categoryText,
              selectedCategory === category.id && styles.categoryTextActive,
            ]}
          >
            {category.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.cardBg,
    marginRight: 8,
  },
  categoryTabActive: {
    backgroundColor: Colors.primary,
  },
  categoryText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: Colors.white,
  },
});

export default CategorySelector;
