import { getBusinessAction } from "@/actions/businesses";

export default async function BillsPage() {
  const { data } = await getBusinessAction();

  return <div>{data?.name}</div>;
}
