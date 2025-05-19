import { UploadIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  onChange: React.ChangeEventHandler<HTMLInputElement>;
}

export default function ImageUpload({ onChange }: ImageUploadProps) {
  return (
    <div className="relative flex flex-col items-center justify-center rounded-xl overflow-hidden outline-4 outline-zinc-700 outline-dashed">
      <input
        type="file"
        name="image"
        onChange={onChange}
        className={cn("bg-amber-300 w-full h-full absolute opacity-0")}
      />
      <UploadIcon className="size-16 m-4" />
      <span className="font-bold text-lg mx-4 mb-4">Upload Profile Image</span>
    </div>
  );
}
