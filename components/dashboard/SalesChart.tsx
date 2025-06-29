"use client";
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const salesData = [
  { name: "Jan", sales: 4000, profit: 2400 },
  { name: "Feb", sales: 3000, profit: 1398 },
  { name: "Mar", sales: 5000, profit: 2800 },
  { name: "Apr", sales: 4500, profit: 3908 },
  { name: "May", sales: 6000, profit: 4800 },
  { name: "Jun", sales: 5500, profit: 3800 },
  { name: "Jul", sales: 6200, profit: 4300 },
  { name: "Aug", sales: 5800, profit: 3500 },
  { name: "Sep", sales: 7000, profit: 5000 },
  { name: "Oct", sales: 6500, profit: 4200 },
  { name: "Nov", sales: 7500, profit: 5500 },
  { name: "Dec", sales: 8000, profit: 6000 },
];

export default function SalesChart() {
  return (
    <Card className="xl:col-span-2">
      <CardHeader className="flex flex-row items-center">
        <div className="grid gap-2">
          <CardTitle>Sales Overview</CardTitle>
          <CardDescription>Monthly sales performance.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            sales: {
              label: "Sales",
              color: "var(--chart-1)",
            },
            profit: {
              label: "Profit",
              color: "var(--chart-2)",
            },
          }}
          className="h-[300px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={salesData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="sales"
                stroke="var(--color-sales)"
                name="Sales"
              />
              <Line
                type="monotone"
                dataKey="profit"
                stroke="var(--color-profit)"
                name="Profit"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
