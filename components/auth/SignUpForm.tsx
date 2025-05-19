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
  name: Yup.string().required("Name is required"),
  email: Yup.string().email("Invalid email").required("Email is required"),
  phone: Yup.string()
    .transform((value) => value.replace(/\D/g, ""))
    .matches(/^\d{10}$/, "Phone must be exactly 10 digits")
    .required("Phone is required"),
});

const initialValues: SignUpFormData = {
  name: "",
  email: "",
  phone: "",
};

const formFields: FormFieldProps[] = [
  {
    id: "name",
    name: "name",
    type: "text",
    label: "Full Name",
    autoComplete: "name",
  },
  {
    id: "email",
    name: "email",
    type: "email",
    label: "Email (@)",
    autoComplete: "email",
  },
  {
    id: "phone",
    name: "phone",
    type: "text",
    label: "Phone (+91)",
    autoComplete: "tel",
  },
  // {
  //   id: "password",
  //   name: "password",
  //   type: "password",
  //   label: "Password",
  //   autoComplete: "new-password",
  // },
  // {
  //   id: "confirmPassword",
  //   name: "confirmPassword",
  //   type: "password",
  //   label: "Confirm Password",
  //   autoComplete: "new-password",
  // },
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
        <Form className="flex flex-col space-y-4 bg-background p-5 rounded-lg border border-border min-w-sm m-2 shadow-md">
          <h2 className="text-2xl font-bold mb-4 ml-2">Sign Up</h2>
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

          <span className="ml-2 text-muted-foreground">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mr-1 accent-primary"
            />
            Agree with&nbsp;
            <Link
              href={`/terms-and-conditons`}
              className="text-primary hover:underline font-bold"
            >
              Terms & Conditions
            </Link>
          </span>

          <button
            type="submit"
            disabled={!agreed || isSubmitting}
            className="w-full py-2 px-4 bg-primary hover:bg-primary/80 text-primary-foreground font-semibold rounded focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-sm"
          >
            {isSubmitting ? "Signing up..." : "Sign Up"}
          </button>

          <span className="mx-auto text-muted-foreground">
            Already have an account?&nbsp;
            <Link
              href={`/login`}
              className="text-primary hover:underline font-bold"
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
          "peer w-full p-2 rounded focus:outline-none focus:ring-2 focus:ring-ring border",
          invalid ? "border-destructive" : "border-input"
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
          className="absolute right-0 border-l h-full border-input top-0 px-2 size-10 text-muted-foreground hover:text-foreground"
        />
      )}
    </div>
  );
};
