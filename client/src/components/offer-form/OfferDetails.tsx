import { FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";
import SearchableCombobox from "../SearchableCombobox";
import DatePickerField from "./DatePickerField";
import { OFFER_STATUS, type OfferStatus } from "../OfferFormTypes";

interface OfferDetailsProps {
  form: UseFormReturn<any>;
}

export default function OfferDetails({ form }: OfferDetailsProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Offer Details</h3>
      <div className="grid grid-cols-2 gap-4">
        <DatePickerField
          form={form}
          name="validUntil"
          label="Valid Until"
          minDate={new Date()}
        />
        
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <SearchableCombobox
                items={OFFER_STATUS.map(status => ({
                  id: status,
                  name: status.charAt(0).toUpperCase() + status.slice(1)
                }))}
                value={field.value}
                onChange={(value) => form.setValue("status", value as OfferStatus)}
                onOpenChange={() => {}}
                isOpen={false}
                placeholder="Select status..."
                searchPlaceholder="Search status..."
                displayKey="name"
                width="200px"
              />
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
