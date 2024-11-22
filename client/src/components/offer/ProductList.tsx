"use client";

import { useCallback, useState, useEffect } from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useOfferForm } from "@/context/OfferFormContext";
import { SearchableCombobox } from "./SearchableCombobox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import useSWR from "swr";
import type { Product } from "db/schema";

export function ProductList() {
  const { form } = useOfferForm();
  const { data: products, isLoading } = useSWR<Product[]>("/api/products");
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  const items = form.watch("items") || [];
  
  // Debug logs
  console.log("Form Context:", form);
  console.log("Items Array:", items);
  console.log("Selected Items:", selectedItems);
  console.log("Products:", products);

  // Initialize with an empty item if there are no items
  useEffect(() => {
    if (!items.length) {
      addItem();
    }
  }, []);

  const handleSelectItem = useCallback((index: number) => {
    setSelectedItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  }, []);

  const handleBulkDelete = useCallback(() => {
    const currentItems = form.getValues("items") || [];
    const newItems = currentItems.filter((_, index) => !selectedItems.includes(index));
    form.setValue("items", newItems, { shouldValidate: true });
    setSelectedItems([]);
  }, [form, selectedItems]);

  const addItem = useCallback(() => {
    const currentItems = form.getValues("items") || [];
    form.setValue(
      "items",
      [
        ...currentItems,
        {
          productId: "",
          quantity: 1,
          unitPrice: 0,
          discount: 0,
        },
      ],
      { shouldValidate: true },
    );
  }, [form]);

  const removeItem = useCallback(
    (index: number) => {
      const currentItems = form.getValues("items") || [];
      form.setValue(
        "items",
        currentItems.filter((_, i) => i !== index),
        { shouldValidate: true },
      );
    },
    [form],
  );

  const handleProductSelect = useCallback(
    (index: number, productId: string) => {
      const product = products?.find((p) => p.id === productId);
      if (product) {
        const currentItems = form.getValues("items");
        currentItems[index] = {
          ...currentItems[index],
          productId,
          unitPrice: Number(product.price),
        };
        form.setValue("items", currentItems, { shouldValidate: true });
      }
    },
    [form, products],
  );

  const handleSelectAll = useCallback(() => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map((_, index) => index));
    }
  }, [items.length, selectedItems.length]);

  const getProductDetails = useCallback((productId: string) => {
    return products?.find((p) => p.id === productId);
  }, [products]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Products</h3>
        <div className="flex items-center gap-2">
          {selectedItems.length > 0 && (
            <Button 
              type="button" 
              variant="destructive" 
              size="sm" 
              onClick={handleBulkDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected ({selectedItems.length})
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      <div className="border rounded-md">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedItems.length === items.length && items.length > 0}
                  onChange={handleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
              </th>
              <th className="px-4 py-3 text-left">Image</th>
              <th className="px-4 py-3 text-left">Product</th>
              <th className="px-4 py-3 text-left">SKU</th>
              <th className="px-4 py-3 text-left">Price</th>
              <th className="px-4 py-3 text-left">Quantity</th>
              <th className="px-4 py-3 text-left">Discount</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const product = getProductDetails(item.productId);
              return (
                <tr key={index} className="border-b">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(index)}
                      onChange={() => handleSelectItem(index)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </td>
                  <td className="px-4 py-3">
                    {product?.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.name} 
                        className="w-12 h-12 object-cover rounded-md"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                        <span className="text-muted-foreground">No image</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <FormField
                      control={form.control}
                      name={`items.${index}.productId`}
                      render={({ field }) => (
                        <FormItem>
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
                              <div className="flex justify-between items-center w-full">
                                <div className="flex flex-col">
                                  <span>{item.name}</span>
                                  <span className="text-sm text-muted-foreground">
                                    SKU: {item.sku}
                                  </span>
                                </div>
                                <span className="text-sm font-medium">
                                  €{Number(item.price).toFixed(2)}
                                </span>
                              </div>
                            )}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </td>
                  <td className="px-4 py-3">{product?.sku || '-'}</td>
                  <td className="px-4 py-3">
                    <FormField
                      control={form.control}
                      name={`items.${index}.unitPrice`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              className="w-24"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              className="w-20"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <FormField
                      control={form.control}
                      name={`items.${index}.discount`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              className="w-20"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                      <span className="sr-only">Remove item</span>
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
                      control={form.control}
                      name={`items.${index}.productId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product {index + 1}</FormLabel>
                          <SearchableCombobox
                            value={field.value}
                            onValueChange={(value) =>
                              handleProductSelect(index, value)
                            }
                            items={products || []}
                            searchKeys={["name", "sku"]}
                            displayKey="name"
                            descriptionKey="sku"
                            placeholder="Select product..."
                            label="Product"
                            isLoading={isLoading}
                            renderItem={(item: Product) => (
                              <div className="flex justify-between items-center w-full">
                                <div className="flex flex-col">
                                  <span>{item.name}</span>
                                  <span className="text-sm text-muted-foreground">
                                    SKU: {item.sku}
                                  </span>
                                </div>
                                <span className="text-sm font-medium">
                                  €{Number(item.price).toFixed(2)}
                                </span>
                              </div>
                            )}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value) || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`items.${index}.unitPrice`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit Price (€)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value) || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="relative">
                    <FormField
                      control={form.control}
                      name={`items.${index}.discount`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Discount %</FormLabel>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                              />
                            </FormControl>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive/90"
                              onClick={() => removeItem(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Remove item</span>
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
}
