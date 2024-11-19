import { useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, CalendarIcon, Loader2 } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import useSWR from "swr";

interface ProductSales {
  productId: string;
  name: string;
  totalQuantity: number;
  totalRevenue: number;
  lastSaleDate: string;
}

export default function ProductsSold() {
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });

  const queryString = new URLSearchParams({
    ...(dateRange.from && { from: startOfDay(dateRange.from).toISOString() }),
    ...(dateRange.to && { to: endOfDay(dateRange.to).toISOString() }),
  }).toString();

  const { data: sales, error } = useSWR<ProductSales[]>(
    `/api/products/sold${queryString ? `?${queryString}` : ''}`
  );

  const filteredSales = sales?.filter(sale => 
    sale.name.toLowerCase().includes(search.toLowerCase())
  );

  if (error) {
    return (
      <div className="text-center text-destructive">
        Error loading sales data. Please try again later.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Products Sold</h1>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 flex-1">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="min-w-[240px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} -{" "}
                    {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              selected={{
                from: dateRange.from,
                to: dateRange.to,
              }}
              onSelect={(range) => {
                setDateRange({
                  from: range?.from,
                  to: range?.to,
                });
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      {!sales ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Name</TableHead>
              <TableHead className="text-right">Total Quantity Sold</TableHead>
              <TableHead className="text-right">Total Revenue</TableHead>
              <TableHead>Last Sale Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSales?.map((sale) => (
              <TableRow key={sale.productId}>
                <TableCell className="font-medium">{sale.name}</TableCell>
                <TableCell className="text-right">{sale.totalQuantity}</TableCell>
                <TableCell className="text-right">
                  €{Number(sale.totalRevenue).toFixed(2)}
                </TableCell>
                <TableCell>
                  {format(new Date(sale.lastSaleDate), "PPP")}
                </TableCell>
              </TableRow>
            ))}
            {filteredSales?.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No sales data found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
