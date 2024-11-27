"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { insertOfferSchema, type InsertOffer } from "db/schema";
import { z } from "zod";
import { ProductList } from "./offer/ProductList";

const publicOfferSchema = insertOfferSchema.extend({
  items: z.array(z.object({
    productId: z.string().min(1, "Product is required"),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    unitPrice: z.number().min(0, "Price cannot be negative"),
    discount: z.number().min(0, "Discount cannot be negative").max(100, "Discount cannot exceed 100%"),
  })).min(1, "At least one item is required"),
  includeVat: z.boolean().default(false),
});

export default function PublicOfferForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof publicOfferSchema>>({
    resolver: zodResolver(publicOfferSchema),
    defaultValues: {
      title: "",
      clientId: "",
      items: [],
      includeVat: false,
    },
  });

  const items = form.watch("items") || [];
  const includeVat = form.watch("includeVat");

  const calculateTotal = () => {
    const subtotal = items.reduce((sum, item) => {
      const subtotal = Number(item.quantity) * Number(item.unitPrice);
      const discount = subtotal * (Number(item.discount || 0) / 100);
      return sum + (subtotal - discount);
    }, 0);

    const vat = includeVat ? subtotal * 0.23 : 0;
    return {
      subtotal,
      vat,
      total: subtotal + vat,
    };
  };

  async function onSubmit(data: z.infer<typeof publicOfferSchema>) {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/public/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create offer");
      }

      toast({
        title: "Success",
        description: "Your offer has been submitted successfully. You will receive an email confirmation shortly.",
      });

      form.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create offer",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const { subtotal, vat, total } = calculateTotal();

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Create New Offer</h1>
        <p className="text-muted-foreground">Fill in the details below to submit your offer.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Offer Title</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <ProductList />

          <FormField
            control={form.control}
            name="includeVat"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel>Include VAT (23%)</FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Subtotal: €{subtotal.toFixed(2)}
            </p>
            {includeVat && (
              <p className="text-sm text-muted-foreground">
                VAT (23%): €{vat.toFixed(2)}
              </p>
            )}
            <p className="text-lg font-semibold">
              Total: €{total.toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground">
              (~PLN {(total * 4.35).toFixed(2)})
            </p>
          </div>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Additional Notes</FormLabel>
                <FormControl>
                  <Textarea {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit Offer"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
