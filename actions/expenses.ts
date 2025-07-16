"use server";

import prisma from "@/prisma/client";
import { Expense, PaymentMethod } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { createSupabaseClient } from "@/supabase/server";
import { getErrorMessage } from "@/utils/utils";
import { revalidatePath } from "next/cache";
import { getCurrentBusinessId } from "./businesses";

// Types
interface CreateExpenseData {
  date?: Date;
  category: string;
  subcategory?: string;
  description: string;
  amount: number;
  paymentMethod?: PaymentMethod;
  receipt?: string;
  vendor?: string;
  isRecurring?: boolean;
  recurringPeriod?: string;
  tags?: string[];
  notes?: string;
}

interface UpdateExpenseData {
  id: string;
  date?: Date;
  category?: string;
  subcategory?: string;
  description?: string;
  amount?: number;
  paymentMethod?: PaymentMethod;
  receipt?: string;
  vendor?: string;
  isRecurring?: boolean;
  recurringPeriod?: string;
  tags?: string[];
  notes?: string;
}

interface ExpenseResult {
  data: Expense | null;
  errorMessage: string | null;
}

interface ExpensesResult {
  data: Expense[] | null;
  errorMessage: string | null;
}

interface ExpenseFilters {
  category?: string;
  subcategory?: string;
  vendor?: string;
  paymentMethod?: PaymentMethod;
  isRecurring?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  amountFrom?: number;
  amountTo?: number;
  search?: string;
  tags?: string[];
}

// Get all expenses for current business
export const getExpensesAction = async (
  filters?: ExpenseFilters,
): Promise<ExpensesResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const supabase = await createSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) throw new Error("User not authenticated");

    const dbUser = await prisma.user.findUnique({
      where: { userId: user.id },
    });
    if (!dbUser) throw new Error("User not found");

    // Get business user relationship
    const businessUser = await prisma.businessUser.findFirst({
      where: {
        businessId,
        userId: dbUser.id,
        isActive: true,
      },
    });

    if (!businessUser) {
      throw new Error("Access denied to business");
    }

    const whereClause: any = {
      businessId,
    };

    // Apply filters
    if (filters?.category) {
      whereClause.category = {
        contains: filters.category,
        mode: "insensitive",
      };
    }

    if (filters?.subcategory) {
      whereClause.subcategory = {
        contains: filters.subcategory,
        mode: "insensitive",
      };
    }

    if (filters?.vendor) {
      whereClause.vendor = { contains: filters.vendor, mode: "insensitive" };
    }

    if (filters?.paymentMethod) {
      whereClause.paymentMethod = filters.paymentMethod;
    }

    if (filters?.isRecurring !== undefined) {
      whereClause.isRecurring = filters.isRecurring;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      whereClause.date = {};
      if (filters.dateFrom) {
        whereClause.date.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        whereClause.date.lte = filters.dateTo;
      }
    }

    if (filters?.amountFrom || filters?.amountTo) {
      whereClause.amount = {};
      if (filters.amountFrom) {
        whereClause.amount.gte = filters.amountFrom;
      }
      if (filters.amountTo) {
        whereClause.amount.lte = filters.amountTo;
      }
    }

    if (filters?.search) {
      whereClause.OR = [
        { description: { contains: filters.search, mode: "insensitive" } },
        { category: { contains: filters.search, mode: "insensitive" } },
        { subcategory: { contains: filters.search, mode: "insensitive" } },
        { vendor: { contains: filters.search, mode: "insensitive" } },
        { notes: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters?.tags && filters.tags.length > 0) {
      whereClause.tags = {
        hasSome: filters.tags,
      };
    }

    const expenses = await prisma.expense.findMany({
      where: whereClause,
      include: {
        businessUser: {
          include: {
            user: {
              select: {
                fullName: true,
                email: true,
              },
            },
          },
        },
        transactions: true,
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    return { data: expenses, errorMessage: null };
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Get expense by ID
export const getExpenseAction = async (id: string): Promise<ExpenseResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const expense = await prisma.expense.findFirst({
      where: {
        id,
        businessId,
      },
      include: {
        businessUser: {
          include: {
            user: {
              select: {
                fullName: true,
                email: true,
              },
            },
          },
        },
        transactions: {
          include: {
            debitAccount: true,
            creditAccount: true,
          },
        },
      },
    });

    if (!expense) {
      throw new Error("Expense not found");
    }

    return { data: expense, errorMessage: null };
  } catch (error) {
    console.error("Error fetching expense:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Create new expense
export const createExpenseAction = async (
  data: CreateExpenseData,
): Promise<ExpenseResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const supabase = await createSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) throw new Error("User not authenticated");

    const dbUser = await prisma.user.findUnique({
      where: { userId: user.id },
    });
    if (!dbUser) throw new Error("User not found");

    // Get business user relationship
    const businessUser = await prisma.businessUser.findFirst({
      where: {
        businessId,
        userId: dbUser.id,
        isActive: true,
      },
    });

    if (!businessUser) {
      throw new Error("Access denied to business");
    }

    const expense = await prisma.$transaction(async (tx) => {
      // Create expense
      const newExpense = await tx.expense.create({
        data: {
          date: data.date || new Date(),
          category: data.category,
          subcategory: data.subcategory,
          description: data.description,
          amount: new Decimal(data.amount),
          paymentMethod: data.paymentMethod || PaymentMethod.CASH,
          receipt: data.receipt,
          vendor: data.vendor,
          isRecurring: data.isRecurring || false,
          recurringPeriod: data.recurringPeriod,
          tags: data.tags || [],
          notes: data.notes,
          businessId,
          businessUserId: businessUser.id,
        },
      });

      // Create accounting transaction
      const cashAccount = await tx.account.findFirst({
        where: {
          businessId,
          accountType:
            data.paymentMethod === PaymentMethod.CASH ? "CASH" : "BANK",
        },
      });

      const expenseAccount = await tx.account.findFirst({
        where: {
          businessId,
          accountType: "EXPENSE",
        },
      });

      if (cashAccount && expenseAccount) {
        await tx.transaction.create({
          data: {
            businessId,
            description: `${data.category} - ${data.description}`,
            amount: new Decimal(data.amount),
            type: "EXPENSE",
            debitAccountId: expenseAccount.id,
            creditAccountId: cashAccount.id,
            expenseId: newExpense.id,
            reference: `EXP-${newExpense.id.slice(-6)}`,
            notes: data.notes,
          },
        });

        // Update account balances
        await tx.account.update({
          where: { id: expenseAccount.id },
          data: {
            balance: {
              increment: data.amount,
            },
          },
        });

        await tx.account.update({
          where: { id: cashAccount.id },
          data: {
            balance: {
              decrement: data.amount,
            },
          },
        });
      }

      return newExpense;
    });

    revalidatePath("/expenses");
    revalidatePath("/dashboard");

    return { data: expense, errorMessage: null };
  } catch (error) {
    console.error("Error creating expense:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Update expense
export const updateExpenseAction = async (
  data: UpdateExpenseData,
): Promise<ExpenseResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const supabase = await createSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) throw new Error("User not authenticated");

    // Verify expense exists
    const existingExpense = await prisma.expense.findFirst({
      where: {
        id: data.id,
        businessId,
      },
      include: {
        transactions: true,
      },
    });

    if (!existingExpense) {
      throw new Error("Expense not found");
    }

    const expense = await prisma.$transaction(async (tx) => {
      // Update expense
      const updatedExpense = await tx.expense.update({
        where: { id: data.id },
        data: {
          ...(data.date !== undefined && { date: data.date }),
          ...(data.category !== undefined && { category: data.category }),
          ...(data.subcategory !== undefined && {
            subcategory: data.subcategory,
          }),
          ...(data.description !== undefined && {
            description: data.description,
          }),
          ...(data.amount !== undefined && {
            amount: new Decimal(data.amount),
          }),
          ...(data.paymentMethod !== undefined && {
            paymentMethod: data.paymentMethod,
          }),
          ...(data.receipt !== undefined && { receipt: data.receipt }),
          ...(data.vendor !== undefined && { vendor: data.vendor }),
          ...(data.isRecurring !== undefined && {
            isRecurring: data.isRecurring,
          }),
          ...(data.recurringPeriod !== undefined && {
            recurringPeriod: data.recurringPeriod,
          }),
          ...(data.tags !== undefined && { tags: data.tags }),
          ...(data.notes !== undefined && { notes: data.notes }),
          updatedAt: new Date(),
        },
      });

      // If amount changed, update accounting transactions
      if (
        data.amount !== undefined &&
        data.amount !== existingExpense.amount.toNumber()
      ) {
        const amountDifference =
          data.amount - existingExpense.amount.toNumber();

        // Update existing transaction
        if (existingExpense.transactions.length > 0) {
          const transaction = existingExpense.transactions[0];

          await tx.transaction.update({
            where: { id: transaction.id },
            data: {
              amount: new Decimal(data.amount),
              description: data.description || existingExpense.description,
            },
          });

          // Update account balances
          const expenseAccount = await tx.account.findFirst({
            where: { id: transaction.debitAccountId },
          });

          const cashAccount = await tx.account.findFirst({
            where: { id: transaction.creditAccountId },
          });

          if (expenseAccount) {
            await tx.account.update({
              where: { id: expenseAccount.id },
              data: {
                balance: {
                  increment: amountDifference,
                },
              },
            });
          }

          if (cashAccount) {
            await tx.account.update({
              where: { id: cashAccount.id },
              data: {
                balance: {
                  decrement: amountDifference,
                },
              },
            });
          }
        }
      }

      return updatedExpense;
    });

    revalidatePath("/expenses");
    revalidatePath("/dashboard");

    return { data: expense, errorMessage: null };
  } catch (error) {
    console.error("Error updating expense:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Delete expense
export const deleteExpenseAction = async (
  id: string,
): Promise<ExpenseResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const existingExpense = await prisma.expense.findFirst({
      where: {
        id,
        businessId,
      },
      include: {
        transactions: true,
      },
    });

    if (!existingExpense) {
      throw new Error("Expense not found");
    }

    const expense = await prisma.$transaction(async (tx) => {
      // Reverse accounting transactions
      for (const transaction of existingExpense.transactions) {
        // Update account balances
        await tx.account.update({
          where: { id: transaction.debitAccountId },
          data: {
            balance: {
              decrement: transaction.amount.toNumber(),
            },
          },
        });

        await tx.account.update({
          where: { id: transaction.creditAccountId },
          data: {
            balance: {
              increment: transaction.amount.toNumber(),
            },
          },
        });

        // Delete transaction
        await tx.transaction.delete({
          where: { id: transaction.id },
        });
      }

      // Delete expense
      return await tx.expense.delete({
        where: { id },
      });
    });

    revalidatePath("/expenses");
    revalidatePath("/dashboard");

    return { data: expense, errorMessage: null };
  } catch (error) {
    console.error("Error deleting expense:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Get expense categories
export const getExpenseCategoriesAction = async () => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const categories = await prisma.expense.findMany({
      where: { businessId },
      select: {
        category: true,
        subcategory: true,
      },
      distinct: ["category", "subcategory"],
    });

    // Group subcategories by category
    const groupedCategories = categories.reduce(
      (acc, item) => {
        if (!acc[item.category]) {
          acc[item.category] = new Set();
        }
        if (item.subcategory) {
          acc[item.category].add(item.subcategory);
        }
        return acc;
      },
      {} as Record<string, Set<string>>,
    );

    // Convert to array format
    const result = Object.entries(groupedCategories).map(
      ([category, subcategories]) => ({
        category,
        subcategories: Array.from(subcategories),
      }),
    );

    return { data: result, errorMessage: null };
  } catch (error) {
    console.error("Error fetching expense categories:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Get expense statistics
export const getExpenseStatsAction = async (dateFrom?: Date, dateTo?: Date) => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const whereClause: any = { businessId };

    if (dateFrom || dateTo) {
      whereClause.date = {};
      if (dateFrom) whereClause.date.gte = dateFrom;
      if (dateTo) whereClause.date.lte = dateTo;
    }

    const [totalExpenses, totalAmount, expensesByCategory, recurringExpenses] =
      await Promise.all([
        prisma.expense.count({ where: whereClause }),
        prisma.expense.aggregate({
          where: whereClause,
          _sum: { amount: true },
          _avg: { amount: true },
        }),
        prisma.expense.groupBy({
          by: ["category"],
          where: whereClause,
          _sum: { amount: true },
          _count: { category: true },
        }),
        prisma.expense.count({
          where: { ...whereClause, isRecurring: true },
        }),
      ]);

    return {
      data: {
        totalExpenses,
        totalAmount: totalAmount._sum.amount?.toNumber() || 0,
        averageAmount: totalAmount._avg.amount?.toNumber() || 0,
        recurringExpenses,
        expensesByCategory: expensesByCategory.map((item) => ({
          category: item.category,
          amount: item._sum.amount?.toNumber() || 0,
          count: item._count.category,
        })),
      },
      errorMessage: null,
    };
  } catch (error) {
    console.error("Error fetching expense statistics:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Get monthly expense trends
export const getMonthlyExpenseTrendsAction = async (months: number = 12) => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const expenses = await prisma.expense.findMany({
      where: {
        businessId,
        date: { gte: startDate },
      },
      select: {
        date: true,
        amount: true,
        category: true,
      },
    });

    // Group by month
    const monthlyData = expenses.reduce(
      (acc, expense) => {
        const monthKey = expense.date.toISOString().slice(0, 7); // YYYY-MM
        if (!acc[monthKey]) {
          acc[monthKey] = {
            month: monthKey,
            totalAmount: 0,
            categories: {},
          };
        }
        acc[monthKey].totalAmount += expense.amount.toNumber();

        if (!acc[monthKey].categories[expense.category]) {
          acc[monthKey].categories[expense.category] = 0;
        }
        acc[monthKey].categories[expense.category] += expense.amount.toNumber();

        return acc;
      },
      {} as Record<string, any>,
    );

    const result = Object.values(monthlyData).sort((a: any, b: any) =>
      a.month.localeCompare(b.month),
    );

    return { data: result, errorMessage: null };
  } catch (error) {
    console.error("Error fetching monthly expense trends:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};
