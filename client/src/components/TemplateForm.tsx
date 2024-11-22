import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { useToast } from "@/hooks/use-toast";
import { insertOfferTemplateSchema, type InsertOfferTemplate, type OfferTemplate } from "db/schema";
import { ProductList } from "./offer/ProductList";

interface TemplateFormProps {
  onSuccess?: () => void;
  initialData?: OfferTemplate;
  onClose?: () => void;
}

export default function TemplateForm({ onSuccess, initialData, onClose }: TemplateFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<InsertOfferTemplate>({
    resolver: zodResolver(insertOfferTemplateSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      items: initialData?.items || "[]",
      validityPeriod: initialData?.validityPeriod || undefined,
    },
  });

  async function onSubmit(data: InsertOfferTemplate) {
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      
      const url = initialData?.id ? `/api/templates/${initialData.id}` : "/api/templates";
      const method = initialData?.id ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${initialData ? 'update' : 'create'} template`);
      }
      
      toast({
        title: "Success",
        description: `Template has been ${initialData ? 'updated' : 'created'} successfully`,
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
        description: error instanceof Error ? error.message : `Failed to ${initialData ? 'update' : 'create'} template`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{initialData ? 'Edit Template' : 'Create Template'}</DialogTitle>
        <DialogDescription>
          Fill in the details below to {initialData ? 'update' : 'create'} a template.
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="validityPeriod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Validity Period (days)</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    min="1"
                    {...field}
                    onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <ProductList
            items={initialData?.items ? JSON.parse(initialData.items) : []}
            onItemsChange={(items) => form.setValue('items', JSON.stringify(items))}
          />

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
              {isSubmitting ? 'Saving...' : initialData ? 'Update Template' : 'Create Template'}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}
