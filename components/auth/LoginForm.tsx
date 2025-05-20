"use client";
import React, { useState, useTransition } from "react";
import {
  Formik,
  Form,
  Field,
  ErrorMessage,
  FormikTouched,
  FormikErrors,
  FormikValues,
} from "formik";
import * as Yup from "yup";
import { cn } from "@/lib/utils";
import { EyeIcon, EyeOffIcon, Loader2Icon } from "lucide-react";
import { LogInFormData } from "@/types/auth";
import { FcGoogle } from "react-icons/fc";
import Link from "next/link";
import { Button } from "../ui/button";
import { createSupabaseClient } from "@/supabase/client";

type FormFieldProps = {
  id: string;
  name: string;
  type: string;
  label: string;
  autoComplete?: string;
  errors?: FormikErrors<FormikValues>;
  touched?: FormikTouched<FormikValues>;
};

const SignUpSchema: Yup.ObjectSchema<LogInFormData> = Yup.object().shape({
  phoneOrEmail: Yup.string()
    .required("Phone or email is required")
    .test(
      "phone-or-email",
      "Enter a valid email or 10 digit phone number",
      (value) => {
        if (!value) return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^\d{10}$/;
        return emailRegex.test(value) || phoneRegex.test(value);
      }
    ),
});

const initialValues: LogInFormData = {
  phoneOrEmail: "",
};

const formFields: FormFieldProps[] = [
  {
    id: "phoneOrEmail",
    name: "phoneOrEmail",
    type: "text",
    label: "Enter your Phone / E-mail",
    autoComplete: "username email",
  },
];

export default function LogInForm({
  onSubmit,
}: {
  onSubmit: (values: LogInFormData) => Promise<void>;
}) {
  const [logginInWithGoogle, startLogginInWithGoogle] = useTransition();
  const loginWithGoogle = () => {
    startLogginInWithGoogle(async () => {
      const supabase = createSupabaseClient();
      await supabase.auth.signInWithOAuth({
        provider: "google",
      });
    });
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={SignUpSchema}
      onSubmit={async (values, { resetForm, setSubmitting }) => {
        await onSubmit(values);
        // resetForm();
        // setSubmitting(false);
      }}
    >
      {({ isSubmitting, errors, touched }) => (
        <Form className="flex flex-col space-y-4 bg-background p-5 rounded-lg border border-border min-w-sm m-2">
          <h2 className="text-2xl font-bold mb-4 ml-2">Log In</h2>
          <span className="text-sm ml-2 text-muted-foreground">
            Enter your email below to login to your account
          </span>

          {formFields.map((field) => (
            <FormField
              key={field.id}
              id={field.id}
              name={field.name}
              type={field.type}
              label={field.label}
              autoComplete={field.autoComplete}
              errors={errors}
              touched={touched}
            />
          ))}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2 px-4 bg-primary hover:bg-primary/80 text-primary-foreground font-semibold rounded focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:bg-muted text-sm"
          >
            {isSubmitting ? "Logging in..." : "Log In"}
          </button>

          <Button
            type="button"
            disabled={logginInWithGoogle}
            onClick={loginWithGoogle}
            variant="outline"
            className="w-full"
          >
            {logginInWithGoogle ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <FcGoogle />
            )}
            {logginInWithGoogle
              ? "Logging in with Google"
              : "Login with Google"}
          </Button>

          <span className="mx-auto text-muted-foreground">
            Don't have an account?&nbsp;
            <Link
              href={`/signup`}
              className="text-primary hover:underline font-bold"
            >
              Sign Up
            </Link>
          </span>
        </Form>
      )}
    </Formik>
  );
}

const FormField: React.FC<FormFieldProps> = ({
  id,
  name,
  type,
  label,
  autoComplete,
  errors,
  touched,
}) => {
  const invalid =
    (errors?.[name] && touched?.[name]) ||
    (() => {
      const [parent, child] = name.split(".");
      const parentErrors = errors?.[parent] as
        | FormikErrors<FormikValues>
        | undefined;
      const parentTouched = touched?.[parent] as
        | FormikTouched<FormikValues>
        | undefined;
      return (
        parentErrors &&
        parentTouched &&
        typeof parentErrors === "object" &&
        typeof parentTouched === "object" &&
        parentErrors[child] &&
        parentTouched[child]
      );
    })();

  const [passwordVisible, setpasswordVisible] = useState<boolean>(false);
  const PasswordIcon = passwordVisible ? EyeIcon : EyeOffIcon;

  return (
    <div className="relative mb-6">
      <Field
        id={id}
        name={name}
        type={type === "password" && passwordVisible ? "text" : type}
        autoComplete={autoComplete}
        placeholder=""
        className={cn(
          "peer w-full p-2 rounded focus:outline-none focus:ring-2 focus:ring-ring border",
          invalid ? "border-destructive" : "border-border"
        )}
      />
      <label
        htmlFor={id}
        className={cn(
          "absolute -translate-y-1/2 left-3 peer-focus:top-0 peer-placeholder-shown:top-1/2 cursor-text",
          invalid
            ? "text-destructive"
            : "text-muted-foreground peer-focus:text-foreground",
          "transition-all duration-300",
          "bg-background px-1",
          "font-bold text-sm peer-focus:text-lg"
        )}
      >
        {label}
      </label>
      <ErrorMessage
        name={name}
        component="div"
        className="text-destructive text-xs absolute top-full right-2"
      />
      {type === "password" && (
        <PasswordIcon
          onClick={(e) => {
            setpasswordVisible((prev) => !prev);
            e.preventDefault();
            e.stopPropagation();
          }}
          className="absolute right-0 border-l h-full border-border top-0 px-2 size-10 text-muted-foreground hover:text-foreground"
        />
      )}
    </div>
  );
};
