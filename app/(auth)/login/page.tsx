"use client";
import { loginAction } from "@/actions/auth";
import LogInForm from "@/components/auth/LoginForm";
import { LogInFormData } from "@/types/auth";
import { useRouter } from "next/navigation";

export default function LogInPage() {
  const router = useRouter();
  return (
    <LogInForm
      onSubmit={async (formData: LogInFormData) => {
        const { phoneOrEmail } = formData;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailRegex.test(phoneOrEmail)) {
          const { errorMessage } = await loginAction({
            email: phoneOrEmail,
          });
          if (errorMessage) {
            alert(errorMessage);
            return;
          }
          router.push(`/verify?email=${phoneOrEmail}`);
        } else {
          const { errorMessage } = await loginAction({
            phone: `+91${phoneOrEmail}`,
          });
          if (errorMessage) {
            alert(errorMessage);
            return;
          }
          router.push(`/verify?phone=+91${phoneOrEmail}`);
        }
      }}
    />
  );
}
