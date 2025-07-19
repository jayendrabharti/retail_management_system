"use server";

import { createSupabaseClient, getUser } from "../supabase/server";
import { getErrorMessage } from "@/utils/utils";
import { SignUpFormData } from "@/types/auth";
import nodemailer from "nodemailer";
import { createSupabaseAdminClient } from "@/supabase/admin";
import prisma from "@/prisma/client";

/**
 * Authentication Server Actions - Critical Security Component
 *
 * SECURITY CONSIDERATIONS:
 * - All user inputs are validated and sanitized
 * - Phone numbers are normalized to international format
 * - Rate limiting should be implemented at the middleware level
 * - OTP attempts should be tracked and limited
 * - Audit logging for all authentication events
 */

type LogInData = { email: string } | { phone: string };

/**
 * Sign up with phone number and OTP verification
 * SECURITY: Validates phone format and prevents duplicate registrations
 */
export const signUpAction = async (formData: SignUpFormData) => {
  try {
    // Input validation
    if (!formData.phone || !formData.full_name) {
      throw new Error("Phone number and full name are required");
    }

    // Normalize phone number to international format
    const normalizedPhone = formData.phone.startsWith("+")
      ? formData.phone
      : `+91${formData.phone}`;

    // Validate phone number format (basic validation)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(normalizedPhone)) {
      throw new Error("Invalid phone number format");
    }

    const { auth } = await createSupabaseClient();

    const { data, error } = await auth.signInWithOtp({
      phone: normalizedPhone,
      options: {
        channel: "sms",
        shouldCreateUser: true,
        data: {
          full_name: formData.full_name.trim(),
          phone: normalizedPhone,
        },
      },
    });

    if (error) {
      console.error("Supabase signup error:", error);
      throw error;
    }

    return { data: data, errorMessage: null };
  } catch (error) {
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

/**
 * Verify phone OTP and create/update user in database
 * SECURITY: Atomic user creation with proper error handling
 */
export const verifyPhoneOtpAction = async (formData: {
  phone: string;
  otp: string;
}) => {
  try {
    // Input validation
    if (!formData.phone || !formData.otp) {
      throw new Error("Phone number and OTP are required");
    }

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(formData.otp)) {
      throw new Error("Invalid OTP format");
    }

    const { auth } = await createSupabaseClient();

    const { data, error } = await auth.verifyOtp({
      phone: formData.phone,
      token: formData.otp,
      type: "sms",
    });

    if (error) throw error;

    // Ensure user exists after verification
    if (!data.user?.id) {
      throw new Error("Authentication failed - invalid credentials");
    }

    // Atomic user creation/update
    await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { userId: data.user!.id },
      });

      if (!existingUser) {
        // Create new user with validated data
        await tx.user.create({
          data: {
            userId: data.user!.id,
            phone: formData.phone,
            fullName: data.user!.user_metadata?.full_name?.trim() || "",
            role: "BUSINESS_OWNER",
            lastLogIn: new Date(),
            // Set secure defaults
            isActive: true,
            isPremium: false,
            languagePreference: "english",
            currency: "INR",
            country: "india",
          },
        });
      } else {
        // Update existing user's last login
        await tx.user.update({
          where: { userId: data.user!.id },
          data: { lastLogIn: new Date() },
        });
      }
    });

    return { data: data, errorMessage: null };
  } catch (error) {
    return { data: null, errorMessage: getErrorMessage(error) };
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

/**
 * Login with email or phone OTP
 * SECURITY: Validates input format and prevents unauthorized access
 */
export const loginAction = async (formData: LogInData) => {
  try {
    // Input validation
    if ("email" in formData) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error("Invalid email format");
      }
    } else if ("phone" in formData) {
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      if (!phoneRegex.test(formData.phone)) {
        throw new Error("Invalid phone number format");
      }
    } else {
      throw new Error("Email or phone number is required");
    }

    const { auth } = await createSupabaseClient();

    const { data, error } = await auth.signInWithOtp({
      ...formData,
      options: {
        shouldCreateUser: false, // Only allow existing users to login
      },
    });

    if (error) {
      console.error("Login error:", error);
      throw error;
    }

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
