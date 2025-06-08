"use server";

import prisma from "@/prisma/client";
import { Businesses } from "@prisma/client";
import { createSupabaseClient } from "@/supabase/server";
import { getErrorMessage } from "@/utils/utils";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export const getBusinessesAction = async () => {
  try {
    const supabase = await createSupabaseClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;

    const businesses = await prisma.businesses.findMany({
      where: { userId: user?.id },
      orderBy: {
        createdAt: "asc",
      },
    });

    return { data: businesses, errorMessage: null };
  } catch (error) {
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

export const getBusinessAction = async () => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) throw "No business selected !!";

    const supabase = await createSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;

    const business = await prisma.businesses.findFirst({
      where: { id: businessId, userId: user?.id },
      orderBy: {
        createdAt: "asc",
      },
    });

    return { data: business, errorMessage: null };
  } catch (error) {
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

export const createBusinessAction = async (data: {
  name: string;
}): Promise<{
  data: Businesses | null;
  errorMessage: string | null;
}> => {
  try {
    const supabase = await createSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) throw error;
    if (!user || !user.id) throw new Error("User not authenticated");

    const business = await prisma.businesses.create({
      data: {
        name: data.name,
        userId: user.id,
      },
    });

    revalidatePath("/");

    return { data: business as Businesses, errorMessage: null };
  } catch (error) {
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

export const deleteBusinessAction = async (data: {
  id: string;
}): Promise<{
  data: Businesses | null;
  errorMessage: string | null;
}> => {
  try {
    const supabase = await createSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) throw error;
    if (!user || !user.id) throw new Error("User not authenticated");

    const business = await prisma.businesses.delete({
      where: {
        id: data.id,
        userId: user?.id,
      },
    });

    revalidatePath("/businesses");

    return { data: business as Businesses, errorMessage: null };
  } catch (error) {
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

export const updateBusinessAction = async (data: {
  id: string;
  name?: string;
}): Promise<{
  data: Businesses | null;
  errorMessage: string | null;
}> => {
  try {
    const supabase = await createSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) throw error;
    if (!user || !user.id) throw new Error("User not authenticated");

    const business = await prisma.businesses.update({
      where: {
        id: data.id,
        userId: user?.id,
      },
      data: {
        ...(data.name !== undefined && { name: data.name }),
      },
    });

    revalidatePath("/businesses");

    return { data: business as Businesses, errorMessage: null };
  } catch (error) {
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

export const setCurrentBusinessId = async (data: { id: string }) => {
  (await cookies()).set("current_business_id", data.id);
  revalidatePath("/");
};

export const getCurrentBusinessId = async () => {
  const cookieStore = await cookies();
  return cookieStore.get("current_business_id")?.value || null;
};

export const removeCurrentBusinessId = async () => {
  const cookieStore = await cookies();
  return cookieStore.delete("current_business_id");
};
