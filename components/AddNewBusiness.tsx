import { Building2Icon, LoaderCircleIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "./ui/input";
import { useState, useTransition } from "react";
import { createBusinessAction } from "@/actions/businesses";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function AddNewBusiness({
  switchBusinessId,
}: {
  switchBusinessId: (args: { id: string }) => Promise<void>;
}) {
  const [open, setOpen] = useState<boolean>(false);
  const [newBusinessName, setNewBusinessName] = useState<string>("");
  const [adding, startAdding] = useTransition();
  const router = useRouter();

  const handleAddNewBusiness = async () => {
    startAdding(async () => {
      if (!newBusinessName) {
        toast.error("You must enter a Business.", {
          style: { background: "#ef4444", color: "#fff" },
        });
        return;
      }
      const { data, errorMessage } = await createBusinessAction({
        name: newBusinessName,
      });
      if (errorMessage) {
        toast.error(errorMessage, {
          style: { background: "#ef4444", color: "#fff" },
        });
        setOpen(false);
      }
      if (data?.id) {
        toast.success(`Created Business: ${data?.name}`, {
          style: { background: "#22c55e", color: "#fff" },
        });
        switchBusinessId({ id: data?.id });
        setOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Building2Icon className="h-4 w-4" />
          Add new business
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Business</DialogTitle>
          {/* <DialogDescription></DialogDescription> */}
        </DialogHeader>
        <div className="py-4">
          <Input
            id="name"
            defaultValue=""
            placeholder="Enter New Business Name"
            onChange={(e) => setNewBusinessName(e.target.value)}
            className=""
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant={"destructive"}>Cancel</Button>
          </DialogClose>
          <Button onClick={handleAddNewBusiness}>
            {adding ? (
              <LoaderCircleIcon className="animate-spin" />
            ) : (
              <PlusIcon />
            )}
            {adding ? "Creating Business..." : "Create Business"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
