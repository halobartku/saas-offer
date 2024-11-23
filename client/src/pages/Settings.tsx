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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { insertSettingsSchema, type InsertSettings } from "db/schema";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
// Image preview handling

export default function Settings() {
  const { toast } = useToast();
  const { data: settings, mutate } = useSWR("/api/settings");
  const [isValidatingVat, setIsValidatingVat] = useState(false);
  const [vatDetails, setVatDetails] = useState<any>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  const form = useForm<InsertSettings>({
    resolver: zodResolver(insertSettingsSchema),
    defaultValues: {
      companyName: "",
      companyEmail: "",
      companyPhone: "",
      companyAddress: "",
      companyVatNumber: "",
      companyLogo: null,
    },
    values: settings || undefined,
  });

  const validateVat = async (vatNumber: string) => {
    if (!vatNumber) return;
    
    setIsValidatingVat(true);
    try {
      const response = await fetch(`/api/vat/validate/${vatNumber}`);
      const data = await response.json();
      
      if (response.ok && data.valid) {
        setVatDetails(data);
        form.setValue('companyName', data.name);
        form.setValue('companyAddress', data.address);
        
        toast({
          title: "VAT Validation Successful",
          description: "Company details have been automatically filled.",
        });
      } else {
        toast({
          title: "Invalid VAT Number",
          description: data.error || "Please check the VAT number and try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Validation Error",
        description: "Failed to validate VAT number. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsValidatingVat(false);
    }
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Logo file must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  async function onSubmit(data: InsertSettings) {
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'companyLogo' && value instanceof FileList) {
          formData.append('logo', value[0]);
        } else {
          formData.append(key, value as string);
        }
      });

      const response = await fetch("/api/settings", {
        method: "POST",
        body: formData,
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
    <div className="container max-w-2xl py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your company information</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  <Input type="email" {...field} />
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
                <div className="flex gap-2">
                  <FormControl>
                    <Input {...field} placeholder="e.g. GB123456789" />
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => validateVat(field.value)}
                    disabled={isValidatingVat || !field.value}
                  >
                    {isValidatingVat && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Validate
                  </Button>
                </div>
                <FormDescription>
                  Enter your VAT number to automatically fill company details
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="companyLogo"
            render={({ field: { value, onChange, ...field } }) => (
              <FormItem>
                <FormLabel>Company Logo</FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      onChange(e.target.files);
                      handleLogoChange(e);
                    }}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Upload your company logo (max 5MB)
                </FormDescription>
                {logoPreview && (
                  <Card className="mt-2">
                    <CardContent className="p-4">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="max-h-32 object-contain"
                      />
                    </CardContent>
                  </Card>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full">
            Save Settings
          </Button>
        </form>
      </Form>
    </div>
  );
}
