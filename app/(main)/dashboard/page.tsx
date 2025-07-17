import { getBusinessAction } from "@/actions/businesses";
import BillsTable from "@/components/dashboard/BillsTable";
import { DashboardCards } from "@/components/dashboard/DashboardCards";
import SalesChart from "@/components/dashboard/SalesChart";
import { notFound, redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function DashboardPage() {
  const { data: business, errorMessage } = await getBusinessAction();

  if (errorMessage) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Dashboard Error</CardTitle>
            <CardDescription>
              There was an error loading your dashboard data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">{errorMessage}</p>
            <div className="flex gap-2">
              <Button asChild size="sm">
                <Link href="/businesses">Manage Businesses</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard">Retry</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!business) {
    return notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      <DashboardCards />
      <div className="grid max-w-full gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <SalesChart />
        <BillsTable />
      </div>
    </div>
  );
}
