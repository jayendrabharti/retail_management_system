import { updateUserAction } from "@/actions/auth";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { LoaderCircleIcon, PencilIcon, SaveIcon } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useState, useTransition } from "react";
import { createSupabaseClient } from "@/supabase/client";

export default function UserName({ user }: { user: User }) {
  const [newName, setNewName] = useState<string>(
    user.user_metadata.full_name ?? ""
  );
  const [open, setOpen] = useState<boolean>(false);
  const [updating, startUpdating] = useTransition();

  const updateName = async () => {
    startUpdating(async () => {
      if (newName) {
        const { errorMessage } = await updateUserAction({ full_name: newName });

        const supabase = createSupabaseClient();
        await supabase.auth.refreshSession();

        if (errorMessage) {
          toast.error("Unable to Update !!", {
            style: { background: "#ef4444", color: "#fff" },
          });
        } else {
          toast.success("Name updated successfully !!", {
            style: { background: "#22c55e", color: "#fff" },
          });
          setOpen(false);
        }
      } else {
        toast.error("You need to enter a name !!", {
          style: { background: "#ef4444", color: "#fff" },
        });
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <span>{user?.user_metadata?.full_name || "N/A"}</span>
      <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
        <DialogTrigger asChild>
          <Button variant={"outline"} size={"icon"} className="ml-auto">
            <PencilIcon />
          </Button>
          {/* <Button variant="outline">Edit Profile</Button> */}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>
              Make changes to your profile here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center gap-4">
              <Label htmlFor="name" className="ml-auto">
                Name
              </Label>
              <Input
                id="name"
                defaultValue={user.user_metadata.full_name ?? ""}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button disabled={updating} variant={"destructive"}>
                Cancel
              </Button>
            </DialogClose>
            <Button disabled={updating} onClick={updateName}>
              {updating ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <SaveIcon />
              )}
              {updating ? "Saving Name..." : "Save Name"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
