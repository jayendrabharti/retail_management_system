"use client";
import { LoaderCircleIcon, Trash2Icon } from "lucide-react";
import { Button } from "../../ui/button";
import { toast } from "sonner";
import { useState, useTransition } from "react";
import { deleteCategoryAction } from "@/actions/categories";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

export default function DeleteCategory({ categoryId }: { categoryId: string }) {
  const [deleting, startDeleting] = useTransition();
  const [open, setOpen] = useState<boolean>(false);

  const handleDelete = async () => {
    startDeleting(async () => {
      try {
        await deleteCategoryAction(categoryId);
        toast.success("Category deleted successfully");
        setOpen(false);
      } catch (error) {
        toast.error("Failed to delete category");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="icon" disabled={deleting}>
          {deleting ? (
            <LoaderCircleIcon className="animate-spin" />
          ) : (
            <Trash2Icon />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you absolutely sure?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete your
            account and remove your data from our servers.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={deleting}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <LoaderCircleIcon className="animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2Icon />
                Delete
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
