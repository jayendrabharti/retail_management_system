"use server";

import prisma from "@/prisma/client";
import { Party, PartyType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { createSupabaseClient } from "@/supabase/server";
import { getErrorMessage } from "@/utils/utils";
import { revalidatePath } from "next/cache";
import { getCurrentBusinessId } from "./businesses";

// Types
interface CreatePartyData {
  name: string;
  type: PartyType;
  companyName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  gstNumber?: string;
  creditLimit?: number;
  paymentTermId?: string;
  notes?: string;
  addresses?: CreateAddressData[];
}

interface UpdatePartyData {
  id: string;
  name?: string;
  type?: PartyType;
  companyName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  gstNumber?: string;
  creditLimit?: number;
  paymentTermId?: string;
  balance?: number;
  loyaltyPoints?: number;
  isActive?: boolean;
  notes?: string;
}

interface CreateAddressData {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
  addressType: string;
  isDefault?: boolean;
}

interface PartyResult {
  data: Party | null;
  errorMessage: string | null;
}

interface PartiesResult {
  data: Party[] | null;
  errorMessage: string | null;
}

interface PartyFilters {
  type?: PartyType;
  search?: string;
  hasBalance?: boolean;
  isActive?: boolean;
}

// Get all parties for current business
export const getPartiesAction = async (
  filters?: PartyFilters,
): Promise<PartiesResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const whereClause: any = {
      businessId,
    };

    // Apply filters
    if (filters?.type) {
      whereClause.type = filters.type;
    }

    if (filters?.isActive !== undefined) {
      whereClause.isActive = filters.isActive;
    } else {
      whereClause.isActive = true; // Default to active only
    }

    if (filters?.search) {
      whereClause.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { companyName: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
        { phone: { contains: filters.search, mode: "insensitive" } },
        { mobile: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters?.hasBalance) {
      whereClause.balance = { not: 0 };
    }

    const parties = await prisma.party.findMany({
      where: whereClause,
      include: {
        addresses: {
          where: { isDeleted: false },
        },
        paymentTerm: true,
        _count: {
          select: {
            purchases: true,
            sales: true,
            transactions: true,
          },
        },
      },
      orderBy: [{ name: "asc" }],
    });

    return { data: parties, errorMessage: null };
  } catch (error) {
    console.error("Error fetching parties:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Get party by ID
export const getPartyAction = async (id: string): Promise<PartyResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const party = await prisma.party.findFirst({
      where: {
        id,
        businessId,
      },
      include: {
        addresses: {
          where: { isDeleted: false },
        },
        paymentTerm: true,
        purchases: {
          orderBy: { purchaseDate: "desc" },
          take: 10,
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        },
        sales: {
          orderBy: { saleDate: "desc" },
          take: 10,
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        },
        transactions: {
          orderBy: { transactionDate: "desc" },
          take: 20,
        },
        _count: {
          select: {
            purchases: true,
            sales: true,
            transactions: true,
          },
        },
      },
    });

    if (!party) {
      throw new Error("Party not found");
    }

    return { data: party, errorMessage: null };
  } catch (error) {
    console.error("Error fetching party:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Create new party
export const createPartyAction = async (
  data: CreatePartyData,
): Promise<PartyResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    // Check if party name already exists
    const existingParty = await prisma.party.findFirst({
      where: {
        name: data.name,
        businessId,
        isActive: true,
      },
    });

    if (existingParty) {
      throw new Error("Party name already exists");
    }

    // Verify payment term exists if provided
    if (data.paymentTermId) {
      const paymentTerm = await prisma.paymentTerm.findFirst({
        where: {
          id: data.paymentTermId,
          businessId,
          isActive: true,
        },
      });

      if (!paymentTerm) {
        throw new Error("Payment term not found");
      }
    }

    const party = await prisma.$transaction(async (tx) => {
      // Create party
      const newParty = await tx.party.create({
        data: {
          name: data.name,
          type: data.type,
          companyName: data.companyName,
          email: data.email,
          phone: data.phone,
          mobile: data.mobile,
          gstNumber: data.gstNumber,
          creditLimit: data.creditLimit ? new Decimal(data.creditLimit) : null,
          paymentTermId: data.paymentTermId,
          notes: data.notes,
          businessId,
        },
        include: {
          paymentTerm: true,
        },
      });

      // Create addresses if provided
      if (data.addresses && data.addresses.length > 0) {
        await tx.address.createMany({
          data: data.addresses.map((address, index) => ({
            line1: address.line1,
            line2: address.line2,
            city: address.city,
            state: address.state,
            zipCode: address.zipCode,
            country: address.country || "India",
            addressType: address.addressType as any,
            isDefault: address.isDefault || index === 0,
            partyId: newParty.id,
          })),
        });
      }

      return newParty;
    });

    revalidatePath("/parties");
    revalidatePath("/dashboard");

    return { data: party, errorMessage: null };
  } catch (error) {
    console.error("Error creating party:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Update party
export const updatePartyAction = async (
  data: UpdatePartyData,
): Promise<PartyResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    // Verify party exists
    const existingParty = await prisma.party.findFirst({
      where: {
        id: data.id,
        businessId,
      },
    });

    if (!existingParty) {
      throw new Error("Party not found");
    }

    // Check if new name conflicts (if name is being changed)
    if (data.name && data.name !== existingParty.name) {
      const nameConflict = await prisma.party.findFirst({
        where: {
          name: data.name,
          businessId,
          isActive: true,
          id: { not: data.id },
        },
      });

      if (nameConflict) {
        throw new Error("Party name already exists");
      }
    }

    // Verify payment term exists if provided
    if (
      data.paymentTermId &&
      data.paymentTermId !== existingParty.paymentTermId
    ) {
      const paymentTerm = await prisma.paymentTerm.findFirst({
        where: {
          id: data.paymentTermId,
          businessId,
          isActive: true,
        },
      });

      if (!paymentTerm) {
        throw new Error("Payment term not found");
      }
    }

    const party = await prisma.party.update({
      where: {
        id: data.id,
      },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.companyName !== undefined && {
          companyName: data.companyName,
        }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.mobile !== undefined && { mobile: data.mobile }),
        ...(data.gstNumber !== undefined && { gstNumber: data.gstNumber }),
        ...(data.creditLimit !== undefined && {
          creditLimit: data.creditLimit ? new Decimal(data.creditLimit) : null,
        }),
        ...(data.paymentTermId !== undefined && {
          paymentTermId: data.paymentTermId,
        }),
        ...(data.balance !== undefined && {
          balance: new Decimal(data.balance),
        }),
        ...(data.loyaltyPoints !== undefined && {
          loyaltyPoints: data.loyaltyPoints,
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.notes !== undefined && { notes: data.notes }),
        updatedAt: new Date(),
      },
      include: {
        addresses: {
          where: { isDeleted: false },
        },
        paymentTerm: true,
      },
    });

    revalidatePath("/parties");
    revalidatePath("/dashboard");

    return { data: party, errorMessage: null };
  } catch (error) {
    console.error("Error updating party:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Delete party (soft delete)
export const deletePartyAction = async (id: string): Promise<PartyResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    // Check if party has transactions
    const transactionCount = await prisma.transaction.count({
      where: { partyId: id },
    });

    const purchaseCount = await prisma.purchase.count({
      where: { partyId: id },
    });

    const saleCount = await prisma.sale.count({
      where: { partyId: id },
    });

    if (transactionCount > 0 || purchaseCount > 0 || saleCount > 0) {
      throw new Error("Cannot delete party with transaction history");
    }

    const party = await prisma.party.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    revalidatePath("/parties");
    revalidatePath("/dashboard");

    return { data: party, errorMessage: null };
  } catch (error) {
    console.error("Error deleting party:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Get customers only
export const getCustomersAction = async (
  filters?: Omit<PartyFilters, "type">,
): Promise<PartiesResult> => {
  return getPartiesAction({
    ...filters,
    type: PartyType.CUSTOMER,
  });
};

// Get suppliers only
export const getSuppliersAction = async (
  filters?: Omit<PartyFilters, "type">,
): Promise<PartiesResult> => {
  return getPartiesAction({
    ...filters,
    type: PartyType.SUPPLIER,
  });
};

// Get parties with outstanding balances
export const getPartiesWithBalanceAction = async (): Promise<PartiesResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const parties = await prisma.party.findMany({
      where: {
        businessId,
        isActive: true,
        balance: { not: 0 },
      },
      include: {
        addresses: {
          where: { isDeleted: false },
        },
        paymentTerm: true,
        _count: {
          select: {
            purchases: true,
            sales: true,
            transactions: true,
          },
        },
      },
      orderBy: [{ balance: "desc" }, { name: "asc" }],
    });

    return { data: parties, errorMessage: null };
  } catch (error) {
    console.error("Error fetching parties with balance:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Update party balance
export const updatePartyBalanceAction = async (
  partyId: string,
  amount: number,
  isIncrease: boolean = true,
): Promise<PartyResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const party = await prisma.party.findFirst({
      where: {
        id: partyId,
        businessId,
      },
    });

    if (!party) {
      throw new Error("Party not found");
    }

    const currentBalance = party.balance.toNumber();
    const newBalance = isIncrease
      ? currentBalance + amount
      : currentBalance - amount;

    const updatedParty = await prisma.party.update({
      where: { id: partyId },
      data: {
        balance: new Decimal(newBalance),
        updatedAt: new Date(),
      },
      include: {
        addresses: {
          where: { isDeleted: false },
        },
        paymentTerm: true,
      },
    });

    revalidatePath("/parties");
    revalidatePath("/dashboard");

    return { data: updatedParty, errorMessage: null };
  } catch (error) {
    console.error("Error updating party balance:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Get party statistics
export const getPartyStatsAction = async () => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const [
      totalCustomers,
      totalSuppliers,
      customersWithBalance,
      suppliersWithBalance,
    ] = await Promise.all([
      prisma.party.count({
        where: {
          businessId,
          type: PartyType.CUSTOMER,
          isActive: true,
        },
      }),
      prisma.party.count({
        where: {
          businessId,
          type: PartyType.SUPPLIER,
          isActive: true,
        },
      }),
      prisma.party.count({
        where: {
          businessId,
          type: PartyType.CUSTOMER,
          isActive: true,
          balance: { gt: 0 },
        },
      }),
      prisma.party.count({
        where: {
          businessId,
          type: PartyType.SUPPLIER,
          isActive: true,
          balance: { gt: 0 },
        },
      }),
    ]);

    // Get total receivables and payables
    const receivables = await prisma.party.aggregate({
      where: {
        businessId,
        type: PartyType.CUSTOMER,
        isActive: true,
        balance: { gt: 0 },
      },
      _sum: {
        balance: true,
      },
    });

    const payables = await prisma.party.aggregate({
      where: {
        businessId,
        type: PartyType.SUPPLIER,
        isActive: true,
        balance: { gt: 0 },
      },
      _sum: {
        balance: true,
      },
    });

    return {
      data: {
        totalCustomers,
        totalSuppliers,
        customersWithBalance,
        suppliersWithBalance,
        totalReceivables: receivables._sum.balance?.toNumber() || 0,
        totalPayables: payables._sum.balance?.toNumber() || 0,
      },
      errorMessage: null,
    };
  } catch (error) {
    console.error("Error fetching party statistics:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};
