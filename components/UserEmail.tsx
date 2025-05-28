import {
  sendNewEmailVerificationOTPAction,
  verifyNewEmailAction,
} from "@/actions/auth";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";
import {
  CheckCheckIcon,
  LoaderCircleIcon,
  PencilIcon,
  SaveIcon,
  XIcon,
} from "lucide-react";
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
import { InputOTP, InputOTPGroup, InputOTPSlot } from "./ui/input-otp";
import { getErrorMessage } from "@/utils/utils";
import { Badge } from "./ui/badge";

export default function UserEmail({ user }: { user: User }) {
  const [newEmail, setNewEmail] = useState<string>(user.email ?? "");
  const [open, setOpen] = useState<boolean>(false);
  const [otp, setOtp] = useState<string>("");
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [updating, startUpdating] = useTransition();
  const [verifying, startVerifying] = useTransition();
  const supabase = createSupabaseClient();

  const updateEmail = async () => {
    startUpdating(async () => {
      if (newEmail == user?.email) {
        toast.error("New email must be different !!", {
          style: { background: "#ef4444", color: "#fff" },
        });
        return;
      }
      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail);
      if (validEmail) {
        // send opt
        const { errorMessage } = await sendNewEmailVerificationOTPAction({
          email: newEmail,
        });
        if (errorMessage) {
          toast.error(getErrorMessage(errorMessage), {
            style: { background: "#ef4444", color: "#fff" },
          });
        } else {
          toast.success(`OTP sent to ${newEmail}`);
          setOtpSent(true);
        }
      } else {
        toast.error("Enter a valid email address !!", {
          style: { background: "#ef4444", color: "#fff" },
        });
      }
    });
  };

  const verify = async () => {
    console.log(otp);
    startVerifying(async () => {
      const { errorMessage } = await verifyNewEmailAction({
        email: newEmail,
        otp: otp,
      });
      if (errorMessage) {
        toast.error(errorMessage, {
          style: { background: "#ef4444", color: "#fff" },
        });
      } else {
        toast.success("Successfully changed email !!");
        setOtp("");
        setOpen(false);
      }
      await supabase.auth.refreshSession();
    });
  };

  return (
    <div className="flex items-center gap-2">
      <span>{user?.email || "N/A"}</span>
      {user?.user_metadata.email_verified ? (
        <Badge className="bg-green-600">
          <CheckCheckIcon />
          Verified
        </Badge>
      ) : (
        <Badge variant={"destructive"}>
          <XIcon />
          Unverified
        </Badge>
      )}
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
            <div className="flex flex-row justify-between items-center gap-4">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                disabled={otpSent}
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            {/* {otpSent && ( */}
            <div className="flex flex-row justify-between items-center gap-4">
              <Label>OTP</Label>
              <InputOTP
                disabled={!otpSent}
                value={otp}
                onChange={(otp) => setOtp(otp)}
                maxLength={6}
                pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    verify();
                  }
                }}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            {/* )} */}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button disabled={updating} variant={"destructive"}>
                Cancel
              </Button>
            </DialogClose>
            {otpSent ? (
              <Button disabled={updating || verifying} onClick={verify}>
                {verifying ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : (
                  <CheckCheckIcon />
                )}
                {updating ? "Verifying Email..." : "Verify Email"}
              </Button>
            ) : (
              <Button disabled={updating || verifying} onClick={updateEmail}>
                {updating ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : (
                  <SaveIcon />
                )}
                {updating ? "Saving Email..." : "Save Email"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
