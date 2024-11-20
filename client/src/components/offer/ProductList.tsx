import { useCallback } from "react";
import { FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useOfferForm } from "@/context/OfferFormContext";
import { SearchableCombobox } from "./SearchableCombobox";
import useSWR from "swr";
import type { Product } from "db/schema";

export function ProductList() {
  const { form } = useOfferForm();
  const { data: products, isLoading } = useSWR<Product[]>("/api/products");

  const items = form.watch("items") || [];

  const addItem = useCallback(() => {
    const currentItems = form.getValues("items") || [];
    form.setValue("items", [
      ...currentItems,
      {
        productId: "",
        quantity: 1,
        unitPrice: 0,
        discount: 0,
      },
    ], { shouldValidate: true });
  }, [form]);

  const removeItem = useCallback((index: number) => {
    const currentItems = form.getValues("items") || [];
    form.setValue("items", currentItems.filter((_, i) => i !== index), { shouldValidate: true });
  }, [form]);

  const handleProductSelect = useCallback((index: number, productId: string) => {
    const product = products?.find(p => p.id === productId);
    if (product) {
      const currentItems = form.getValues("items");
      currentItems[index] = {
        ...currentItems[index],
        productId,
        unitPrice: Number(product.price),
      };
      form.setValue("items", currentItems, { shouldValidate: true });
    }
  }, [form, products]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Products</h3>
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      <div className="space-y-4">
        {items.map((_, index) => (
          <div
            key={index}
            className="grid gap-4 p-4 border rounded-lg sm:grid-cols-2 lg:grid-cols-4"
          >
            <FormField
              control={form.control}
              name={`items.${index}.productId`}
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Product {index + 1}</FormLabel>
                  <SearchableCombobox
                    value={field.value}
                    onValueChange={(value) => handleProductSelect(index, value)}
                    items={products || []}
                    searchKeys={["name", "sku"]}
                    displayKey="name"
                    descriptionKey="sku"
                    placeholder="Select product..."
                    label="Product"
                    isLoading={isLoading}
                    renderItem={(item: Product) => (
                      <div className="flex flex-col">
                        <span>{item.name}</span>
                        <span className="text-sm text-muted-foreground">
                          SKU: {item.sku} • Price: €{Number(item.price).toFixed(2)}
                        </span>
                      </div>
                    )}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`items.${index}.quantity`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <Input
                    type="number"
                    min="1"
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value) || 0)
                    }
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`items.${index}.discount`}
              render={({ field }) => (
                <FormItem className="relative">
                  <FormLabel>Discount %</FormLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value) || 0)
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
