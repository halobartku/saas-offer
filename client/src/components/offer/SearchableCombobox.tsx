import { useState, useRef, useCallback } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearchableCombobox } from "@/hooks/useSearchableCombobox";

interface SearchableComboboxProps<T> {
  value?: string;
  onValueChange: (value: string) => void;
  items: T[];
  searchKeys: (keyof T)[];
  displayKey: keyof T;
  descriptionKey?: keyof T;
  placeholder: string;
  label: string;
  isLoading?: boolean;
  error?: string;
  renderItem?: (item: T) => React.ReactNode;
}

export function SearchableCombobox<T extends { id: string }>({
  value,
  onValueChange,
  items,
  searchKeys,
  displayKey,
  descriptionKey,
  placeholder,
  label,
  isLoading,
  error,
  renderItem,
}: SearchableComboboxProps<T>) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const {
    searchTerm,
    filteredItems,
    isOpen,
    highlightedIndex,
    setSearchTerm,
    clearSearch,
    toggleOpen,
    moveHighlight,
    totalResults,
  } = useSearchableCombobox({
    items,
    searchKeys,
    minSearchLength: 2,
  });

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        moveHighlight(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        moveHighlight(-1);
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0) {
          const selectedItem = filteredItems[highlightedIndex];
          onValueChange(selectedItem.id);
          toggleOpen(false);
          clearSearch();
        }
        break;
      case "Escape":
        toggleOpen(false);
        clearSearch();
        break;
    }
  }, [highlightedIndex, filteredItems, onValueChange, toggleOpen, clearSearch, moveHighlight]);

  const selectedItem = items.find(item => item.id === value);

  return (
    <Popover open={isOpen} onOpenChange={toggleOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          aria-label={label}
          className={cn(
            "w-full justify-between",
            !selectedItem && "text-muted-foreground",
            error && "border-destructive",
          )}
          onClick={() => toggleOpen(!isOpen)}
        >
          {selectedItem ? String(selectedItem[displayKey]) : placeholder}
          {isLoading ? (
            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false} onKeyDown={handleKeyDown}>
          <CommandInput
            placeholder={`Search ${label.toLowerCase()}...`}
            value={searchTerm}
            onValueChange={setSearchTerm}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
          {searchTerm.length > 0 && (
            <div className="px-2 py-1 text-xs text-muted-foreground">
              {totalResults} result{totalResults !== 1 ? 's' : ''}
            </div>
          )}
          <CommandEmpty>No {label.toLowerCase()} found.</CommandEmpty>
          <CommandGroup className="max-h-[200px] overflow-auto">
            {filteredItems.map((item, index) => (
              <CommandItem
                key={item.id}
                value={item.id}
                onSelect={() => {
                  onValueChange(item.id);
                  toggleOpen(false);
                  clearSearch();
                }}
                className={cn(
                  "cursor-pointer",
                  index === highlightedIndex && "bg-accent"
                )}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    item.id === value ? "opacity-100" : "opacity-0"
                  )}
                />
                {renderItem ? (
                  renderItem(item)
                ) : (
                  <div className="flex flex-col">
                    <span>{String(item[displayKey])}</span>
                    {descriptionKey && (
                      <span className="text-sm text-muted-foreground">
                        {String(item[descriptionKey])}
                      </span>
                    )}
                  </div>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
