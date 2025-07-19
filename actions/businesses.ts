"use server";

import prisma from "@/prisma/client";
import { Business, AccountType } from "@prisma/client";
import { createSupabaseClient } from "@/supabase/server";
import { getErrorMessage } from "@/utils/utils";
import {
  safePrismaOperation,
  safeSupabaseUserOperation,
} from "@/utils/safe-operations";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

/**
 * Business Management Server Actions
 *
 * Handles all business-related operations in a multi-tenant architecture:
 * - CRUD operations for businesses
 * - Business switching and current business management
 * - Default account creation for new businesses
 * - Access control and ownership validation
 */

// Type for business creation input
interface CreateBusinessData {
  name: string;
  description?: string;
  email?: string;
  phone?: string;
  gstNumber?: string;
  registrationNo?: string;
  panNumber?: string;
  website?: string;
  currency?: string;
  fiscalYear?: string;
}

// Type for business update input
interface UpdateBusinessData {
  id: string;
  name?: string;
  description?: string;
  email?: string;
  phone?: string;
  gstNumber?: string;
  registrationNo?: string;
  panNumber?: string;
  website?: string;
  currency?: string;
  fiscalYear?: string;
  isActive?: boolean;
  logoImage?: string;
}

// Standard return type for business operations
interface BusinessActionResult {
  data: Business | null;
  errorMessage: string | null;
}

interface BusinessListResult {
  data: Business[] | null;
  errorMessage: string | null;
}

export const getBusinessesAction = async (): Promise<BusinessListResult> => {
  try {
    const supabase = await createSupabaseClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user?.id) throw new Error("User not authenticated");

    // First, get the user from our database
    const dbUser = await prisma.user.findUnique({
      where: { userId: user.id },
    });

    if (!dbUser) {
      throw new Error("User not found in database");
    }

    // Get businesses owned by the user
    const businesses = await prisma.business.findMany({
      where: {
        ownerId: dbUser.id,
        isActive: true,
      },
      include: {
        owner: {
          select: {
            fullName: true,
            email: true,
          },
        },
        _count: {
          select: {
            users: true,
            products: true,
            sales: true,
            purchases: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { data: businesses, errorMessage: null };
  } catch (error) {
    console.error("Error fetching businesses:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

export const getBusinessAction = async (): Promise<BusinessActionResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const supabase = await createSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user?.id) throw new Error("User not authenticated");

    // Get the user from our database
    const dbUser = await prisma.user.findUnique({
      where: { userId: user.id },
    });

    if (!dbUser) {
      throw new Error("User not found in database");
    }

    // Check if user has access to this business (owner or team member)
    const business = await prisma.business.findFirst({
      where: {
        id: businessId,
        isActive: true,
        OR: [
          { ownerId: dbUser.id },
          {
            users: {
              some: {
                userId: dbUser.id,
                isActive: true,
              },
            },
          },
        ],
      },
      include: {
        owner: {
          select: {
            fullName: true,
            email: true,
          },
        },
        addresses: {
          where: { isDeleted: false },
        },
        _count: {
          select: {
            users: true,
            products: true,
            sales: true,
            purchases: true,
          },
        },
      },
    });

    if (!business) {
      throw new Error("Business not found or access denied");
    }

    return { data: business, errorMessage: null };
  } catch (error) {
    console.error("Error fetching business:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

export const createBusinessAction = async (
  data: CreateBusinessData,
): Promise<BusinessActionResult> => {
  const { data: user, error: authError } = await safeSupabaseUserOperation(
    async () => {
      const supabase = await createSupabaseClient();
      return await supabase.auth.getUser();
    },
  );

  if (authError || !user) {
    return { data: null, errorMessage: authError || "User not authenticated" };
  }

  if (!user.id) {
    return { data: null, errorMessage: "User ID not found" };
  }

  // Get or create user in our database
  const { data: dbUser, error: userError } = await safePrismaOperation(
    async () => {
      let existingUser = await prisma.user.findUnique({
        where: { userId: user.id },
      });

      if (!existingUser) {
        // Create user if doesn't exist
        existingUser = await prisma.user.create({
          data: {
            userId: user.id,
            phone: user.phone || "",
            email: user.email,
            fullName: user.user_metadata?.full_name || "",
            role: "BUSINESS_OWNER",
          },
        });
      }

      return existingUser;
    },
  );

  if (userError || !dbUser) {
    return {
      data: null,
      errorMessage: userError || "Failed to get or create user",
    };
  }

  // Create business
  const { data: business, error: businessError } = await safePrismaOperation(
    async () => {
      return await prisma.business.create({
        data: {
          name: data.name,
          description: data.description,
          email: data.email,
          phone: data.phone,
          gstNumber: data.gstNumber,
          registrationNo: data.registrationNo,
          panNumber: data.panNumber,
          website: data.website,
          currency: data.currency || "INR",
          fiscalYear: data.fiscalYear || "april-march",
          ownerId: dbUser.id,
        },
        include: {
          owner: {
            select: {
              fullName: true,
              email: true,
            },
          },
        },
      });
    },
  );

  if (businessError || !business) {
    return {
      data: null,
      errorMessage: businessError || "Failed to create business",
    };
  }

  // Create default business user entry
  const { error: businessUserError } = await safePrismaOperation(async () => {
    return await prisma.businessUser.create({
      data: {
        businessId: business.id,
        userId: dbUser.id,
        role: "BUSINESS_OWNER",
        isActive: true,
      },
    });
  });

  if (businessUserError) {
    console.error(
      "Warning: Failed to create business user entry:",
      businessUserError,
    );
    // Continue anyway - the business was created successfully
  }

  // Create default accounts for double-entry bookkeeping
  try {
    await createDefaultAccounts(business.id);
  } catch (error) {
    console.error("Warning: Failed to create default accounts:", error);
    // Continue anyway - the business was created successfully
  }

  revalidatePath("/");
  revalidatePath("/businesses");

  return { data: business, errorMessage: null };
};

export const updateBusinessAction = async (
  data: UpdateBusinessData,
): Promise<BusinessActionResult> => {
  try {
    const supabase = await createSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) throw error;
    if (!user?.id) throw new Error("User not authenticated");

    // Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { userId: user.id },
    });

    if (!dbUser) {
      throw new Error("User not found in database");
    }

    // Check if user owns this business
    const existingBusiness = await prisma.business.findFirst({
      where: {
        id: data.id,
        ownerId: dbUser.id,
      },
    });

    if (!existingBusiness) {
      throw new Error("Business not found or access denied");
    }

    // Update business
    const business = await prisma.business.update({
      where: {
        id: data.id,
      },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.gstNumber !== undefined && { gstNumber: data.gstNumber }),
        ...(data.registrationNo !== undefined && {
          registrationNo: data.registrationNo,
        }),
        ...(data.panNumber !== undefined && { panNumber: data.panNumber }),
        ...(data.website !== undefined && { website: data.website }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.fiscalYear !== undefined && { fiscalYear: data.fiscalYear }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.logoImage !== undefined && { logoImage: data.logoImage }),
        updatedAt: new Date(),
      },
      include: {
        owner: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    });

    revalidatePath("/");
    revalidatePath("/businesses");

    return { data: business, errorMessage: null };
  } catch (error) {
    console.error("Error updating business:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

export const deleteBusinessAction = async (data: {
  id: string;
}): Promise<BusinessActionResult> => {
  try {
    const supabase = await createSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) throw error;
    if (!user?.id) throw new Error("User not authenticated");

    // Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { userId: user.id },
    });

    if (!dbUser) {
      throw new Error("User not found in database");
    }

    // Soft delete business (set isActive to false)
    const business = await prisma.business.update({
      where: {
        id: data.id,
        ownerId: dbUser.id,
      },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    // Remove from current business if it was selected
    const currentBusinessId = await getCurrentBusinessId();
    if (currentBusinessId === data.id) {
      await removeCurrentBusinessId();
    }

    revalidatePath("/");
    revalidatePath("/businesses");

    return { data: business, errorMessage: null };
  } catch (error) {
    console.error("Error deleting business:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

export const setCurrentBusinessId = async (data: { id: string }) => {
  try {
    // Verify user has access to this business
    const supabase = await createSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) throw error;
    if (!user?.id) throw new Error("User not authenticated");

    const dbUser = await prisma.user.findUnique({
      where: { userId: user.id },
    });

    if (!dbUser) {
      throw new Error("User not found in database");
    }

    // Check if user has access to this business
    const business = await prisma.business.findFirst({
      where: {
        id: data.id,
        isActive: true,
        OR: [
          { ownerId: dbUser.id },
          {
            users: {
              some: {
                userId: dbUser.id,
                isActive: true,
              },
            },
          },
        ],
      },
    });

    if (!business) {
      throw new Error("Business not found or access denied");
    }

    const cookieStore = await cookies();
    cookieStore.set("current_business_id", data.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    revalidatePath("/");
  } catch (error) {
    console.error("Error setting current business:", error);
    throw error;
  }
};

/**
 * Retrieves the current business ID from secure HTTP-only cookies
 * Used throughout the app to ensure operations are scoped to the correct business
 */
export const getCurrentBusinessId = async (): Promise<string | null> => {
  try {
    const cookieStore = await cookies();
    return cookieStore.get("current_business_id")?.value || null;
  } catch (error) {
    console.error("Error getting current business ID:", error);
    return null;
  }
};

/**
 * Removes the current business ID from cookies
 * Used when deleting a business or during logout
 */
export const removeCurrentBusinessId = async () => {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("current_business_id");
    revalidatePath("/");
  } catch (error) {
    console.error("Error removing current business ID:", error);
  }
};

/**
 * Creates default accounting accounts for double-entry bookkeeping
 * This ensures every new business has the basic accounts needed for financial tracking
 */
async function createDefaultAccounts(businessId: string) {
  const defaultAccounts = [
    { name: "Cash", accountType: AccountType.CASH, balance: 0 },
    { name: "Bank Account", accountType: AccountType.BANK, balance: 0 },
    {
      name: "Accounts Receivable",
      accountType: AccountType.ACCOUNTS_RECEIVABLE,
      balance: 0,
    },
    {
      name: "Accounts Payable",
      accountType: AccountType.ACCOUNTS_PAYABLE,
      balance: 0,
    },
    { name: "Inventory", accountType: AccountType.INVENTORY, balance: 0 },
    { name: "Sales Revenue", accountType: AccountType.REVENUE, balance: 0 },
    {
      name: "Cost of Goods Sold",
      accountType: AccountType.EXPENSE,
      balance: 0,
    },
    {
      name: "Operating Expenses",
      accountType: AccountType.EXPENSE,
      balance: 0,
    },
  ];

  await prisma.account.createMany({
    data: defaultAccounts.map((account) => ({
      ...account,
      businessId,
    })),
  });
}
