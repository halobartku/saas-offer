import { useForm } from "react-hook-form";
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
import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { insertOfferSchema, type InsertOffer } from "db/schema";
import useSWR from "swr";
import { format } from "date-fns";

interface OfferFormProps {
  onSuccess?: () => void;
  initialData?: Partial<InsertOffer>;
  onClose?: () => void;
}

export default function OfferForm({ onSuccess, initialData, onClose }: OfferFormProps) {
  const { toast } = useToast();
  const { data: clients } = useSWR("/api/clients");
  const { data: products } = useSWR("/api/products");

  const form = useForm<InsertOffer>({
    resolver: zodResolver(insertOfferSchema),
    defaultValues: initialData || {
      title: "",
      clientId: "",
      status: "draft",
      items: [],
    },
  });

  async function onSubmit(data: InsertOffer) {
    try {
      const response = await fetch("/api/offers", {
        method: initialData ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) throw new Error("Failed to save offer");
      
      toast({
        title: "Success",
        description: `Offer has been ${initialData ? 'updated' : 'created'}`,
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
        description: `Failed to ${initialData ? 'update' : 'create'} offer`,
        variant: "destructive",
      });
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{initialData ? 'Edit Offer' : 'Create Offer'}</DialogTitle>
        <DialogDescription>
          Fill in the details below to {initialData ? 'update' : 'create'} an offer.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients?.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
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
              name="validUntil"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Valid Until</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={"w-full pl-3 text-left font-normal"}
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Items</h3>
              <Button
                type="button"
                onClick={() => {
                  const items = form.getValues("items") || [];
                  form.setValue("items", [...items, { 
                    productId: "", 
                    quantity: 1,
                    unitPrice: 0,
                    discount: 0
                  }]);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            {form.watch("items")?.map((_, index) => (
              <div key={index} className="grid grid-cols-5 gap-4 items-end">
                <FormField
                  control={form.control}
                  name={`items.${index}.productId`}
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Product</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a product" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {products?.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name}
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
                  name={`items.${index}.quantity`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`items.${index}.unitPrice`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Price</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min="0"
                          step="0.01"
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`items.${index}.discount`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          max="100" 
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    const items = form.getValues("items");
                    form.setValue(
                      "items",
                      items.filter((_, i) => i !== index)
                    );
                  }}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button type="submit" className="w-full">
            {initialData ? 'Update Offer' : 'Create Offer'}
          </Button>
        </form>
      </Form>
    </>
  );
}
