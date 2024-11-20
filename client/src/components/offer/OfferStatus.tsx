import { FormField, FormItem, FormLabel, FormMessage, FormControl } from "@/components/ui/form";
import { Command, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOfferForm } from "@/context/OfferFormContext";

const OFFER_STATUS = ["draft", "sent", "accepted", "rejected"] as const;
type OfferStatus = typeof OFFER_STATUS[number];

export function OfferStatus() {
  const { form } = useOfferForm();

  return (
    <FormField
      control={form.control}
      name="status"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Status</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  role="combobox"
                  className={cn(
                    "w-full justify-between",
                    !field.value && "text-muted-foreground"
                  )}
                >
                  {field.value
                    ? field.value.charAt(0).toUpperCase() + field.value.slice(1)
                    : "Select status..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
              <Command>
                <CommandEmpty>No status found.</CommandEmpty>
                <CommandGroup>
                  {OFFER_STATUS.map((status) => (
                    <CommandItem
                      key={status}
                      value={status}
                      onSelect={() => {
                        form.setValue("status", status, { shouldValidate: true });
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          status === field.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
