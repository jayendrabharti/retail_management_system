"use client";
import { useRef, useState, useTransition } from "react";
import { Separator } from "@/components/ui/separator";
import { User } from "@supabase/supabase-js";
import { Badge } from "@/components/ui/badge";
import { CheckCheckIcon, PencilIcon, LoaderCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  sendEmailVerificationOTPAction,
  updateUserAction,
  verifyEmailAction,
} from "@/actions/auth";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function UserDataForm({
  user,
  refreshSession,
}: {
  user?: User;
  refreshSession?: () => Promise<void>;
}) {
  const emailVerified = user?.email === user?.user_metadata?.email;

  // Name dialog state
  const [openNameDialog, setOpenNameDialog] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [nameProcessing, startNameProcessing] = useTransition();

  // Email dialog state
  const [openEmailDialog, setOpenEmailDialog] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [emailProcessing, startEmailProcessing] = useTransition();

  // OTP dialog state
  const [openOtpDialog, setOpenOtpDialog] = useState(false);
  const otpInputRef = useRef<HTMLInputElement>(null);
  const [otpProcessing, startOtpProcessing] = useTransition();

  // Verify email button state
  const [verifyProcessing, startVerifyProcessing] = useTransition();

  const updateName = async (newName: string) => {
    if (newName) {
      const { errorMessage } = await updateUserAction({ name: newName });

      if (errorMessage) {
        toast.error("Unable to Update !!", {
          style: { background: "#ef4444", color: "#fff" },
        });
      } else {
        toast.success("Name updated successfully !!", {
          style: { background: "#22c55e", color: "#fff" },
        });
        refreshSession?.();
      }
    }
  };

  const handleNameSave = () => {
    startNameProcessing(async () => {
      const newName = nameInputRef.current?.value;
      await updateName(newName || "");
      setOpenNameDialog(false);
    });
  };

  const handleEmailSave = () => {
    startEmailProcessing(async () => {
      const newEmail = emailInputRef.current?.value;
      if (newEmail) {
        const { errorMessage } = await updateUserAction({ email: newEmail });
        if (errorMessage) {
          toast.error("Unable to Verify !!", {
            style: { background: "#ef4444", color: "#fff" },
          });
        } else {
          toast.success("Verify Email to persist changes !!");
          refreshSession?.();
        }
      }
      setOpenEmailDialog(false);
    });
  };

  const verifyEmail = () => {
    startVerifyProcessing(async () => {
      try {
        const { errorMessage } = await sendEmailVerificationOTPAction();
        if (errorMessage) throw new Error(errorMessage);
        setOpenOtpDialog(true);
      } catch (error) {
        toast.error("Unable to send OTP !!", {
          style: { background: "#ef4444", color: "#fff" },
        });
      }
    });
  };

  const handleOtpVerify = () => {
    startOtpProcessing(async () => {
      const otp = otpInputRef.current?.value;
      if (otp) {
        const { errorMessage } = await verifyEmailAction({ otp });
        if (errorMessage) {
          toast.error("Unable to verify OTP !!", {
            style: { background: "#ef4444", color: "#fff" },
          });
        } else {
          toast.success("Email verified successfully !!", {
            description: "Changes will reflect in 4-5 minutes.",
            style: { background: "#22c55e", color: "#fff" },
          });
          refreshSession?.();
        }
      }
      setOpenOtpDialog(false);
    });
  };

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 space-y-4">
      <span className="text-2xl font-bold text-primary">User Data</span>
      <Separator className="my-4" />
      <div className="flex items-center gap-2">
        <strong className="text-muted-foreground">Name:</strong>
        <span>{user?.user_metadata?.name || "N/A"}</span>
        <Dialog open={openNameDialog} onOpenChange={setOpenNameDialog}>
          <DialogTrigger asChild>
            <Button size={"sm"}>
              <PencilIcon />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit profile</DialogTitle>
              <DialogDescription>
                Make changes to your profile here. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="Name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  defaultValue={user?.user_metadata?.name}
                  className="col-span-3"
                  ref={nameInputRef}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                onClick={handleNameSave}
                disabled={nameProcessing}
              >
                {nameProcessing ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : (
                  "Save changes"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex items-center gap-2">
        <strong className="text-muted-foreground">Email:</strong>
        <span>{user?.user_metadata.email || "N/A"}</span>
        {emailVerified ? (
          <Badge variant="outline" className="dark:bg-green-700 bg-green-500">
            <CheckCheckIcon />
            Verified
          </Badge>
        ) : (
          <Button
            variant="outline"
            size={"sm"}
            onClick={verifyEmail}
            disabled={verifyProcessing}
          >
            {verifyProcessing ? (
              <LoaderCircleIcon className="animate-spin" />
            ) : (
              <>
                <CheckCheckIcon />
                Verify
              </>
            )}
          </Button>
        )}
        <Dialog open={openEmailDialog} onOpenChange={setOpenEmailDialog}>
          <DialogTrigger asChild>
            <Button size={"sm"}>
              <PencilIcon />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Email</DialogTitle>
              <DialogDescription>
                Enter your new email address and save.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  defaultValue={user?.user_metadata?.email}
                  className="col-span-3"
                  ref={emailInputRef}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                onClick={handleEmailSave}
                disabled={emailProcessing}
              >
                {emailProcessing ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : (
                  "Save changes"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* OTP Dialog */}
        <Dialog open={openOtpDialog} onOpenChange={setOpenOtpDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Verify Email</DialogTitle>
              <DialogDescription>
                Enter the OTP sent to your email.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="otp" className="text-right">
                  OTP
                </Label>
                <Input id="otp" className="col-span-3" ref={otpInputRef} />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                onClick={handleOtpVerify}
                disabled={otpProcessing}
              >
                {otpProcessing ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : (
                  "Verify"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex items-center gap-2">
        <strong className="text-muted-foreground">Phone Number:</strong>
        <span>{user?.user_metadata.phone || "N/A"}</span>
        <Badge variant="outline" className="dark:bg-green-700 bg-green-500">
          <CheckCheckIcon />
          Verified
        </Badge>
      </div>
    </div>
  );
}
