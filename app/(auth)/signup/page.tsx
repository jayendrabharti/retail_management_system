"use client";
import SignUpForm from "@/components/auth/SignUpForm";
import { signUpAction, verifyPhoneOtpAction } from "@/actions/auth";
import { SignUpFormData } from "@/types/auth";
import { useState, useTransition } from "react";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useSession } from "@/providers/SessionProvider";
import { toast } from "sonner";

export default function SignUpPage() {
  const router = useRouter();
  const [optSent, setOptSent] = useState(false);
  const [verifying, startVerifyingTransition] = useTransition();
  const [otp, setOtp] = useState("");
  const [verificationInfo, setVerificationInfo] = useState({
    phone: "",
  });

  const { refreshSession } = useSession();

  const verify = () => {
    if (!(verificationInfo.phone && otp)) return;

    startVerifyingTransition(async () => {
      const { errorMessage } = await verifyPhoneOtpAction({
        phone: verificationInfo.phone,
        otp,
      });
      if (errorMessage) {
        toast.error(errorMessage, {
          style: { background: "#ef4444", color: "#fff" }, // Tailwind red-500
        });
        return;
      }

      toast.success("Verified!!", {
        style: { background: "#22c55e", color: "#fff" }, // Tailwind green-500
      });
      refreshSession();
      router.push(`/account_settings`);
    });
  };

  const SignUp = async (formData: SignUpFormData) => {
    const { errorMessage } = await signUpAction(formData);
    if (errorMessage) {
      alert(errorMessage);
      return;
    }
    setVerificationInfo({
      phone: formData.phone,
    });
    setOptSent(true);
  };

  if (optSent)
    return (
      <div className="flex flex-col space-y-4 bg-background p-5 rounded-lg border border-border m-2 w-max">
        <h2 className="text-2xl font-bold mb-4 mx-auto">Verify Phone Number</h2>
        <span className="mx-auto text-muted-foreground">
          OTP has been sent to {verificationInfo.phone}
        </span>

        <div className="w-max mx-auto">
          <InputOTP
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

        <Button onClick={verify} disabled={verifying}>
          {verifying ? "Verifying ..." : "Verify"}
        </Button>
      </div>
    );

  return <SignUpForm onSubmit={SignUp} />;
}
