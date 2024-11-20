import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "./useDebounce";
import type { Product } from "db/schema";

interface ProductSearchProps {
  products?: Product[];
  isLoading: boolean;
  form: any;
  index: number;
  onSelect: (productId: string, price: number) => void;
  onPopoverOpenChange: (open: boolean) => void;
  isOpen: boolean;
}

export function ProductSearch({ 
  products, 
  isLoading, 
  form, 
  index, 
  onSelect,
  onPopoverOpenChange,
  isOpen 
}: ProductSearchProps) {
  const [search, setSearch] = useState("");
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    if (debouncedSearch.length < 2) {
      setFilteredProducts([]);
      return;
    }

    const searchTerms = debouncedSearch.toLowerCase().split(" ");
    const filtered = products?.filter(product => 
      searchTerms.every(term =>
        product.name.toLowerCase().includes(term) ||
        product.sku?.toLowerCase().includes(term)
      )
    ) || [];

    setFilteredProducts(filtered);
  }, [debouncedSearch, products]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSearch("");
    }
    onPopoverOpenChange(open);
  };

  const totalResults = filteredProducts.length;
  const showResults = search.length >= 2;

  return (
    <FormField
      control={form.control}
      name={`items.${index}.productId`}
      render={({ field }) => (
        <FormItem className="flex-1">
          <FormLabel>Product</FormLabel>
          <Popover open={isOpen} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isOpen}
                  aria-label="Select a product"
                  className={cn(
                    "justify-between w-full",
                    !field.value && "text-muted-foreground"
                  )}
                >
                  {field.value
                    ? products?.find((product) => product.id === field.value)?.name
                    : "Select product..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
              <Command>
                <CommandInput 
                  placeholder="Search products..."
                  value={search}
                  onValueChange={setSearch}
                />
                {isLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : !showResults ? (
                  <p className="p-2 text-sm text-muted-foreground">
                    Enter at least 2 characters to search
                  </p>
                ) : (
                  <>
                    {totalResults > 0 && (
                      <p className="p-2 text-xs text-muted-foreground">
                        Found {totalResults} result{totalResults !== 1 ? 's' : ''}
                      </p>
                    )}
                    <CommandEmpty>No products found.</CommandEmpty>
                    <CommandGroup>
                      {filteredProducts.map((product) => (
                        <CommandItem
                          key={product.id}
                          value={product.id}
                          onSelect={() => {
                            onSelect(product.id, Number(product.price));
                            setSearch("");
                            handleOpenChange(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              product.id === field.value ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span>{product.name}</span>
                            <span className="text-sm text-muted-foreground">
                              SKU: {product.sku} • €{Number(product.price).toFixed(2)}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}
              </Command>
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
