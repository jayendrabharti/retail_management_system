"use client";
import { formatTimestamp } from "@/utils/utils";
import { Businesses } from "@prisma/client";
import { Button } from "./ui/button";
import { Loader2Icon, PencilIcon, Trash2Icon } from "lucide-react";
import { Separator } from "./ui/separator";
import { useTransition } from "react";
import { useCurrentBusiness } from "@/providers/BusinessProvider";
import { Badge } from "./ui/badge";

export default function BusinessCard({ business }: { business: Businesses }) {
  const { businessId, switchBusinessId, deleteBusiness, updateBusiness } =
    useCurrentBusiness();

  const [deleting, startDeleting] = useTransition();
  const [upadating, startUpdating] = useTransition();
  const [switching, startSwitching] = useTransition();

  const deleteThisBusiness = async () => {
    startDeleting(async () => {
      await deleteBusiness({ id: business.id });
    });
  };

  const updateThisBusiness = async () => {
    startUpdating(async () => {
      const newName = prompt(`Enter new name for ${business.name}.`);
      if (!newName) return;
      await updateBusiness({ id: business.id, name: newName });
    });
  };

  const switchingBusiness = async () => {
    startSwitching(async () => {
      await switchBusinessId({ id: business.id });
    });
  };

  return (
    <div className="bg-card rounded-lg shadow-md p-6 flex flex-col hover:shadow-lg transition-shadow border border-border">
      <div className="flex flex-row w-full items-center space-x-1">
        <span className="text-lg font-semibold mb-2">{business.name}</span>
        <Button
          variant={"outline"}
          size={"icon"}
          className="ml-auto"
          onClick={updateThisBusiness}
        >
          {upadating ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            <PencilIcon />
          )}
        </Button>
        <Button
          variant={"destructive"}
          size={"icon"}
          onClick={deleteThisBusiness}
        >
          {deleting ? <Loader2Icon className="animate-spin" /> : <Trash2Icon />}
        </Button>
      </div>
      <Separator className="my-1" />
      <span className="text-xs text-zinc-400">
        Created: {formatTimestamp(business.createdAt)}
      </span>
      <span className="text-xs text-zinc-400">
        Updated: {formatTimestamp(business.updatedAt)}
      </span>
      <Separator className="mt-1" />
      <div className="w-full flex mt-2 flex-row justify-end items-center">
        {businessId == business.id ? (
          <Badge>Current</Badge>
        ) : (
          <Button
            variant={"outline"}
            className="w-full"
            onClick={switchingBusiness}
          >
            {switching && <Loader2Icon className="animate-spin" />}
            Set Current Business
          </Button>
        )}
      </div>
    </div>
  );
}
