import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { insertOfferSchema, type InsertOffer } from "db/schema";
import useSWR from "swr";
import { z } from "zod";
import { ClientSearch } from "./offer-form/ClientSearch";
import { ProductSearch } from "./offer-form/ProductSearch";
import { OfferDetails } from "./offer-form/OfferDetails";

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

interface OfferFormProps {
  onSuccess?: () => void;
  initialData?: Partial<InsertOffer>;
  onClose?: () => void;
}

export default function OfferForm({ onSuccess, initialData, onClose }: OfferFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openClient, setOpenClient] = useState(false);
  const [openProduct, setOpenProduct] = useState<number | null>(null);
  
  const { data: clients, isLoading: clientsLoading } = useSWR("/api/clients");
  const { data: products, isLoading: productsLoading } = useSWR("/api/products");
  const { data: offerItems } = useSWR(
    initialData?.id ? `/api/offers/${initialData.id}/items` : null
  );

  const form = useForm<InsertOffer>({
    resolver: zodResolver(enhancedOfferSchema),
    defaultValues: {
      title: initialData?.title || "",
      clientId: initialData?.clientId || "",
      status: initialData?.status || "draft",
      validUntil: initialData?.validUntil || undefined,
      notes: initialData?.notes || "",
      lastContact: initialData?.lastContact || undefined,
      nextContact: initialData?.nextContact || undefined,
      items: []
    },
  });

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

  const handleProductSelect = (index: number, productId: string) => {
    const product = products?.find(p => p.id === productId);
    if (product) {
      form.setValue(`items.${index}.productId`, productId);
      form.setValue(`items.${index}.unitPrice`, Number(product.price));
    }
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
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <ClientSearch 
                  clients={clients}
                  isLoading={clientsLoading}
                  form={form}
                  onPopoverOpenChange={setOpenClient}
                  isOpen={openClient}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Offer Details</h3>
              <OfferDetails form={form} />
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">Products</h3>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addItem}
                  aria-label="Add product to offer"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </div>

              <div className="space-y-4">
                {form.watch("items")?.map((_, index) => (
                  <div key={index} className="flex gap-4 items-end p-4 border rounded-lg">
                    <ProductSearch
                      products={products}
                      isLoading={productsLoading}
                      form={form}
                      index={index}
                      onSelect={(productId) => handleProductSelect(index, productId)}
                      onPopoverOpenChange={(open) => setOpenProduct(open ? index : null)}
                      isOpen={openProduct === index}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      className="h-10 w-10"
                      aria-label="Remove product"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
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