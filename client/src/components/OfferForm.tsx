import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
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
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { insertOfferSchema, type InsertOffer, type Client } from "db/schema";
import { z } from "zod";
import { OfferFormProvider } from "@/context/OfferFormContext";
import { OfferDates } from "./offer/OfferDates";
import { OfferStatus } from "./offer/OfferStatus";
import { ProductList } from "./offer/ProductList";
import { SearchableCombobox } from "./offer/SearchableCombobox";
import { useOfferItems } from "@/hooks/use-offer-items";
import useSWR from "swr";

const offerItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Price cannot be negative"),
  discount: z.number().min(0, "Discount cannot be negative").max(100, "Discount cannot exceed 100%"),
});

const enhancedOfferSchema = insertOfferSchema.extend({
  items: z.array(offerItemSchema).min(1, "At least one item is required"),
});

const calculateTotal = (items: any[]) => {
  return items.reduce((sum, item) => {
    if (!item.quantity || !item.unitPrice) return sum;
    const subtotal = Number(item.quantity) * Number(item.unitPrice);
    const discount = subtotal * (Number(item.discount || 0) / 100);
    return sum + (subtotal - discount);
  }, 0);
};

export default function OfferForm({ onSuccess, initialData, onClose }: OfferFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { offerItems, fetchOfferItems } = useOfferItems(initialData?.id);
  const { data: clients, isLoading: isLoadingClients } = useSWR<Client[]>("/api/clients");

  const form = useForm<InsertOffer>({
    resolver: zodResolver(enhancedOfferSchema),
    defaultValues: {
      title: initialData?.title || "",
      clientId: initialData?.clientId || "",
      status: (initialData?.status as any) || "draft",
      validUntil: initialData?.validUntil || undefined,
      notes: initialData?.notes || "",
      lastContact: initialData?.lastContact || undefined,
      nextContact: initialData?.nextContact || undefined,
      items: initialData?.items || [] // This will be populated by useEffect
    },
  });

  useEffect(() => {
    if (initialData?.id) {
      fetchOfferItems();
    }
  }, [initialData?.id, fetchOfferItems]);

  useEffect(() => {
    if (initialData?.id && offerItems) {
      form.reset({
        ...form.getValues(),
        items: offerItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          discount: Number(item.discount || 0)
        }))
      });
    }
  }, [initialData?.id, offerItems, form]);

  async function onSubmit(data: InsertOffer) {
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      
      if (!data.items?.length) {
        throw new Error("At least one item is required");
      }

      const items = data.items?.map(item => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discount: item.discount ? Number(item.discount) : 0
      }));

      const totalAmount = calculateTotal(items || []);
      
      const formData = {
        ...data,
        items,
        totalAmount,
        validUntil: data.validUntil ? new Date(data.validUntil).toISOString() : null,
        lastContact: data.lastContact ? new Date(data.lastContact).toISOString() : null,
        nextContact: data.nextContact ? new Date(data.nextContact).toISOString() : null
      };

      const url = initialData?.id ? `/api/offers/${initialData.id}` : "/api/offers";
      const method = initialData?.id ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${initialData ? 'update' : 'create'} offer`);
      }

      const result = await response.json();
      
      toast({
        title: "Success",
        description: `Offer has been ${initialData ? 'updated' : 'created'} successfully`,
      });
      
      if (typeof onSuccess === 'function') {
        onSuccess();
      }
      
      if (typeof onClose === 'function') {
        onClose();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Failed to ${initialData ? 'update' : 'create'} offer`;
      setSubmitError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <OfferFormProvider value={{ form, onClose, isSubmitting }}>
      <DialogHeader>
        <DialogTitle>{initialData ? 'Edit Offer' : 'Create Offer'}</DialogTitle>
        <DialogDescription>
          Fill in the details below to {initialData ? 'update' : 'create'} an offer.
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client</FormLabel>
                  <SearchableCombobox
                    value={field.value}
                    onValueChange={field.onChange}
                    items={clients || []}
                    searchKeys={["name", "email"]}
                    displayKey="name"
                    descriptionKey="email"
                    placeholder="Select client..."
                    label="Client"
                    isLoading={isLoadingClients}
                    renderItem={(client) => (
                      <div className="flex flex-col">
                        <span>{client.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {client.email} • {client.clientType}
                        </span>
                      </div>
                    )}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <ProductList />
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-medium">Dates & Status</h3>
            <div className="space-y-4">
              <OfferDates />
              <OfferStatus />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-medium">Additional Information</h3>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : initialData ? 'Update Offer' : 'Create Offer'}
            </Button>
          </div>
        </form>
      </Form>
    </OfferFormProvider>
  );
}
