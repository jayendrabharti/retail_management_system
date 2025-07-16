"use server";

import prisma from "@/prisma/client";
import { CashbookEntry, CashflowType, PaymentMethod } from "@prisma/client";
import { getCurrentBusinessId } from "./businesses";
import { getErrorMessage } from "@/utils/utils";
import { revalidatePath } from "next/cache";

// Types
interface CreateCashbookEntryData {
  description: string;
  amount: number;
  type: CashflowType;
  category?: string;
  subcategory?: string;
  reference?: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
  businessUserId: string;
}

interface UpdateCashbookEntryData {
  id: string;
  description?: string;
  amount?: number;
  type?: CashflowType;
  category?: string;
  subcategory?: string;
  reference?: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
}

interface CashbookEntryResult {
  data: CashbookEntry | null;
  errorMessage: string | null;
}

interface CashbookEntriesResult {
  data: CashbookEntry[] | null;
  errorMessage: string | null;
}

interface CashbookSummary {
  totalCashIn: number;
  totalCashOut: number;
  netCashflow: number;
  currentBalance: number;
}

// Get cashbook entries for current business
export const getCashbookEntriesAction = async (
  limit?: number,
  offset?: number,
  type?: CashflowType,
  category?: string,
  paymentMethod?: PaymentMethod,
  startDate?: Date,
  endDate?: Date,
): Promise<CashbookEntriesResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const whereClause: any = {
      businessId,
    };

    if (type) whereClause.type = type;
    if (category) whereClause.category = category;
    if (paymentMethod) whereClause.paymentMethod = paymentMethod;
    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = startDate;
      if (endDate) whereClause.date.lte = endDate;
    }

    const entries = await prisma.cashbookEntry.findMany({
      where: whereClause,
      include: {
        businessUser: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                firstName: true,
              },
            },
          },
        },
      },
      orderBy: { date: "desc" },
      take: limit,
      skip: offset,
    });

    return {
      data: entries,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Create cashbook entry
export const createCashbookEntryAction = async (
  entryData: CreateCashbookEntryData,
): Promise<CashbookEntryResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const result = await prisma.$transaction(async (tx) => {
      // Get the last balance
      const lastEntry = await tx.cashbookEntry.findFirst({
        where: { businessId },
        orderBy: { date: "desc" },
      });

      const lastBalance = lastEntry?.balance?.toNumber() || 0;

      // Calculate new balance
      const newBalance =
        entryData.type === "CASH_IN"
          ? lastBalance + entryData.amount
          : lastBalance - entryData.amount;

      // Create cashbook entry
      const entry = await tx.cashbookEntry.create({
        data: {
          ...entryData,
          businessId,
          balance: newBalance,
        },
        include: {
          businessUser: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  firstName: true,
                },
              },
            },
          },
        },
      });

      return entry;
    });

    revalidatePath("/cashbook");
    return {
      data: result,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Update cashbook entry
export const updateCashbookEntryAction = async (
  entryData: UpdateCashbookEntryData,
): Promise<CashbookEntryResult> => {
  try {
    const { id, ...updateData } = entryData;

    const result = await prisma.$transaction(async (tx) => {
      // Get the current entry
      const currentEntry = await tx.cashbookEntry.findUnique({
        where: { id },
      });

      if (!currentEntry) {
        throw new Error("Cashbook entry not found");
      }

      // If amount or type is being updated, recalculate balances
      if (updateData.amount !== undefined || updateData.type !== undefined) {
        const businessId = currentEntry.businessId;

        // Get all entries after this one to recalculate their balances
        const laterEntries = await tx.cashbookEntry.findMany({
          where: {
            businessId,
            date: { gt: currentEntry.date },
          },
          orderBy: { date: "asc" },
        });

        // Update the current entry
        const updatedEntry = await tx.cashbookEntry.update({
          where: { id },
          data: updateData,
        });

        // Recalculate balance for this entry
        const previousEntry = await tx.cashbookEntry.findFirst({
          where: {
            businessId,
            date: { lt: currentEntry.date },
          },
          orderBy: { date: "desc" },
        });

        const previousBalance = previousEntry?.balance?.toNumber() || 0;
        const newAmount = updateData.amount ?? currentEntry.amount.toNumber();
        const newType = updateData.type ?? currentEntry.type;

        const newBalance =
          newType === "CASH_IN"
            ? previousBalance + newAmount
            : previousBalance - newAmount;

        await tx.cashbookEntry.update({
          where: { id },
          data: { balance: newBalance },
        });

        // Update balances for all later entries
        let runningBalance = newBalance;
        for (const entry of laterEntries) {
          runningBalance =
            entry.type === "CASH_IN"
              ? runningBalance + entry.amount.toNumber()
              : runningBalance - entry.amount.toNumber();

          await tx.cashbookEntry.update({
            where: { id: entry.id },
            data: { balance: runningBalance },
          });
        }

        return updatedEntry;
      } else {
        // Simple update without balance recalculation
        return await tx.cashbookEntry.update({
          where: { id },
          data: updateData,
        });
      }
    });

    revalidatePath("/cashbook");
    return {
      data: result,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Get cashbook entry by ID
export const getCashbookEntryByIdAction = async (
  id: string,
): Promise<CashbookEntryResult> => {
  try {
    const entry = await prisma.cashbookEntry.findUnique({
      where: { id },
      include: {
        businessUser: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                firstName: true,
              },
            },
          },
        },
      },
    });

    return {
      data: entry,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Delete cashbook entry
export const deleteCashbookEntryAction = async (
  id: string,
): Promise<CashbookEntryResult> => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Get the entry to delete
      const entryToDelete = await tx.cashbookEntry.findUnique({
        where: { id },
      });

      if (!entryToDelete) {
        throw new Error("Cashbook entry not found");
      }

      const businessId = entryToDelete.businessId;

      // Get all entries after this one to recalculate their balances
      const laterEntries = await tx.cashbookEntry.findMany({
        where: {
          businessId,
          date: { gt: entryToDelete.date },
        },
        orderBy: { date: "asc" },
      });

      // Delete the entry
      const deletedEntry = await tx.cashbookEntry.delete({
        where: { id },
      });

      // Get the previous balance
      const previousEntry = await tx.cashbookEntry.findFirst({
        where: {
          businessId,
          date: { lt: entryToDelete.date },
        },
        orderBy: { date: "desc" },
      });

      const previousBalance = previousEntry?.balance?.toNumber() || 0;

      // Update balances for all later entries
      let runningBalance = previousBalance;
      for (const entry of laterEntries) {
        runningBalance =
          entry.type === "CASH_IN"
            ? runningBalance + entry.amount.toNumber()
            : runningBalance - entry.amount.toNumber();

        await tx.cashbookEntry.update({
          where: { id: entry.id },
          data: { balance: runningBalance },
        });
      }

      return deletedEntry;
    });

    revalidatePath("/cashbook");
    return {
      data: result,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Get cashbook summary
export const getCashbookSummaryAction = async (
  startDate?: Date,
  endDate?: Date,
): Promise<{ data: CashbookSummary | null; errorMessage: string | null }> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const whereClause: any = {
      businessId,
    };

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = startDate;
      if (endDate) whereClause.date.lte = endDate;
    }

    const [cashInTotal, cashOutTotal, lastEntry] = await Promise.all([
      prisma.cashbookEntry.aggregate({
        where: { ...whereClause, type: "CASH_IN" },
        _sum: { amount: true },
      }),
      prisma.cashbookEntry.aggregate({
        where: { ...whereClause, type: "CASH_OUT" },
        _sum: { amount: true },
      }),
      prisma.cashbookEntry.findFirst({
        where: { businessId },
        orderBy: { date: "desc" },
        select: { balance: true },
      }),
    ]);

    const totalCashIn = cashInTotal._sum.amount?.toNumber() || 0;
    const totalCashOut = cashOutTotal._sum.amount?.toNumber() || 0;
    const currentBalance = lastEntry?.balance?.toNumber() || 0;

    return {
      data: {
        totalCashIn,
        totalCashOut,
        netCashflow: totalCashIn - totalCashOut,
        currentBalance,
      },
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Get cashbook entries by category
export const getCashbookEntriesByCategoryAction = async (
  category: string,
): Promise<CashbookEntriesResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const entries = await prisma.cashbookEntry.findMany({
      where: {
        businessId,
        category,
      },
      include: {
        businessUser: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                firstName: true,
              },
            },
          },
        },
      },
      orderBy: { date: "desc" },
    });

    return {
      data: entries,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};
