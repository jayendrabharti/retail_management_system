import { LoaderCircleIcon } from "lucide-react";

export default function Loading() {
  return (
    <div className="w-full h-dvh flex items-center justify-center flex-col gap-4">
      <LoaderCircleIcon className="size-20 animate-spin" />
    </div>
  );
}
