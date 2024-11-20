import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import DatePickerField from "./DatePickerField";

interface FollowUpDetailsProps {
  form: UseFormReturn<any>;
}

export default function FollowUpDetails({ form }: FollowUpDetailsProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Follow-up Details</h3>
      <div className="grid grid-cols-2 gap-4">
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
          <DatePickerField
            form={form}
            name="lastContact"
            label="Last Contact"
          />
          <DatePickerField
            form={form}
            name="nextContact"
            label="Next Contact"
          />
        </div>
      </div>
    </div>
  );
}
