"use client";
import SignUpForm from "@/components/auth/SignUpForm";
import { signUpAction } from "@/actions/auth";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const router = useRouter();

  return (
    <SignUpForm
      onSubmit={async (formData) => {
        const { errorMessage } = await signUpAction(formData);
        if (errorMessage) {
          alert(errorMessage);
          return;
        }
        router.push(`/verify?phone=${formData.phone}`);
      }}
    />
  );
}
