import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Search, CalendarIcon, Loader2 } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import useSWR from "swr";

// Types and Interfaces
interface ProductSale {
  productId: string;
  name: string;
  totalQuantity: number;
  totalRevenue: string | number;
  lastSaleDate: string;
}

interface ChartDataPoint {
  name: string;
  value: number;
  percentage: string;
}

import { DateRange } from "@/components/ui/calendar";

interface ProductSoldDateRange extends DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

// Constants
const CHART_COLORS = [
  "#0ea5e9", // Blue
  "#6366f1", // Indigo
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#f43f5e", // Rose
  "#f97316", // Orange
  "#eab308", // Yellow
  "#84cc16", // Lime
  "#22c55e", // Green
  "#14b8a6", // Teal
];

// Helper Functions
function formatCurrency(amount: number): string {
  if (typeof amount !== "number" || isNaN(amount)) return "€0.00";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Custom Components
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-[400px]">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

const RevenueChart = ({ data }: { data: ChartDataPoint[] }) => {
  const isMobile = useMobile();
  
  return (
    <div className={`w-full ${isMobile ? 'h-[250px]' : 'h-[300px]'}`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={isMobile ? "50%" : "60%"}
            outerRadius={isMobile ? "70%" : "80%"}
            dataKey="value"
            labelLine={false}
            label={isMobile ? undefined : ({ name, percentage }) => `${name} (${percentage}%)`}
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{
              background: 'var(--background)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              fontSize: isMobile ? '12px' : '14px',
            }}
          />
          <Legend
            layout={isMobile ? "vertical" : "horizontal"}
            align="center"
            verticalAlign={isMobile ? "bottom" : "middle"}
            wrapperStyle={{
              fontSize: isMobile ? '12px' : '14px',
              paddingTop: isMobile ? '10px' : '0',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// Main Component
export default function ProductsSold() {
  // State
  const [search, setSearch] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined,
  });

  // Data Fetching
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (dateRange.from)
      params.append("from", startOfDay(dateRange.from).toISOString());
    if (dateRange.to) 
      params.append("to", endOfDay(dateRange.to).toISOString());
    return params.toString();
  }, [dateRange]);

  const {
    data: sales,
    error,
    isLoading,
  } = useSWR<ProductSale[]>(
    `/api/products/sold${queryString ? `?${queryString}` : ""}`,
  );

  // Derived State
  const filteredSales = useMemo(
    () =>
      sales?.filter((sale) =>
        sale.name.toLowerCase().includes(search.toLowerCase()),
      ) ?? [],
    [sales, search],
  );

  const totalRevenue = useMemo(
    () =>
      filteredSales.reduce(
        (sum, sale) => {
          const revenue = typeof sale.totalRevenue === 'string' 
            ? parseFloat(sale.totalRevenue) 
            : Number(sale.totalRevenue);
          return sum + (isNaN(revenue) ? 0 : revenue);
        },
        0,
      ),
    [filteredSales],
  );

  const chartData = useMemo(
    () =>
      filteredSales.map((sale) => {
        const revenue = typeof sale.totalRevenue === 'string' 
          ? parseFloat(sale.totalRevenue) 
          : Number(sale.totalRevenue);
        const value = isNaN(revenue) ? 0 : revenue;
        return {
          name: sale.name,
          value,
          percentage: totalRevenue > 0 
            ? ((value / totalRevenue) * 100).toFixed(1) 
            : "0.0"
        };
      }),
    [filteredSales, totalRevenue],
  );

  // Error State
  if (error) {
    return (
      <div className="text-center text-destructive p-4">
        Error loading sales data. Please try again later.
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-6">
      <h1 className="text-2xl md:text-3xl font-bold px-4 md:px-0">
        Products Sold
      </h1>

      {/* Stats Cards and Chart */}
      <div className="grid gap-3 px-4 md:gap-4 md:px-0 grid-cols-1 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {formatCurrency(totalRevenue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unique Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {filteredSales.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Distribution Chart */}
      <div className="px-4 md:px-0">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Revenue Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={chartData} />
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 px-4 md:px-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 w-full"
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full sm:w-[240px] justify-start text-left font-normal"
            >
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
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Table */}
      <div className="px-4 md:px-0">
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <LoadingSpinner />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="min-w-[150px]">Last Sale</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No products found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSales.map((sale) => (
                        <TableRow key={sale.productId}>
                          <TableCell className="font-medium">
                            {sale.name}
                          </TableCell>
                          <TableCell className="text-right">
                            {sale.totalQuantity}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(
                              typeof sale.totalRevenue === 'string'
                                ? parseFloat(sale.totalRevenue)
                                : Number(sale.totalRevenue)
                            )}
                          </TableCell>
                          <TableCell>
                            {format(new Date(sale.lastSaleDate), "LLL dd, y")}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
