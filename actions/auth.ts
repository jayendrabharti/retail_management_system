"use server";

import { createSupabaseClient } from "../supabase/server";
import { getErrorMessage } from "@/utils/utils";
import { LogInFormData, SignUpFormData } from "@/types/auth";
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
          name: formData.name,
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

export const verifyOtpAction = async (formData: {
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
