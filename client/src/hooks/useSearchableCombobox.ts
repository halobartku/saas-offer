import { useState, useCallback } from "react";
import { useDebounce } from "./useDebounce";

interface UseSearchableComboboxProps<T> {
  items: T[];
  searchKeys: (keyof T)[];
  minSearchLength?: number;
  cacheKey?: string;
}

interface SearchableComboboxState<T> {
  searchTerm: string;
  filteredItems: T[];
  isOpen: boolean;
  highlightedIndex: number;
}

export function useSearchableCombobox<T>({
  items,
  searchKeys,
  minSearchLength = 2,
  cacheKey,
}: UseSearchableComboboxProps<T>) {
  const [state, setState] = useState<SearchableComboboxState<T>>({
    searchTerm: "",
    filteredItems: items,
    isOpen: false,
    highlightedIndex: -1,
  });

  const debouncedSearchTerm = useDebounce(state.searchTerm);

  const filterItems = useCallback((search: string) => {
    if (!search || search.length < minSearchLength) {
      return items;
    }

    const searchLower = search.toLowerCase();
    return items.filter((item) =>
      searchKeys.some((key) => {
        const value = item[key];
        return String(value).toLowerCase().includes(searchLower);
      })
    );
  }, [items, searchKeys, minSearchLength]);

  const setSearchTerm = useCallback((term: string) => {
    setState((prev) => ({
      ...prev,
      searchTerm: term,
      filteredItems: filterItems(term),
    }));
  }, [filterItems]);

  const clearSearch = useCallback(() => {
    setState((prev) => ({
      ...prev,
      searchTerm: "",
      filteredItems: items,
    }));
  }, [items]);

  const toggleOpen = useCallback((isOpen: boolean) => {
    setState((prev) => ({
      ...prev,
      isOpen,
      highlightedIndex: -1,
    }));
  }, []);

  const moveHighlight = useCallback((direction: 1 | -1) => {
    setState((prev) => {
      const newIndex = prev.highlightedIndex + direction;
      const maxIndex = prev.filteredItems.length - 1;
      
      if (newIndex < 0) return { ...prev, highlightedIndex: maxIndex };
      if (newIndex > maxIndex) return { ...prev, highlightedIndex: 0 };
      
      return { ...prev, highlightedIndex: newIndex };
    });
  }, []);

  return {
    searchTerm: state.searchTerm,
    filteredItems: state.filteredItems,
    isOpen: state.isOpen,
    highlightedIndex: state.highlightedIndex,
    setSearchTerm,
    clearSearch,
    toggleOpen,
    moveHighlight,
    totalResults: state.filteredItems.length,
  };
}
