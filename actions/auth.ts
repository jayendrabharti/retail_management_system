"use server";

import { createSupabaseClient, getUser } from "../supabase/server";
import { getErrorMessage } from "@/utils/utils";
import { SignUpFormData } from "@/types/auth";
import nodemailer from "nodemailer";
import { createSupabaseAdminClient } from "@/supabase/admin";
type LogInData = { email: string } | { phone: string };

export const signUpAction = async (formData: SignUpFormData) => {
  try {
    const { auth } = await createSupabaseClient();

    const { data, error } = await auth.signInWithOtp({
      phone: formData.phone,
      options: {
        channel: "sms",
        shouldCreateUser: true,
        data: {
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
        },
      },
    });
    if (error) {
      console.log(error);
      throw error;
    }

    return { data: data, errorMessage: null };
  } catch (error) {
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

export const verifyPhoneOtpAction = async (formData: {
  phone: string;
  otp: string;
}) => {
  try {
    const { auth } = await createSupabaseClient();

    const { data, error } = await auth.verifyOtp({
      phone: formData.phone,
      token: formData.otp,
      type: "sms",
    });

    if (error) throw error;

    return { data: data, errorMessage: null };
  } catch (error) {
    return { errorMessage: getErrorMessage(error) };
  }
};

export const verifyEmailOtpAction = async (formData: {
  email: string;
  otp: string;
}) => {
  try {
    const { auth } = await createSupabaseClient();

    const { data, error } = await auth.verifyOtp({
      email: formData.email,
      token: formData.otp,
      type: "email",
    });

    if (error) throw error;

    return { data: data, errorMessage: null };
  } catch (error) {
    return { errorMessage: getErrorMessage(error) };
  }
};

export const loginAction = async (formData: LogInData) => {
  try {
    const { auth } = await createSupabaseClient();

    const { data, error } = await auth.signInWithOtp({
      ...formData,
      options: {
        shouldCreateUser: false,
      },
    });

    if (error) throw error;

    return { data: data, errorMessage: null };
  } catch (error) {
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

export const signOutAction = async () => {
  try {
    const { auth } = await createSupabaseClient();

    const { error } = await auth.signOut();

    if (error) throw error;
    return { data: null, errorMessage: null };
  } catch (error) {
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

export const updateUserAction = async (data: unknown) => {
  try {
    const { auth } = await createSupabaseClient();

    const { data: userData, error } = await auth.updateUser({
      data: data!,
    });

    if (error) throw error;
    return { data: userData, errorMessage: null };
  } catch (error) {
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

export const sendEmailVerificationOTPAction = async () => {
  const supabaseAdmin = await createSupabaseAdminClient();
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  const user = await getUser();
  const email = user?.user_metadata?.email;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: "Your Verification OTP",
      text: `Your OTP is: ${otp}`,
    };

    await transporter.sendMail(mailOptions);

    const { error } = await supabaseAdmin.auth.updateUser({
      data: { email_otp: otp },
    });
    if (error) throw error;

    return { data: "Email sent", errorMessage: null };
  } catch (error) {
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

export const verifyEmailAction = async (formData: { otp: string }) => {
  const supabaseAdmin = await createSupabaseAdminClient();
  const user = await getUser();
  const email = user?.user_metadata?.email;
  const otp = user?.user_metadata?.email_otp;
  try {
    if (formData.otp !== otp) {
      throw new Error("Invalid OTP");
    }

    const { error } = await supabaseAdmin.auth.updateUser({
      data: { email_verified: true },
    });
    if (user) {
      const { error: error2 } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        {
          email: email,
          email_confirm: true,
        }
      );
      if (error2) throw error2;
    }

    if (error) throw error;
    if (email.includes("@gmail.com")) {
      await supabaseAdmin.auth.linkIdentity({ provider: "google" });
    }
    return { data: "Email verified", errorMessage: null };
  } catch (error) {
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};
