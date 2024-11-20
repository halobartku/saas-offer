import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import SearchableCombobox from "../SearchableCombobox";
import type { Product } from "../OfferFormTypes";

interface ProductsListProps {
  form: UseFormReturn<any>;
  products: Product[];
  productsLoading: boolean;
  openProduct: number | null;
  setOpenProduct: (index: number | null) => void;
  onAddItem: () => void;
}

export default function ProductsList({
  form,
  products,
  productsLoading,
  openProduct,
  setOpenProduct,
  onAddItem
}: ProductsListProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Products</h3>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={onAddItem}
          className="hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      <div className="space-y-4">
        {form.watch("items")?.map((_, index) => (
          <div key={index} className="space-y-4 p-4 border rounded-lg bg-background/50">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium">Product {index + 1}</h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  const items = form.getValues("items");
                  form.setValue(
                    "items",
                    items.filter((_, i) => i !== index),
                    { shouldValidate: true }
                  );
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-2">
                <FormField
                  control={form.control}
                  name={`items.${index}.productId`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product</FormLabel>
                      <SearchableCombobox
                        items={products}
                        value={field.value}
                        onChange={(value) => {
                          const product = products?.find(p => p.id === value);
                          form.setValue(`items.${index}.productId`, value);
                          if (product) {
                            form.setValue(`items.${index}.unitPrice`, Number(product.price));
                          }
                        }}
                        onOpenChange={(open) => setOpenProduct(open ? index : null)}
                        isOpen={openProduct === index}
                        placeholder="Select product..."
                        searchPlaceholder="Search products..."
                        displayKey="name"
                        secondaryDisplayKey="sku"
                        loading={productsLoading}
                        disabled={productsLoading}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name={`items.${index}.quantity`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        className="text-right"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`items.${index}.discount`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount %</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        className="text-right"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Product total calculation */}
            <div className="text-sm text-right text-muted-foreground">
              {(() => {
                const item = form.getValues(`items.${index}`);
                if (item.quantity && item.unitPrice) {
                  const subtotal = Number(item.quantity) * Number(item.unitPrice);
                  const discount = subtotal * (Number(item.discount || 0) / 100);
                  return `Total: €${(subtotal - discount).toFixed(2)}`;
                }
                return 'Total: €0.00';
              })()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
