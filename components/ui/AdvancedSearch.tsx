import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Search, SlidersHorizontal, X, Check, ArrowUpDown } from 'lucide-react-native';
import { useAppTheme, AppTheme } from '@/contexts/ThemeContext';

export interface SearchFilters {
  sortBy?: 'rating' | 'priceLow' | 'priceHigh' | 'experience';
  specialization?: string[];
  language?: string[];
  minRating?: number;
}

interface AdvancedSearchProps {
  placeholder?: string;
  onSearch: (text: string) => void;
  onFilterChange: (filters: SearchFilters) => void;
  availableSpecialties?: string[];

}

export const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  placeholder = 'Search by name or specialty...',
  onSearch,
  onFilterChange,
  availableSpecialties = ['Career', 'Marriage', 'Finance', 'Health', 'Education'],

}) => {
  const Colors = useAppTheme();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const [searchText, setSearchText] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    sortBy: 'rating',
    specialization: [],
    language: [],
    minRating: 0,
  });

  const handleSearchChange = (text: string) => {
    setSearchText(text);
    onSearch(text);
  };

  const toggleSpecialty = (s: string) => {
    const updated = filters.specialization?.includes(s)
      ? filters.specialization.filter(i => i !== s)
      : [...(filters.specialization || []), s];
    const newFilters = { ...filters, specialization: updated };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const setSort = (s: SearchFilters['sortBy']) => {
    const newFilters = { ...filters, sortBy: s };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const resetFilters = () => {
    const defaultFilters: SearchFilters = { sortBy: 'rating', specialization: [], language: [], minRating: 0 };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  const activeFilterCount = (filters.specialization?.length || 0) + (filters.language?.length || 0) + (filters.sortBy !== 'rating' ? 1 : 0);

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Search size={20} color={Colors.textLight} style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.textLight}
          value={searchText}
          onChangeText={handleSearchChange}
        />
        <TouchableOpacity 
          style={styles.filterBtn} 
          onPress={() => setIsModalVisible(true)}
        >
          <SlidersHorizontal size={20} color={activeFilterCount > 0 ? Colors.primary : Colors.text} />
          {activeFilterCount > 0 && (
            <View style={styles.badge}>
               <Text style={styles.badgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Search Filters</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Sort By Section */}
              <Text style={styles.sectionTitle}>Sort By</Text>
              <View style={styles.sortGrid}>
                {[
                  { id: 'rating', label: 'Top Rated', icon: 'star' },
                  { id: 'priceLow', label: 'Price: Low-High', icon: 'arrow-down' },
                  { id: 'priceHigh', label: 'Price: High-Low', icon: 'arrow-up' },
                  { id: 'experience', label: 'Experience', icon: 'clock' }
                ].map((item) => (
                  <TouchableOpacity 
                    key={item.id} 
                    style={[styles.sortItem, filters.sortBy === item.id && styles.activeChip]}
                    onPress={() => setSort(item.id as SearchFilters['sortBy'])}
                  >
                    <ArrowUpDown size={14} color={filters.sortBy === item.id ? '#FFF' : Colors.textLight} />
                    <Text style={[styles.chipText, filters.sortBy === item.id && styles.activeChipText]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Specialization Section */}
              <Text style={styles.sectionTitle}>Specializations</Text>
              <View style={styles.chipGrid}>
                {availableSpecialties.map((s) => (
                  <TouchableOpacity 
                    key={s} 
                    style={[styles.chip, filters.specialization?.includes(s) && styles.activeChip]}
                    onPress={() => toggleSpecialty(s)}
                  >
                    <Text style={[styles.chipText, filters.specialization?.includes(s) && styles.activeChipText]}>{s}</Text>
                    {filters.specialization?.includes(s) && <Check size={12} color="#FFF" style={styles.checkIcon} />}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
                <Text style={styles.resetBtnText}>Reset All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={() => setIsModalVisible(false)}>
                <Text style={styles.applyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (Colors: AppTheme) => StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  searchIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  filterBtn: {
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
    marginLeft: 12,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.primary,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 16,
    marginTop: 8,
  },
  sortGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  sortItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  activeChip: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  activeChipText: {
    color: '#FFF',
  },
  checkIcon: {
    marginLeft: 2,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    paddingBottom: 20,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  resetBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textLight,
  },
  applyBtn: {
    flex: 2,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  applyBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
});
