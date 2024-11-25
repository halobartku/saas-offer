import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Users, FileText, TrendingUp, Award, ArrowUp, ArrowDown, TrendingDown } from "lucide-react";
import { ChartContainer } from "@/components/ui/chart";
import { generateForecast } from "@/lib/forecasting";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, ComposedChart, Area
} from "recharts";
import { format, subMonths, isSameMonth } from "date-fns";
import useSWR from "swr";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { data: stats } = useSWR("/api/stats");
  
  const chartData = stats?.monthlyRevenue?.map((item: any) => {
    const date = new Date(item.month);
    const prevMonthData = stats?.monthlyRevenue?.find((d: any) => 
      isSameMonth(new Date(d.month), subMonths(date, 1))
    );
    const revenue = Number(item.revenue);
    const prevRevenue = prevMonthData ? Number(prevMonthData.revenue) : 0;
    const growth = prevRevenue ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;
    
    // Simple 3-month moving average for trend
    const movingAvg = stats?.monthlyRevenue
      ?.filter((d: any) => new Date(d.month) <= date)
      .slice(-3)
      .reduce((acc: number, curr: any) => acc + Number(curr.revenue), 0) / 3;

    return {
      name: format(date, 'MMM yyyy'),
      revenue,
      growth,
      trend: movingAvg || revenue,
      forecast: revenue * (1 + (growth / 100)) // Simple linear forecast
    };
  }) || [];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.products || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.clients || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Offers</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeOffers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total Value: €{Number(stats?.activeOffersTotal || 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{Number(stats?.monthlyRevenue?.[0]?.revenue || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              From closed and archived offers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bestselling Product</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.bestsellingProduct?.total_quantity || 0} units
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.bestsellingProduct?.name || 'No data'}
            </p>
            <p className="text-xs text-muted-foreground">
              Revenue: €{Number(stats?.bestsellingProduct?.total_revenue || 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Analysis</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {chartData.length > 0 && (
              <>
                <div className="text-2xl font-bold">
                  {chartData[chartData.length - 1].growth > 0 ? (
                    <span className="text-emerald-500 flex items-center gap-2">
                      <ArrowUp className="h-5 w-5" />
                      {chartData[chartData.length - 1].growth.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-red-500 flex items-center gap-2">
                      <ArrowDown className="h-5 w-5" />
                      {Math.abs(chartData[chartData.length - 1].growth).toFixed(1)}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Month-over-month revenue growth
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Forecast</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {chartData.length > 0 && (
              <>
                <div className="text-2xl font-bold">
                  €{Number(chartData[chartData.length - 1].forecast).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Projected next month revenue based on current growth trend
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="name"
                  stroke="currentColor"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="left"
                  stroke="currentColor"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `€${value}`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="currentColor"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-sm">
                        <div className="grid gap-2">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{data.name}</span>
                          </div>
                          <div className="grid gap-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">Revenue</span>
                              <span className="font-mono text-sm font-medium">
                                €{Number(data.revenue).toFixed(2)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">Growth</span>
                              <span className={cn(
                                "font-mono text-sm font-medium flex items-center gap-1",
                                data.growth > 0 ? "text-emerald-500" : "text-red-500"
                              )}>
                                {data.growth > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                {Math.abs(data.growth).toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">Forecast</span>
                              <span className="font-mono text-sm font-medium">
                                €{Number(data.forecast).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="revenue"
                  fill="currentColor"
                  radius={[4, 4, 0, 0]}
                  className="fill-primary"
                  name="Revenue"
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="trend"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={false}
                  name="Trend"
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="forecast"
                  stroke="#f43f5e"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  dot={false}
                  name="Forecast"
                />
                <Area
                  yAxisId="right"
                  dataKey="growth"
                  fill="#22c55e"
                  fillOpacity={0.1}
                  stroke="#22c55e"
                  name="Growth %"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
