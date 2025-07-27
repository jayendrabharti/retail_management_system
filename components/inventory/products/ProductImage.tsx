import { Button } from "@/components/ui/button";
import { cn, convertBlobUrlToFile } from "@/lib/utils";
import { LoaderCircle, PencilIcon, UploadIcon, XIcon } from "lucide-react";
import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { uploadImage } from "@/supabase/storage";
import { toast } from "sonner";

async function getCroppedImg(
  image: HTMLImageElement,
  crop: PixelCrop,
): Promise<string> {
  const canvas = document.createElement("canvas");
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2d context");

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    crop.width,
    crop.height,
  );

  return new Promise<string>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        resolve(url);
      } else {
        reject(new Error("Canvas is empty"));
      }
    }, "image/png");
  });
}

export default function ProductImage({
  imageUrl,
  setImageUrl,
  className = "",
  isNew = false,
}: {
  imageUrl?: string;
  setImageUrl?: (url: string) => void;
  className?: string;
  isNew?: boolean;
}) {
  const [isUploading, startUploading] = useTransition();
  const [currentImageUrl, setCurrentImageUrl] = useState<string>(
    imageUrl || "",
  );
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop | undefined>(undefined);
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const handleOnImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSrc(URL.createObjectURL(file));
      setCrop(undefined);
      setCompletedCrop(null);
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    imgRef.current = e.currentTarget;
  };

  const handleUpload = () => {
    startUploading(async () => {
      if (!completedCrop) {
        toast.error("Crop the image to upload!", {
          style: { background: "#ef4444", color: "#fff" },
        });
        return;
      }
      if (imgRef.current && completedCrop) {
        try {
          const url = await getCroppedImg(imgRef.current, completedCrop);
          const imageFile = await convertBlobUrlToFile(url);
          const { imageUrl: uploadedImageUrl, error } = await uploadImage({
            file: imageFile,
            bucket: "images",
            folder: "product-images",
          });
          if (error) {
            toast.error(error);
            return;
          }

          // Update the image URL using the provided setter
          if (setImageUrl && uploadedImageUrl) {
            setImageUrl(uploadedImageUrl);
          }
          setCurrentImageUrl(uploadedImageUrl || "");

          toast.success("Image uploaded successfully!", {
            style: { background: "#22c55e", color: "#fff" },
          });
          setSrc(null);
        } catch (error) {
          toast.error("Failed to upload image");
          console.error("Upload error:", error);
        }
      }
    });
  };

  const handleCancel = () => {
    setSrc(null);
    setCrop(undefined);
    setCompletedCrop(null);
  };

  const handleRemoveImage = () => {
    setCurrentImageUrl("");
    if (setImageUrl) {
      setImageUrl("");
    }
  };

  return (
    <div className={cn("relative", className)}>
      {!currentImageUrl && src ? (
        // Cropping mode
        <div className="flex flex-col items-center gap-2">
          <span className="text-muted-foreground text-sm">
            (Crop and Upload)
          </span>
          <ReactCrop
            crop={crop}
            onChange={setCrop}
            onComplete={setCompletedCrop}
            aspect={1}
          >
            <Image
              ref={imgRef}
              src={src}
              alt="product-image-cropper"
              width={1000}
              height={1000}
              onLoad={onImageLoad}
              style={{ maxWidth: "100%" }}
            />
          </ReactCrop>
          <div className="flex flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleUpload}
              disabled={isUploading}
            >
              {isUploading ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <UploadIcon />
              )}
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
            <Button variant="destructive" onClick={handleCancel}>
              <XIcon />
              Cancel
            </Button>
          </div>
        </div>
      ) : currentImageUrl ? (
        // Display uploaded image
        <div className="flex flex-col items-center gap-2">
          <div className="relative aspect-square w-full overflow-hidden rounded-lg">
            <Image
              src={currentImageUrl}
              alt="product-image"
              fill
              className="object-cover"
            />
          </div>
          <div className="flex w-full gap-2">
            <Button
              variant="outline"
              onClick={handleRemoveImage}
              className="flex-1"
            >
              <PencilIcon />
              Change
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveImage}
              className="flex-1"
            >
              <XIcon />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        // Upload input
        <div className="relative w-full">
          <input
            type="file"
            name="image"
            id="image"
            accept="image/*"
            onChange={handleOnImageChange}
            className="absolute inset-0 z-10 cursor-pointer opacity-0"
          />
          <div className="bg-secondary text-muted-foreground border-muted-foreground flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-4 border-dashed p-4 py-8">
            <UploadIcon className="size-20 max-w-full" />
            <span className="text-lg font-bold">Upload Image</span>
            <span className="text-sm">Click to select an image</span>
          </div>
        </div>
      )}
    </div>
  );
}
