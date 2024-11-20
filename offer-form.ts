import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2, Loader2 } from "lucide-react";
import useSWR from "swr";
import { useToast } from "@/hooks/use-toast";
import { SearchableCombobox } from "./SearchableCombobox";
import {
  OfferFormProps,
  enhancedOfferSchema,
  calculateTotal,
  OFFER_STATUS,
  type InsertOffer
} from "./types";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function OfferForm({ onSuccess, initialData, onClose }: OfferFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openClient, setOpenClient] = useState(false);
  const [openProduct, setOpenProduct] = useState<number | null>(null);

  const { data: clients, error: clientsError, isLoading: clientsLoading } = useSWR("/api/clients");
  const { data: products, error: productsError, isLoading: productsLoading } = useSWR("/api/products");
  const { data: offerItems } = useSWR(
    initialData?.id ? `/api/offers/${initialData.id}/items` : null
  );

  const form = useForm<InsertOffer>({
    resolver: zodResolver(enhancedOfferSchema),
    defaultValues: {
      title: initialData?.title || "",
      clientId: initialData?.clientId || "",
      status: (initialData?.status as OfferStatus) || "draft",
      validUntil: initialData?.validUntil || undefined,
      notes: initialData?.notes || "",
      lastContact: initialData?.lastContact || undefined,
      nextContact: initialData?.nextContact || undefined,
      items: []
    },
  });

  useEffect(() => {
    if (offerItems?.length) {
      form.setValue("items", offerItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount || 0)
      })), { shouldValidate: true });
    }
  }, [offerItems, form]);

  const handleSubmit = async (data: InsertOffer) => {
    try {
      setIsSubmitting(true);
      const items = data.items?.map(item => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount || 0)
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
      
      toast({
        title: "Success",
        description: `Offer has been ${initialData ? 'updated' : 'created'} successfully`,
      });
      
      onSuccess?.();
      onClose?.();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${initialData ? 'update' : 'create'} offer`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addItem = useCallback(() => {
    const items = form.getValues("items") || [];
    form.setValue("items", [...items, {
      productId: "",
      quantity: 1,
      unitPrice: 0,
      discount: 0
    }]);
  }, [form]);

  if (clientsError || productsError) {
    return (
      <div className="text-center text-destructive p-4">
        Error loading required data. Please try again.
      </div>
    );
  }

  const renderDateField = (name: "validUntil" | "lastContact" | "nextContact", label: string, minDate?: Date) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>{label}</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full pl-3 text-left font-normal",
                    !field.value && "text-muted-foreground"
                  )}
                >
                  {field.value ? (
                    format(new Date(field.value), "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={field.value ? new Date(field.value) : undefined}
                onSelect={(date) => field.onChange(date?.toISOString())}
                disabled={minDate ? (date) => date < minDate : undefined}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle>{initialData ? 'Edit Offer' : 'Create Offer'}</DialogTitle>
        <DialogDescription>
          Fill in the details below to {initialData ? 'update' : 'create'} an offer.
        </DialogDescription>
      </DialogHeader>

      {(clientsLoading || productsLoading) ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
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
                        items={clients || []}
                        value={field.value}
                        onChange={(value) => form.setValue("clientId", value)}
                        onOpenChange={setOpenClient}
                        isOpen={openClient}
                        placeholder="Select client..."
                        searchPlaceholder="Search clients..."
                        displayKey="name"
                        secondaryDisplayKey="email"
                        loading={clientsLoading}
                        disabled={clientsLoading}
                        label="Select client"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />
            
              {/* Offer Details Section */}
            <div className="space-y-4">
            <h3 className="text-sm font-medium">Offer Details</h3>
            <div className="grid grid-cols-2 gap-4">
              {renderDateField("validUntil", "Valid Until", new Date())}
              
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <SearchableCombobox
                      items={OFFER_STATUS.map(status => ({
                        id: status,
                        name: status.charAt(0).toUpperCase() + status.slice(1)
                      }))}
                      value={field.value}
                      onChange={(value) => form.setValue("status", value as OfferStatus)}
                      onOpenChange={() => {}}
                      isOpen={false}
                      placeholder="Select status..."
                      searchPlaceholder="Search status..."
                      displayKey="name"
                      width="200px"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <Separator />

          {/* Products Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">Products</h3>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={addItem}
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
                              items={products || []}
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

          <Separator />

          {/* Follow-up Details Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Follow-up Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {renderDateField("lastContact", "Last Contact")}
              {renderDateField("nextContact", "Next Contact")}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-between items-center pt-4">
            <div className="text-sm text-muted-foreground">
              Total Amount: €{calculateTotal(form.watch("items") || []).toFixed(2)}
            </div>
            <div className="flex space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="min-w-[100px]"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initialData ? 'Update' : 'Create'} Offer
              </Button>
            </div>
          </div>
        </form>
      </Form>
    )}
  </>
);
}