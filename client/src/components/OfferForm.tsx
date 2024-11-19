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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, Plus, Trash2, ChevronsUpDown, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { insertOfferSchema, type InsertOffer } from "db/schema";
import useSWR from "swr";
import { format } from "date-fns";
import { z } from "zod";
import { cn } from "@/lib/utils";

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
  const [openClient, setOpenClient] = useState(false);
  const [openProduct, setOpenProduct] = useState<number | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [productSearches, setProductSearches] = useState<{ [key: number]: string }>({});

  const { data: clients = [], error: clientsError, isLoading: clientsLoading } = useSWR("/api/clients");
  const { data: products = [], error: productsError, isLoading: productsLoading } = useSWR("/api/products");
  const { data: offerItems } = useSWR(
    initialData?.id ? `/api/offers/${initialData.id}/items` : null
  );

  // Improved filtering logic for clients with multi-word search
  const filteredClients = clients.filter((client: any) => {
    const searchTerms = clientSearch.toLowerCase().split(' ');
    const clientData = `${client.name} ${client.email} ${client.clientType}`.toLowerCase();
    return searchTerms.every(term => clientData.includes(term));
  });

  // Improved filtering logic for products with multi-word search
  const getFilteredProducts = (index: number) => {
    const search = productSearches[index] || "";
    const searchTerms = search.toLowerCase().split(' ');
    return products.filter((product: any) => {
      const productData = `${product.name} ${product.sku}`.toLowerCase();
      return searchTerms.every(term => productData.includes(term));
    });
  };

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

  const handleClientSelect = (clientId: string) => {
    form.setValue("clientId", clientId);
    setOpenClient(false);
    setClientSearch("");
  };

  const handleProductSelect = (productId: string, index: number, price: number) => {
    form.setValue(`items.${index}.productId`, productId);
    form.setValue(`items.${index}.unitPrice`, Number(price));
    setOpenProduct(null);
    setProductSearches(prev => ({
      ...prev,
      [index]: ""
    }));
  };

  const addItem = () => {
    const items = form.getValues("items") || [];
    form.setValue("items", [...items, {
      productId: "",
      quantity: 1,
      unitPrice: 0,
      discount: 0
    }]);
  };

  const removeItem = (index: number) => {
    const items = form.getValues("items");
    form.setValue("items", items.filter((_, i) => i !== index));
  };

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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                <FormItem className="flex flex-col">
                  <FormLabel>Client</FormLabel>
                  <Popover 
                    open={openClient} 
                    onOpenChange={(open) => {
                      setOpenClient(open);
                      if (!open) setClientSearch("");
                    }}
                  >
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openClient}
                          className={cn(
                            "justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? clients?.find((client: any) => client.id === field.value)?.name
                            : "Select client..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command shouldFilter={false}>
                        <CommandInput 
                          placeholder="Search clients..."
                          value={clientSearch}
                          onValueChange={setClientSearch}
                          className="border-none focus:ring-0"
                        />
                        <CommandEmpty>No client found.</CommandEmpty>
                        <CommandGroup className="max-h-[300px] overflow-auto">
                          {filteredClients.map((client: any) => (
                            <CommandItem
                              key={client.id}
                              value={client.id}
                              onSelect={() => handleClientSelect(client.id)}
                            >
                              <div className="flex items-center">
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    client.id === field.value ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium">{client.name}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {client.email} • {client.clientType}
                                  </span>
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
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
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
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
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < new Date()
                        }
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

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">Products</h3>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </div>

              {form.watch("items")?.map((item, index) => (
                <div key={index} className="space-y-4 p-4 border rounded-lg">
                  <div className="flex justify-between">
                    <h4 className="text-sm font-medium">Product {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <FormField
                    control={form.control}
                    name={`items.${index}.productId`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product</FormLabel>
                        <Popover
                          open={openProduct === index}
                          onOpenChange={(open) => {
                            setOpenProduct(open ? index : null);
                            if (!open) {
                              setProductSearches(prev => ({
                                ...prev,
                                [index]: ""
                              }));
                            }
                          }}
                        >
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  "justify-between w-full",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value
                                  ? products?.find((product: any) => product.id === field.value)?.name
                                  : "Select product..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0">
                            <Command shouldFilter={false}>
                              <CommandInput 
                                placeholder="Search products..."
                                value={productSearches[index] || ""}
                                onValueChange={(value) => {
                                  setProductSearches(prev => ({
                                    ...prev,
                                    [index]: value
                                  }));
                                }}
                                className="border-none focus:ring-0"
                              />
                              <CommandEmpty>No product found.</CommandEmpty>
                              <CommandGroup className="max-h-[300px] overflow-auto">
                                {getFilteredProducts(index).map((product: any) => (
                                  <CommandItem
                                    key={product.id}
                                    value={product.id}
                                    onSelect={() => handleProductSelect(product.id, index, product.price)}
                                  >
                                    <div className="flex items-center">
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          product.id === field.value ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <div className="flex flex-col">
                                        <span className="font-medium">{product.name}</span>
                                        <span className="text-sm text-muted-foreground">
                                          SKU: {product.sku} • Price: €{Number(product.price).toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
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
                              onChange={e => field.onChange(parseInt(e.target.value))}
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
                          <FormLabel>Discount (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              {...field}
                              onChange={e => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
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