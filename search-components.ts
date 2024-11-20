import { useCallback, useState } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import debounce from "lodash/debounce";

interface SearchableComboboxProps {
  items: any[];
  value: string;
  onChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  isOpen: boolean;
  placeholder: string;
  searchPlaceholder: string;
  displayKey: string;
  secondaryDisplayKey?: string;
  label?: string;
  loading?: boolean;
  error?: string;
  disabled?: boolean;
  width?: string;
}

export const SearchableCombobox = ({
  items,
  value,
  onChange,
  onOpenChange,
  isOpen,
  placeholder,
  searchPlaceholder,
  displayKey,
  secondaryDisplayKey,
  label,
  loading,
  error,
  disabled,
  width = "400px",
}: SearchableComboboxProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      setSearchTerm(term.toLowerCase());
    }, 300),
    []
  );

  const filteredItems = items.filter((item) => {
    if (!searchTerm) return true;
    return (
      item[displayKey].toLowerCase().includes(searchTerm) ||
      (secondaryDisplayKey && item[secondaryDisplayKey].toLowerCase().includes(searchTerm))
    );
  });

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          aria-label={label}
          className={cn(
            "justify-between w-full",
            !value && "text-muted-foreground",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          disabled={disabled}
        >
          {value
            ? items.find((item) => item.id === value)?.[displayKey] || placeholder
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={`p-0 ${width}`} align="start">
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            onValueChange={debouncedSearch}
            className="h-9"
          />
          {loading ? (
            <div className="flex items-center justify-center p-4">
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          ) : (
            <>
              <CommandEmpty className="p-2">
                {searchTerm ? "No results found." : "No items available."}
              </CommandEmpty>
              <CommandGroup className="max-h-64 overflow-auto">
                {filteredItems.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    onSelect={() => {
                      onChange(item.id);
                      setSearchTerm("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        item.id === value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{item[displayKey]}</span>
                      {secondaryDisplayKey && (
                        <span className="text-sm text-muted-foreground">
                          {item[secondaryDisplayKey]}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
};
