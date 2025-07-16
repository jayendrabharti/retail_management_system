"use server";

import { createSupabaseClient, getUser } from "../supabase/server";
import { getErrorMessage } from "@/utils/utils";
import { SignUpFormData } from "@/types/auth";
import nodemailer from "nodemailer";
import { createSupabaseAdminClient } from "@/supabase/admin";
import prisma from "@/prisma/client";
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

    if (data.user?.id) {
      const userExists = await prisma.user.count({
        where: {
          userId: data.user.id,
        },
      });
      if (!userExists) {
        await prisma.user.create({
          data: {
            userId: data.user.id,
            phone: formData.phone,
            fullName: data.user.user_metadata?.full_name || "",
            role: "BUSINESS_OWNER",
            lastLogIn: new Date(),
          },
        });
      } else {
        await prisma.user.update({
          where: {
            userId: data.user.id,
          },
          data: {
            lastLogIn: new Date(),
          },
        });
      }
    } else {
      throw new Error("User not found or not created");
    }

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
    console.log(error);
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

export const sendNewEmailVerificationOTPAction = async (data: {
  email: string;
}) => {
  const supabaseAdmin = await createSupabaseAdminClient();
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  const { email } = data;
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

export const verifyNewEmailAction = async (formData: {
  email: string;
  otp: string;
}) => {
  const supabaseAdmin = await createSupabaseAdminClient();
  const user = await getUser();
  const { email } = formData;
  const otp = user?.user_metadata?.email_otp;
  try {
    if (formData.otp !== otp) {
      throw new Error("Invalid OTP");
    }

    if (user) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        email: email,
        user_metadata: {
          email: email,
          email_verified: true,
        },
      });
      if (error) throw error;
    }

    if (email.includes("@gmail.com")) {
      await supabaseAdmin.auth.linkIdentity({ provider: "google" });
    }
    return { data: "Email verified", errorMessage: null };
  } catch (error) {
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};
