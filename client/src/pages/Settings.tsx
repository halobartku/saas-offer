import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useSWR from "swr";
import { useState } from "react";
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

// EU country codes for VAT validation
const EU_COUNTRIES = [
  { code: "AT", name: "Austria" },
  { code: "BE", name: "Belgium" },
  { code: "BG", name: "Bulgaria" },
  { code: "HR", name: "Croatia" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czech Republic" },
  { code: "DK", name: "Denmark" },
  { code: "EE", name: "Estonia" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "GR", name: "Greece" },
  { code: "HU", name: "Hungary" },
  { code: "IE", name: "Ireland" },
  { code: "IT", name: "Italy" },
  { code: "LV", name: "Latvia" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MT", name: "Malta" },
  { code: "NL", name: "Netherlands" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "RO", name: "Romania" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "ES", name: "Spain" },
  { code: "SE", name: "Sweden" },
] as const;

const validateVAT = async (
  countryCode: string,
  vatNumber: string,
  form: any,
  setIsValidating: (value: boolean) => void,
  setVatError: (value: string | null) => void,
  toast: any,
) => {
  const startTime = Date.now();
  console.log("Starting VAT validation:", {
    countryCode,
    vatNumber,
    timestamp: new Date().toISOString(),
  });

  setIsValidating(true);
  setVatError(null);

  try {
    // Input validation
    if (!countryCode) {
      throw new Error("Country code is required");
    }

    if (!vatNumber) {
      throw new Error("VAT number is required");
    }

    // Sanitize VAT number
    const sanitizedVAT = vatNumber.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (!sanitizedVAT) {
      throw new Error("VAT number contains no valid characters");
    }

    console.log("Making API request to validate VAT");
    const response = await fetch(
      `/api/vat/validate/${countryCode}/${sanitizedVAT}`,
      { signal: AbortSignal.timeout(20000) },
    );

    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      throw new Error("Invalid response format from server");
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || data.error || "Failed to validate VAT number",
      );
    }

    if (typeof data.valid !== "boolean") {
      throw new Error("Invalid validation result from server");
    }

    if (!data.valid) {
      throw new Error(
        `The VAT number ${countryCode}${sanitizedVAT} is not valid`,
      );
    }

    // Auto-fill company details
    if (data.name) {
      form.setValue("companyName", data.name, { shouldDirty: true });
    }
    if (data.address) {
      form.setValue("companyAddress", data.address, { shouldDirty: true });
    }

    toast({
      title: "Success",
      description:
        "VAT number validated successfully and company details updated",
    });

    return data;
  } catch (error) {
    console.error("VAT validation error:", {
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });

    let errorMessage = "Failed to validate VAT number";
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        errorMessage = "Request timeout - Please try again";
      } else if (error.message.includes("timeout")) {
        errorMessage =
          "Validation service is not responding, please try again later";
      } else if (error.message.includes("network")) {
        errorMessage = "Network error - Please check your internet connection";
      } else {
        errorMessage = error.message;
      }
    }

    setVatError(errorMessage);
    toast({
      title: "Error",
      description: errorMessage,
      variant: "destructive",
    });
    throw error;
  } finally {
    setIsValidating(false);
    console.log("VAT validation completed:", {
      duration: `${Date.now() - startTime}ms`,
      timestamp: new Date().toISOString(),
    });
  }
};

export default function Settings() {
  const { toast } = useToast();
  const { data: settings, mutate } = useSWR<InsertSettings>("/api/settings");
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vatError, setVatError] = useState<string | null>(null);

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
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save settings");
      }

      const result = await response.json();
      await mutate(result); // Allow revalidation

      toast({
        title: "Success",
        description: "Settings saved successfully",
      });

      // Reset form state to pristine
      form.reset(data);
    } catch (error) {
      console.error("Settings save error:", error);

      let errorMessage = "Failed to save settings";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

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
    <div className="container max-w-3xl py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your company information</p>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="p-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6"
              noValidate
            >
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} />
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
                      <Input
                        type="email"
                        {...field}
                        value={field.value || ""}
                      />
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
                      <Input type="tel" {...field} value={field.value || ""} />
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
                      <Textarea {...field} value={field.value || ""} />
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
                      <div className="space-y-2">
                        <div className="flex gap-2 items-center">
                          <div className="flex-1">
                            <Input
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => {
                                const value = e.target.value.toUpperCase();
                                field.onChange(value);
                                setVatError(null);
                              }}
                              placeholder="Enter VAT number (e.g. DE123456789)"
                            />
                          </div>
                          <Button
                            type="button"
                            onClick={() => {
                              const fullVat = field.value || "";
                              if (fullVat.length < 2) {
                                setVatError("Please enter a valid VAT number");
                                return;
                              }
                              const countryCode = fullVat.substring(0, 2);
                              const vatNumber = fullVat.substring(2);
                              validateVAT(
                                countryCode,
                                vatNumber,
                                form,
                                setIsValidating,
                                setVatError,
                                toast,
                              );
                            }}
                            disabled={
                              !field.value ||
                              field.value.length < 3 ||
                              isValidating
                            }
                          >
                            {isValidating ? "Validating..." : "Validate"}
                          </Button>
                        </div>
                        {vatError && (
                          <p className="text-sm text-destructive">{vatError}</p>
                        )}
                      </div>
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
                    <FormLabel>Company Logo</FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <Input
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;

                              // Validate file size (5MB limit)
                              if (file.size > 5 * 1024 * 1024) {
                                toast({
                                  title: "Error",
                                  description: "File size should not exceed 5MB",
                                  variant: "destructive",
                                });
                                return;
                              }

                              // Validate file type
                              if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
                                toast({
                                  title: "Error",
                                  description: "Only JPG, JPEG and PNG files are allowed",
                                  variant: "destructive",
                                });
                                return;
                              }

                              const formData = new FormData();
                              formData.append('logo', file);

                              try {
                                setIsSubmitting(true);
                                const response = await fetch('/api/settings/logo', {
                                  method: 'POST',
                                  body: formData,
                                });

                                if (!response.ok) {
                                  throw new Error('Failed to upload logo');
                                }

                                const data = await response.json();
                                field.onChange(data.logoUrl);
                                
                                toast({
                                  title: "Success",
                                  description: "Logo uploaded successfully",
                                });

                                // Refresh settings data
                                mutate();
                              } catch (error) {
                                toast({
                                  title: "Error",
                                  description: error instanceof Error ? error.message : "Failed to upload logo",
                                  variant: "destructive",
                                });
                              } finally {
                                setIsSubmitting(false);
                              }
                            }}
                            disabled={isSubmitting}
                          />
                        </div>
                        {field.value && (
                          <div className="relative w-32 h-32">
                            <img
                              src={field.value}
                              alt="Company logo"
                              className="object-contain w-full h-full"
                            />
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isSubmitting || !form.formState.isDirty}
                >
                  {isSubmitting ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
