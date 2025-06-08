import { getBusinessAction } from "@/actions/businesses";

export default async function DashboardPage() {
  const { data } = await getBusinessAction();

  return <div>{data?.name}</div>;
}
