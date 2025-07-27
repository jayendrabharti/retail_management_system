"use client";
import React, { useState } from "react";
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
import { SignUpFormData } from "@/types/auth";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import Link from "next/link";
// import LoginWithGoogle from "../LoginWithGoogle";

type FormFieldProps = {
  id: string;
  name: string;
  type: string;
  label: string;
  autoComplete?: string;
  errors?: FormikErrors<FormikValues>;
  touched?: FormikTouched<FormikValues>;
};

const SignUpSchema: Yup.Schema = Yup.object().shape({
  full_name: Yup.string().required("Name is required"),
  phone: Yup.string()
    .transform((value) => value.replace(/\D/g, ""))
    .matches(/^\d{10}$/, "Phone must be exactly 10 digits")
    .required("Phone is required"),
});

const initialValues: SignUpFormData = {
  full_name: "",
  phone: "",
};

const formFields: FormFieldProps[] = [
  {
    id: "full_name",
    name: "full_name",
    type: "text",
    label: "Full Name",
    autoComplete: "name",
  },
  {
    id: "phone",
    name: "phone",
    type: "text",
    label: "Phone (+91)",
    autoComplete: "tel",
  },
];

export default function SignUpForm({
  onSubmit,
}: {
  onSubmit: (values: SignUpFormData) => Promise<void>;
}) {
  const [agreed, setAgreed] = useState<boolean>(false);

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={SignUpSchema}
      onSubmit={async (values, { resetForm, setSubmitting }) => {
        values.phone = `+91${values.phone}`;
        await onSubmit(values);
        // resetForm();
        // setSubmitting(false);
      }}
    >
      {({ isSubmitting, errors, touched }) => (
        <Form className="bg-background border-border m-2 flex min-w-sm flex-col space-y-4 rounded-lg border p-5 shadow-md">
          <h2 className="mb-4 ml-2 text-2xl font-bold">Sign Up</h2>
          <span className="text-muted-foreground ml-2 text-sm">
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

          <span className="text-muted-foreground ml-2">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="accent-primary mr-1"
            />
            Agree with&nbsp;
            <Link
              href={`/terms-and-conditons`}
              className="text-primary font-bold hover:underline"
              prefetch={true}
            >
              Terms & Conditions
            </Link>
          </span>

          <button
            type="submit"
            disabled={!agreed || isSubmitting}
            className="bg-primary hover:bg-primary/80 text-primary-foreground focus:ring-ring w-full rounded px-4 py-2 text-sm font-semibold focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Signing up..." : "Sign Up"}
          </button>

          {/* <LoginWithGoogle type={"signup"} /> */}

          <span className="text-muted-foreground mx-auto">
            Already have an account?&nbsp;
            <Link
              href={`/login`}
              className="text-primary font-bold hover:underline"
              prefetch={true}
            >
              Login
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
          "peer focus:ring-ring w-full rounded border p-2 focus:ring-2 focus:outline-none",
          invalid ? "border-destructive" : "border-input",
        )}
      />
      <label
        htmlFor={id}
        className={cn(
          "absolute left-3 -translate-y-1/2 cursor-text peer-placeholder-shown:top-1/2 peer-focus:top-0",
          invalid
            ? "text-destructive"
            : "text-muted-foreground peer-focus:text-foreground",
          "transition-all duration-300",
          "bg-background px-1",
          "text-sm font-bold peer-focus:text-lg",
        )}
      >
        {label}
      </label>
      <ErrorMessage
        name={name}
        component="div"
        className="text-destructive absolute top-full right-2 text-xs"
      />
      {type === "password" && (
        <PasswordIcon
          onClick={(e) => {
            setpasswordVisible((prev) => !prev);
            e.preventDefault();
            e.stopPropagation();
          }}
          className="border-input text-muted-foreground hover:text-foreground absolute top-0 right-0 size-10 h-full border-l px-2"
        />
      )}
    </div>
  );
};
