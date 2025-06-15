import { getBusinessAction } from "@/actions/businesses";
import AnimatedText from "@/lib/AnimatedText";

export default async function DashboardPage() {
  const { data } = await getBusinessAction();

  if (!data) return;

  return (
    <div>
      <AnimatedText text={data?.name} type={"element"} />
    </div>
  );
}
