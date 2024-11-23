import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useSWR from "swr";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { insertSettingsSchema, type InsertSettings } from "db/schema";

export default function Settings() {
  const { toast } = useToast();
  const { data: settings, mutate } = useSWR("/api/settings");
  
  const form = useForm<InsertSettings>({
    resolver: zodResolver(insertSettingsSchema),
    defaultValues: {
      companyName: "",
      companyEmail: "",
      companyPhone: "",
      companyAddress: "",
      companyVatNumber: "",
      companyLogo: "",
    },
    values: settings || undefined,
  });

  async function onSubmit(data: InsertSettings) {
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      await mutate();
      
      toast({
        title: "Success",
        description: "Settings saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="container max-w-3xl py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your company information</p>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="companyName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="companyEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="companyPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Phone</FormLabel>
                <FormControl>
                  <Input type="tel" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="companyAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Address</FormLabel>
                <FormControl>
                  <Textarea {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="companyVatNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>VAT Number</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="companyLogo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Logo URL</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end">
                <Button type="submit">
                  Save Settings
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
