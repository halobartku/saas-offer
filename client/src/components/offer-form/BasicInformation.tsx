import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import SearchableCombobox from "../SearchableCombobox";
import type { Client } from "../OfferFormTypes";

interface BasicInformationProps {
  form: UseFormReturn<any>;
  clients: Client[];
  openClient: boolean;
  setOpenClient: (open: boolean) => void;
  clientsLoading: boolean;
}

export default function BasicInformation({
  form,
  clients,
  openClient,
  setOpenClient,
  clientsLoading
}: BasicInformationProps) {
  return (
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
                items={clients}
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
  );
}
