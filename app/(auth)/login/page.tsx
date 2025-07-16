"use client";
import {
  loginAction,
  verifyEmailOtpAction,
  verifyPhoneOtpAction,
} from "@/actions/auth";
import LogInForm from "@/components/auth/LoginForm";
import { LogInFormData } from "@/types/auth";
import { useState, useTransition } from "react";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSession } from "@/providers/SessionProvider";

export default function LogInPage() {
  const router = useRouter();
  const [optSent, setOptSent] = useState(false);
  const [verifying, startVerifyingTransition] = useTransition();
  const [otp, setOtp] = useState("");
  const [verificationInfo, setVerificationInfo] = useState({
    method: "phone",
    phone: "",
    email: "",
  });

  const { refreshSession } = useSession();

  const verify = () => {
    if (!((verificationInfo.phone || verificationInfo.email) && otp)) return;

    startVerifyingTransition(async () => {
      if (verificationInfo.method === "email") {
        const { errorMessage } = await verifyEmailOtpAction({
          email: verificationInfo.email,
          otp,
        });
        if (errorMessage) {
          toast.error(errorMessage, {
            style: { background: "#ef4444", color: "#fff" }, // Tailwind red-500
          });
          return;
        }
      } else {
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
      }
      refreshSession();
      router.push(`/dashboard`);
      toast.success("Verified!!", {
        style: { background: "#22c55e", color: "#fff" }, // Tailwind green-500
      });
    });
  };

  const LogIn = async (formData: LogInFormData) => {
    const { phoneOrEmail } = formData;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(phoneOrEmail)) {
      const { errorMessage } = await loginAction({
        email: phoneOrEmail,
      });
      if (errorMessage) {
        toast.error("User not Found !!", {
          description: "You need to Sign Up first.",
          action: {
            label: "Sign Up",
            onClick: () => router.push("/signup"),
          },
        });
        return;
      }
      setVerificationInfo({
        method: "email",
        phone: "",
        email: phoneOrEmail,
      });
      setOptSent(true);
    } else {
      const { errorMessage } = await loginAction({
        phone: `+91${phoneOrEmail}`,
      });

      if (errorMessage) {
        toast.error("User not Found !!", {
          description: "You need to Sign Up first.",
          action: {
            label: "Sign Up",
            onClick: () => router.push("/signup"),
          },
        });
        return;
      }
      setVerificationInfo({
        method: "phone",
        phone: `+91${phoneOrEmail}`,
        email: "",
      });
      setOptSent(true);
    }
  };

  if (optSent)
    return (
      <div className="flex flex-col space-y-4 bg-background p-5 rounded-lg border border-border m-2 w-max">
        <h2 className="text-2xl font-bold mb-4 mx-auto">Verify Phone Number</h2>
        <span className="mx-auto text-muted-foreground">
          OTP has been sent to{" "}
          {verificationInfo.method == "phone"
            ? verificationInfo.phone
            : verificationInfo.email}
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

  return <LogInForm onSubmit={LogIn} />;
}
