"use server";

import prisma from "@/prisma/client";
import { Business, AccountType } from "@prisma/client";
import { createSupabaseClient } from "@/supabase/server";
import { getErrorMessage } from "@/utils/utils";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

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
  try {
    const supabase = await createSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) throw error;
    if (!user?.id) throw new Error("User not authenticated");

    // Get or create user in our database
    let dbUser = await prisma.user.findUnique({
      where: { userId: user.id },
    });

    if (!dbUser) {
      // Create user if doesn't exist
      dbUser = await prisma.user.create({
        data: {
          userId: user.id,
          phone: user.phone || "",
          email: user.email,
          fullName: user.user_metadata?.full_name || "",
          role: "BUSINESS_OWNER",
        },
      });
    }

    // Create business
    const business = await prisma.business.create({
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

    // Create default business user entry
    await prisma.businessUser.create({
      data: {
        businessId: business.id,
        userId: dbUser.id,
        role: "BUSINESS_OWNER",
        isActive: true,
      },
    });

    // Create default accounts for double-entry bookkeeping
    await createDefaultAccounts(business.id);

    revalidatePath("/");
    revalidatePath("/businesses");

    return { data: business, errorMessage: null };
  } catch (error) {
    console.error("Error creating business:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
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

export const getCurrentBusinessId = async (): Promise<string | null> => {
  try {
    const cookieStore = await cookies();
    return cookieStore.get("current_business_id")?.value || null;
  } catch (error) {
    console.error("Error getting current business ID:", error);
    return null;
  }
};

export const removeCurrentBusinessId = async () => {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("current_business_id");
    revalidatePath("/");
  } catch (error) {
    console.error("Error removing current business ID:", error);
  }
};

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
