import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "./useDebounce";
import type { Client } from "db/schema";

interface ClientSearchProps {
  clients?: Client[];
  isLoading: boolean;
  form: any;
  onPopoverOpenChange: (open: boolean) => void;
  isOpen: boolean;
}

export function ClientSearch({ clients, isLoading, form, onPopoverOpenChange, isOpen }: ClientSearchProps) {
  const [search, setSearch] = useState("");
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    if (debouncedSearch.length < 2) {
      setFilteredClients([]);
      return;
    }

    const searchTerms = debouncedSearch.toLowerCase().split(" ");
    const filtered = clients?.filter(client => 
      searchTerms.every(term =>
        client.name.toLowerCase().includes(term) ||
        client.email.toLowerCase().includes(term)
      )
    ) || [];
    
    setFilteredClients(filtered);
  }, [debouncedSearch, clients]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSearch("");
    }
    onPopoverOpenChange(open);
  };

  const totalResults = filteredClients.length;
  const showResults = search.length >= 2;

  return (
    <FormField
      control={form.control}
      name="clientId"
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>Client</FormLabel>
          <Popover open={isOpen} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isOpen}
                  aria-label="Select a client"
                  className={cn(
                    "justify-between w-full",
                    !field.value && "text-muted-foreground"
                  )}
                >
                  {field.value
                    ? clients?.find((client) => client.id === field.value)?.name
                    : "Select client..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
              <Command>
                <CommandInput 
                  placeholder="Search clients..."
                  value={search}
                  onValueChange={setSearch}
                />
                {isLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : !showResults ? (
                  <p className="p-2 text-sm text-muted-foreground">
                    Enter at least 2 characters to search
                  </p>
                ) : (
                  <>
                    {totalResults > 0 && (
                      <p className="p-2 text-xs text-muted-foreground">
                        Found {totalResults} result{totalResults !== 1 ? 's' : ''}
                      </p>
                    )}
                    <CommandEmpty>No clients found.</CommandEmpty>
                    <CommandGroup>
                      {filteredClients.map((client) => (
                        <CommandItem
                          key={client.id}
                          value={client.id}
                          onSelect={() => {
                            form.setValue("clientId", client.id);
                            setSearch("");
                            handleOpenChange(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              client.id === field.value ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span>{client.name}</span>
                            <span className="text-sm text-muted-foreground">
                              {client.email} • {client.clientType}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}
              </Command>
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
