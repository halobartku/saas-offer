import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const OFFER_STATUS = ["draft", "sent", "accepted", "rejected"] as const;

interface OfferDetailsProps {
  form: any;
}

export function OfferDetails({ form }: OfferDetailsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name="validUntil"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Valid Until</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full pl-3 text-left font-normal",
                      !field.value && "text-muted-foreground"
                    )}
                    aria-label="Select valid until date"
                  >
                    {field.value ? (
                      format(new Date(field.value), "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value ? new Date(field.value) : undefined}
                  onSelect={(date) => field.onChange(date?.toISOString())}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )}
      />

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
                      "justify-between w-full",
                      !field.value && "text-muted-foreground"
                    )}
                    aria-label="Select offer status"
                  >
                    {field.value ? field.value.charAt(0).toUpperCase() + field.value.slice(1) : "Select status..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandGroup>
                    {OFFER_STATUS.map((status) => (
                      <CommandItem
                        key={status}
                        value={status}
                        onSelect={() => {
                          form.setValue("status", status);
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
    </div>
  );
}
