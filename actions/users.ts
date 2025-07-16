"use server";

import prisma from "@/prisma/client";
import { User, UserRole } from "@prisma/client";
import { createSupabaseClient } from "@/supabase/server";
import { getErrorMessage } from "@/utils/utils";
import { revalidatePath } from "next/cache";

// Types
interface CreateUserData {
  userId: string;
  phone: string;
  email?: string;
  fullName?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  profileImage?: string;
  role?: UserRole;
  languagePreference?: string;
  currency?: string;
  country?: string;
}

interface UpdateUserData {
  id: string;
  phone?: string;
  email?: string;
  fullName?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  profileImage?: string;
  role?: UserRole;
  languagePreference?: string;
  currency?: string;
  country?: string;
  isActive?: boolean;
  isPremium?: boolean;
  premiumTier?: string;
  premiumExpiresAt?: Date;
}

interface UserResult {
  data: User | null;
  errorMessage: string | null;
}

interface UsersResult {
  data: User[] | null;
  errorMessage: string | null;
}

// Get current user
export const getCurrentUserAction = async (): Promise<UserResult> => {
  try {
    const supabase = await createSupabaseClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      throw new Error("No authenticated user found");
    }

    const user = await prisma.user.findUnique({
      where: { userId: authUser.id },
      include: {
        businessUsers: {
          include: {
            business: true,
          },
        },
        ownedBusinesses: true,
      },
    });

    if (!user) {
      throw new Error("User not found in database");
    }

    return {
      data: user,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Create user
export const createUserAction = async (
  userData: CreateUserData,
): Promise<UserResult> => {
  try {
    const user = await prisma.user.create({
      data: {
        ...userData,
        lastLogIn: new Date(),
      },
    });

    revalidatePath("/");
    return {
      data: user,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Update user
export const updateUserAction = async (
  userData: UpdateUserData,
): Promise<UserResult> => {
  try {
    const { id, ...updateData } = userData;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/");
    return {
      data: user,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Get user by ID
export const getUserByIdAction = async (id: string): Promise<UserResult> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        businessUsers: {
          include: {
            business: true,
          },
        },
        ownedBusinesses: true,
      },
    });

    return {
      data: user,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Get users by business
export const getUsersByBusinessAction = async (
  businessId: string,
): Promise<UsersResult> => {
  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { ownedBusinesses: { some: { id: businessId } } },
          { businessUsers: { some: { businessId: businessId } } },
        ],
      },
      include: {
        businessUsers: {
          where: { businessId },
          include: {
            business: true,
          },
        },
      },
    });

    return {
      data: users,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Update user last login
export const updateUserLastLoginAction = async (
  userId: string,
): Promise<UserResult> => {
  try {
    const user = await prisma.user.update({
      where: { userId },
      data: { lastLogIn: new Date() },
    });

    return {
      data: user,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Activate/Deactivate user
export const toggleUserStatusAction = async (
  id: string,
): Promise<UserResult> => {
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id },
      select: { isActive: true },
    });

    if (!currentUser) {
      throw new Error("User not found");
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isActive: !currentUser.isActive },
    });

    revalidatePath("/");
    return {
      data: user,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Update premium status
export const updatePremiumStatusAction = async (
  id: string,
  isPremium: boolean,
  premiumTier?: string,
  premiumExpiresAt?: Date,
): Promise<UserResult> => {
  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        isPremium,
        premiumTier,
        premiumExpiresAt,
      },
    });

    revalidatePath("/");
    return {
      data: user,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};
