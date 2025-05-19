"use client";
import { FC, useRef, useState, useTransition } from "react";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useRouter, useSearchParams } from "next/navigation";
import { verifyOtpAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
interface VerifyPageProps {
  searchParams: { phone?: string };
}

const VerifyPage: FC<VerifyPageProps> = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone");
  const [otp, setOtp] = useState("");
  const [verifying, startVerifyingTransition] = useTransition();

  const verify = () => {
    if (!(phone && otp)) return;
    startVerifyingTransition(async () => {
      const { errorMessage } = await verifyOtpAction({ phone, otp });
      if (errorMessage) {
        alert(errorMessage);
        return;
      }
      alert("Verified!!");
      router.push(`/dashboard`);
    });
  };

  return (
    <div className="flex flex-col space-y-4 bg-background p-5 rounded-lg border border-border m-2 w-max">
      <h2 className="text-2xl font-bold mb-4 mx-auto">Verify Phone Number</h2>
      <span className="mx-auto text-muted-foreground">
        OTP has been sent to +{phone}
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
};

export default VerifyPage;
