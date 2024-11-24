"use client";

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
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { insertOfferSchema, type InsertOffer, type Client } from "db/schema";
import { z } from "zod";
import { OfferFormProvider } from "@/context/OfferFormContext";
import { OfferDates } from "./offer/OfferDates";
import { OfferStatus } from "./offer/OfferStatus";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductList } from "./offer/ProductList";
import { SearchableCombobox } from "./offer/SearchableCombobox";

const CURRENCIES = [
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'PLN', label: 'PLN (zł)' },
] as const;

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'pl', label: 'Polish' },
  { value: 'de', label: 'German' },
  { value: 'fr', label: 'French' },
] as const;
import { useOfferItems } from "@/hooks/use-offer-items";
import { Card, CardContent } from "@/components/ui/card";
import useSWR from "swr";

const offerItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Price cannot be negative"),
  discount: z
    .number()
    .min(0, "Discount cannot be negative")
    .max(100, "Discount cannot exceed 100%"),
});

const enhancedOfferSchema = insertOfferSchema.extend({
  items: z.array(offerItemSchema).min(1, "At least one item is required"),
  includeVat: z.boolean().default(false),
});

const calculateTotal = (items: any[], includeVat: boolean = false) => {
  const subtotal = items.reduce((sum, item) => {
    if (!item.quantity || !item.unitPrice) return sum;
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

export default function OfferForm({
  onSuccess,
  initialData,
  onClose,
}: {
  onSuccess: () => void;
  initialData?: InsertOffer & { includeVat?: boolean };
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { offerItems, fetchOfferItems } = useOfferItems(initialData?.id);
  const { data: clients, isLoading: isLoadingClients } =
    useSWR<Client[]>("/api/clients");
  const [activeTab, setActiveTab] = useState("information");

  const form = useForm<z.infer<typeof enhancedOfferSchema>>({
    resolver: zodResolver(enhancedOfferSchema),
    defaultValues: {
      title: initialData?.title || "",
      currency: initialData?.currency || "EUR",
      language: initialData?.language || "en",
      clientId: initialData?.clientId || "",
      status: (initialData?.status as any) || "draft",
      validUntil: initialData?.validUntil ? new Date(initialData.validUntil).toISOString() : undefined,
      notes: initialData?.notes || "",
      lastContact: initialData?.lastContact ? new Date(initialData.lastContact).toISOString() : undefined,
      nextContact: initialData?.nextContact ? new Date(initialData.nextContact).toISOString() : undefined,
      items: initialData?.items || [],
      includeVat: initialData?.includeVat === 'true',
    },
  });

  const items = form.watch("items") || [];
  const includeVat = form.watch("includeVat");
  const { subtotal, vat, total } = calculateTotal(items, includeVat);

  useEffect(() => {
    console.log('Initial form values:', form.getValues());
    console.log('Initial data:', initialData);

    if (initialData?.id) {
      fetchOfferItems();
    }
  }, [initialData?.id, fetchOfferItems]);

  useEffect(() => {
    if (initialData?.id && offerItems) {
      const formValues = {
        ...form.getValues(),
        items: offerItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          discount: Number(item.discount || 0),
        })),
        includeVat: initialData?.includeVat === true,
      };
      console.log('Form reset values:', formValues);
      form.reset(formValues);
      console.log('Form state after reset:', form.getValues());
    }
  }, [initialData?.id, initialData?.includeVat, offerItems, form]);

  async function onSubmit(data: InsertOffer & { includeVat: boolean }) {
    if (isSubmitting) return;

    try {
      console.log('Form data before submission:', data);
      setIsSubmitting(true);
      setSubmitError(null);

      if (!data.items?.length) {
        throw new Error("At least one item is required");
      }

      const items = data.items?.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discount: item.discount ? Number(item.discount) : 0,
      }));

      const { subtotal, vat, total } = calculateTotal(items, data.includeVat);

      const formData = {
        ...data,
        items,
        subtotal,
        vat,
        totalAmount: total,
        includeVat: data.includeVat,
        validUntil: data.validUntil
          ? new Date(data.validUntil).toISOString()
          : null,
        lastContact: data.lastContact
          ? new Date(data.lastContact).toISOString()
          : null,
        nextContact: data.nextContact
          ? new Date(data.nextContact).toISOString()
          : null,
      };

      const url = initialData?.id
        ? `/api/offers/${initialData.id}`
        : "/api/offers";
      const method = initialData?.id ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            `Failed to ${initialData ? "update" : "create"} offer`,
        );
      }

      const result = await response.json();

      toast({
        title: "Success",
        description: `Offer has been ${initialData ? "updated" : "created"} successfully`,
      });

      if (typeof onSuccess === "function") {
        onSuccess();
      }

      if (typeof onClose === "function") {
        onClose();
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : `Failed to ${initialData ? "update" : "create"} offer`;
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
      <div className="flex flex-col">
        <DialogHeader>
          <div className="flex justify-between items-center pr-8">
            <div>
              <DialogTitle>
                {initialData ? "Edit Offer" : "Create Offer"}
              </DialogTitle>
              <DialogDescription>
                Fill in the details below to {initialData ? "update" : "create"} an
                offer.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-grow"
          >
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="information">Information</TabsTrigger>
                <TabsTrigger value="items">Items</TabsTrigger>
              </TabsList>

              <div className="overflow-y-auto"
                style={{ maxHeight: "calc(90vh - 140px)" }}>
                <TabsContent value="information" className="mt-4 space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                      <CardContent className="p-6 space-y-6">
                        <h3 className="text-lg font-semibold">Offer Details</h3>
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

                        <OfferStatus />
                        <FormField
                          control={form.control}
                          name="currency"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Currency</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                                <SelectContent>
                                  {CURRENCIES.map((currency) => (
                                    <SelectItem
                                      key={currency.value}
                                      value={currency.value}
                                    >
                                      {currency.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="language"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Language</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select language" />
                                </SelectTrigger>
                                <SelectContent>
                                  {LANGUAGES.map((language) => (
                                    <SelectItem
                                      key={language.value}
                                      value={language.value}
                                    >
                                      {language.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <OfferDates />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6 space-y-6">
                        <h3 className="text-lg font-semibold">
                          Client Information
                        </h3>
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
                                      {client.email}
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
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="items" className="mt-4">
                  <Card>
                    <CardContent className="p-6">
                      <ProductList />

                      <div className="mt-6 space-y-4">
                        <FormField
                          control={form.control}
                          name="includeVat"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Include VAT (23%)</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />

                        <div className="space-y-2 text-right">
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
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
            </Tabs>

            <DialogFooter className="px-4 sm:px-6 py-4 mt-4">
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  {isSubmitting
                    ? "Saving..."
                    : initialData
                      ? "Update Offer"
                      : "Create Offer"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </div>
    </OfferFormProvider>
  );
}
