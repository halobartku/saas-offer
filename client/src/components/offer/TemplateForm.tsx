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
import { insertTemplateSchema, type InsertTemplate } from "db/schema";

interface TemplateFormProps {
  onSuccess?: () => void;
  initialData?: Partial<InsertTemplate>;
  onClose?: () => void;
}

export default function TemplateForm({
  onSuccess,
  initialData,
  onClose,
}: TemplateFormProps) {
  const { toast } = useToast();
  const form = useForm<InsertTemplate>({
    resolver: zodResolver(insertTemplateSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      content: initialData?.content || {},
    },
  });

  async function onSubmit(data: InsertTemplate) {
    try {
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

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit">
              {initialData ? 'Update Template' : 'Create Template'}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}
