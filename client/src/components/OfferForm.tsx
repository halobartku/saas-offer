import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
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
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { insertOfferSchema, type InsertOffer } from "db/schema";
import useSWR from "swr";
import { format } from "date-fns";
import { z } from "zod";

interface OfferFormProps {
  onSuccess?: () => void;
  initialData?: Partial<InsertOffer>;
  onClose?: () => void;
}

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

const OFFER_STATUS = ["draft", "sent", "accepted", "rejected"] as const;
type OfferStatus = typeof OFFER_STATUS[number];

export default function OfferForm({ onSuccess, initialData, onClose }: OfferFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: clients, error: clientsError } = useSWR("/api/clients");
  const { data: products, error: productsError } = useSWR("/api/products");
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

  if (clientsError || productsError) {
    return (
      <div className="text-center text-destructive">
        Error loading required data. Please try again.
      </div>
    );
  }

  async function onSubmit(data: InsertOffer) {
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
      
      if (typeof onSuccess === 'function') {
        onSuccess();
      }
      
      if (typeof onClose === 'function') {
        onClose();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${initialData ? 'update' : 'create'} offer`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const addItem = () => {
    const items = form.getValues("items") || [];
    form.setValue("items", [...items, {
      productId: "",
      quantity: 1,
      unitPrice: 0,
      discount: 0
    }]);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{initialData ? 'Edit Offer' : 'Create Offer'}</DialogTitle>
        <DialogDescription>
          Fill in the details below to {initialData ? 'update' : 'create'} an offer.
        </DialogDescription>
      </DialogHeader>

      {(!clients || !products) ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients?.map((client: any) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
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
                name="validUntil"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Valid Until</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={"w-full pl-3 text-left font-normal"}
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
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value || "draft"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {OFFER_STATUS.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
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

              <FormField
                control={form.control}
                name="lastContact"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Last Contact</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={"w-full pl-3 text-left font-normal"}
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
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nextContact"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Next Contact</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={"w-full pl-3 text-left font-normal"}
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
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Items</h3>
                <Button
                  type="button"
                  onClick={addItem}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-4">
                {form.watch("items")?.map((item, index) => (
                  <div key={index} className="grid grid-cols-4 gap-4 items-end p-4 border rounded-lg">
                    <FormField
                      control={form.control}
                      name={`items.${index}.productId`}
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Product</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              const selectedProduct = products?.find((p: any) => p.id === value);
                              if (selectedProduct) {
                                const items = form.getValues("items") || [];
                                items[index] = {
                                  ...items[index],
                                  productId: value,
                                  unitPrice: Number(selectedProduct.price)
                                };
                                form.setValue("items", items, { shouldValidate: true });
                              }
                            }}
                            value={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a product" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {products?.map((product: any) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name} (€{Number(product.price).toFixed(2)})
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
                      name={`items.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              {...field}
                              onChange={(e) => {
                                field.onChange(parseInt(e.target.value) || 1);
                                form.trigger("items");
                              }}
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
                              onChange={(e) => {
                                field.onChange(parseInt(e.target.value) || 0);
                                form.trigger("items");
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="self-end"
                      onClick={() => {
                        const currentItems = form.getValues("items") || [];
                        form.setValue(
                          "items",
                          currentItems.filter((_, i) => i !== index),
                          { shouldValidate: true }
                        );
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {form.formState.errors.items?.root && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.items.root.message}
                </p>
              )}

              <div className="text-sm text-muted-foreground">
                Total Items: {form.watch("items")?.length || 0}
              </div>
              <div className="text-sm font-medium">
                Total Amount: €{calculateTotal(form.watch("items") || []).toFixed(2)}
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initialData ? 'Update' : 'Create'} Offer
              </Button>
            </div>
          </form>
        </Form>
      )}
    </>
  );
}