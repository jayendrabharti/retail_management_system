import { getBusinessAction } from "@/actions/businesses";
import BillsTable from "@/components/dashboard/BillsTable";
import { DashboardCards } from "@/components/dashboard/DashboardCards";
import SalesChart from "@/components/dashboard/SalesChart";
import { notFound } from "next/navigation";

export default async function DashboardPage() {
  const { data } = await getBusinessAction();
  if (!data) return notFound();

  return (
    <div className="flex flex-col gap-4">
      <DashboardCards />
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3 max-w-full">
        <SalesChart />
        <BillsTable />
      </div>
    </div>
  );
}
