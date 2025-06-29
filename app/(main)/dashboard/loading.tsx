import { Skeleton } from "@/components/ui/skeleton";

export default async function Loading() {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <Skeleton className="w-full h-48 rounded-xl" />
        <Skeleton className="w-full h-48 rounded-xl" />
        <Skeleton className="w-full h-48 rounded-xl" />
        <Skeleton className="w-full h-48 rounded-xl" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="w-full h-12 rounded" />
        <Skeleton className="w-full h-12 rounded" />
        <Skeleton className="w-full h-12 rounded" />
      </div>
    </div>
  );
}
