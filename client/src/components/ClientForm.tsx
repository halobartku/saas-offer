import { useForm } from "react-hook-form";
import { useState, useMemo } from "react";

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
  { code: "SE", name: "Sweden" }
] as const;
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { insertClientSchema, type InsertClient } from "db/schema";

interface ClientFormProps {
  onSuccess?: () => void;
  initialData?: Partial<InsertClient>;
  onClose?: () => void;
}

export default function ClientForm({ onSuccess, initialData, onClose }: ClientFormProps) {
  const { toast } = useToast();
  const [selectedCountry, setSelectedCountry] = useState<string>(initialData?.countryCode ?? "");
  const [isValidating, setIsValidating] = useState(false);
  const [vatError, setVatError] = useState<string | null>(null);
  
  const form = useForm<InsertClient>({
    resolver: zodResolver(insertClientSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      email: initialData?.email ?? "",
      phone: initialData?.phone ?? "",
      address: initialData?.address ?? "",
      clientType: initialData?.clientType ?? "direct",
      vatNumber: initialData?.vatNumber ?? "",
      countryCode: initialData?.countryCode ?? "",
    },
  });
  const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const validateVAT = async (countryCode: string, vatNumber: string) => {
  const startTime = Date.now();
  console.log('Starting VAT validation:', { 
    countryCode, 
    vatNumber,
    timestamp: new Date().toISOString() 
  });

  setIsValidating(true);
  setVatError(null);

  try {
    // Input validation
    if (!countryCode) {
      throw new Error('Country code is required');
    }
    
    if (!vatNumber) {
      throw new Error('VAT number is required');
    }

    // Sanitize VAT number
    const sanitizedVAT = vatNumber.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (!sanitizedVAT) {
      throw new Error('VAT number contains no valid characters');
    }

    console.log('Making API request to validate VAT');
    const response = await fetch(
      `/api/vat/validate/${countryCode}/${sanitizedVAT}`,
      { signal: AbortSignal.timeout(20000) }
    );

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error('Invalid response format from server');
    }

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || data.error || 'Failed to validate VAT number');
    }

    if (typeof data.valid !== 'boolean') {
      throw new Error('Invalid validation result from server');
    }

    if (!data.valid) {
      throw new Error(`The VAT number ${countryCode}${sanitizedVAT} is not valid`);
    }

    // Auto-fill company details
    if (data.name) {
      form.setValue('name', data.name);
    }
    if (data.address) {
      form.setValue('address', data.address);
    }

    toast({
      title: "Success",
      description: "VAT number validated successfully and company details updated",
    });

    return data;
  } catch (error) {
    console.error('VAT validation error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });

    let errorMessage = 'Failed to validate VAT number';
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'Request timeout - Please try again';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Validation service is not responding, please try again later';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error - Please check your internet connection';
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
    console.log('VAT validation completed:', {
      duration: `${Date.now() - startTime}ms`,
      timestamp: new Date().toISOString()
    });
  }
};

  

  async function onSubmit(data: InsertClient) {
    try {
      const url = initialData ? `/api/clients/${initialData.id}` : "/api/clients";
      const method = initialData ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save client");
      }
      
      toast({
        title: "Success",
        description: `Client has been ${initialData ? 'updated' : 'created'} successfully`,
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
        description: error instanceof Error ? error.message : `Failed to ${initialData ? 'update' : 'create'} client`,
        variant: "destructive",
      });
    }
  }

  return (
    <>
      <DialogHeader className="px-4 sm:px-6">
        <DialogTitle>{initialData ? 'Edit Client' : 'Create Client'}</DialogTitle>
        <DialogDescription>
          Fill in the details below to {initialData ? 'update' : 'create'} a client.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
          <div className="flex-1 overflow-y-auto px-4 sm:px-6" style={{ maxHeight: "calc(90vh - 200px)" }}>
            <div className="space-y-4 py-4">
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
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input 
                    type="tel" 
                    {...field} 
                    value={field.value || ''} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="clientType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="direct">Direct</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="countryCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <Select
                  onValueChange={(value) => {
                    setSelectedCountry(value);
                    field.onChange(value);
                  }}
                  value={field.value || undefined}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {EU_COUNTRIES.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.name}
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
            name="vatNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>VAT Number</FormLabel>
                <FormControl>
                  <div className="space-y-2">
                    <div className="flex gap-2 items-center">
                      <div className="flex-1">
                        <Input 
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => {
                            const value = e.target.value.toUpperCase();
                            field.onChange(value);
                            setVatError(null);
                            
                            // Automatically extract country code
                            if (value.length >= 2) {
                              const countryCode = value.substring(0, 2);
                              setSelectedCountry(countryCode);
                              form.setValue('countryCode', countryCode);
                            }
                          }}
                          placeholder="Enter VAT number (e.g. DE123456789)"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={() => {
                          const fullVat = field.value || '';
                          if (fullVat.length < 2) {
                            setVatError('Please enter a valid VAT number');
                            return;
                          }
                          const countryCode = fullVat.substring(0, 2);
                          const vatNumber = fullVat.substring(2);
                          validateVAT(countryCode, vatNumber);
                        }}
                        disabled={!field.value || field.value.length < 3 || isValidating}
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
            name="contactPerson"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Person</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Textarea {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          </div>
          </div>
          <div className="border-t px-4 sm:px-6 py-4 mt-auto">
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="w-full sm:w-auto">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" className="w-full sm:w-auto">
                {initialData ? 'Update Client' : 'Create Client'}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </>
  );
}
