import { UploadIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  className?: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  uploading?: boolean;
}

export default function ImageUpload({
  className,
  onChange,
  uploading,
}: ImageUploadProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded-xl overflow-hidden outline-4 outline-[--border] outline-dashed",
        className
      )}
    >
      <input
        type="file"
        name="image"
        onChange={onChange}
        className={cn("w-full h-full absolute opacity-0")}
      />
      <UploadIcon className="size-16 m-4 text-[--muted-foreground]" />
      <span className="font-bold text-lg mx-4 mb-4 text-[--foreground]">
        Upload Profile Image
      </span>
    </div>
  );
}
