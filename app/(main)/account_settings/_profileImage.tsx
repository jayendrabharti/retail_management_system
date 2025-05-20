"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { LoaderCircle, PencilIcon, UploadIcon, XIcon } from "lucide-react";
import { User } from "@supabase/supabase-js";

import ImageUpload from "@/components/ImageUpload";
import { Button } from "@/components/ui/button";
import { convertBlobUrlToFile } from "@/lib/utils";
import { uploadImage } from "@/supabase/storage";
import { updateUserAction } from "@/actions/auth";
import { toast } from "sonner";

async function getCroppedImg(
  image: HTMLImageElement,
  crop: PixelCrop
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
    crop.height
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

export default function ProfileImage({
  user,
  refreshSession,
}: {
  user?: User | null;
  refreshSession?: () => Promise<void>;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(
    user?.user_metadata.image || null
  );
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop | undefined>(undefined);
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [uploading, startUploading] = useTransition();
  const imgRef = useRef<HTMLImageElement | null>(null);

  const handleOnImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSrc(URL.createObjectURL(file));
      setCrop(undefined);
      setCompletedCrop(null);
      setImageUrl(null);
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    imgRef.current = e.currentTarget;
  };

  const handleUpload = () => {
    startUploading(async () => {
      if (!completedCrop) {
        toast.error("Crop the image too upload!!", {
          style: { background: "#ef4444", color: "#fff" }, // Tailwind red-500
        });
      }
      if (imgRef.current && completedCrop) {
        const url = await getCroppedImg(imgRef.current, completedCrop);
        const imageFile = await convertBlobUrlToFile(url);
        const { imageUrl, error } = await uploadImage({
          file: imageFile,
          bucket: "avatars",
        });
        if (error) {
          alert(error);
          return;
        }
        await updateUserAction({ image: imageUrl });
        setImageUrl(imageUrl);
        toast.success("Updated Profile Image successfully !!", {
          style: { background: "#22c55e", color: "#fff" }, // Tailwind green-500
        });
        setSrc(null);
        refreshSession?.();
      }
    });
  };

  return (
    <div className="flex flex-col">
      <div className="mx-auto">
        {!imageUrl && src ? (
          <div className="flex flex-col items-center gap-2">
            <span>(Crop and Upload)</span>
            <ReactCrop
              crop={crop}
              onChange={setCrop}
              onComplete={setCompletedCrop}
              aspect={1}
              circularCrop
            >
              <Image
                ref={imgRef}
                src={src}
                alt="profile-image-cropper"
                width={300}
                height={300}
                onLoad={onImageLoad}
                style={{ maxWidth: "100%" }}
              />
            </ReactCrop>
            <div className="flex gap-2 flex-row">
              <Button variant="outline" onClick={handleUpload}>
                {uploading ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <UploadIcon />
                )}
                {uploading ? "Uploading..." : "Upload"}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setSrc(null);
                  setImageUrl(user?.user_metadata.image || null);
                }}
              >
                <XIcon />
                Cancel
              </Button>
            </div>
          </div>
        ) : imageUrl ? (
          <>
            <div className="relative size-54 rounded-2xl overflow-hidden flex flex-col items-center justify-center">
              <Image
                src={imageUrl}
                alt="profile-image"
                width={500}
                height={500}
              />
            </div>
            <Button
              variant={"outline"}
              onClick={() => setImageUrl(null)}
              className="mx-auto mt-2 w-full"
            >
              <PencilIcon />
              Update
            </Button>
          </>
        ) : (
          <>
            <ImageUpload
              onChange={handleOnImageChange}
              className="bg-card max-w-xs aspect-square"
            />
            <Button
              variant="destructive"
              onClick={() => setImageUrl(user?.user_metadata.image || null)}
              disabled={!user?.user_metadata.image}
              className="mx-auto mt-2 w-full"
            >
              <XIcon />
              Cancel
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
