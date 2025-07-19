"use server";

import prisma from "@/prisma/client";
import {
  Account,
  AccountType,
  Transaction,
  TransactionType,
} from "@prisma/client";
import { getCurrentBusinessId } from "./businesses";
import { getErrorMessage } from "@/utils/utils";
import { revalidatePath } from "next/cache";
import { createSupabaseClient } from "@/supabase/server";
import { Decimal } from "@prisma/client/runtime/library";

// Types
interface CreateAccountData {
  name: string;
  accountNumber?: string;
  accountType: AccountType;
  parentId?: string;
  description?: string;
  balance?: number;
}

interface UpdateAccountData {
  id: string;
  name?: string;
  accountNumber?: string;
  accountType?: AccountType;
  parentId?: string;
  description?: string;
  isActive?: boolean;
}

interface CreateTransactionData {
  description: string;
  amount: number;
  type: TransactionType;
  debitAccountId: string;
  creditAccountId: string;
  reference?: string;
  notes?: string;
  purchaseId?: string;
  saleId?: string;
  partyId?: string;
  expenseId?: string;
}

interface AccountResult {
  data: Account | null;
  errorMessage: string | null;
}

interface AccountsResult {
  data: Account[] | null;
  errorMessage: string | null;
}

interface TransactionResult {
  data: Transaction | null;
  errorMessage: string | null;
}

interface TransactionsResult {
  data: Transaction[] | null;
  errorMessage: string | null;
}

// ============================================
// ACCOUNT MANAGEMENT
// ============================================

// Get all accounts for current business
export const getAccountsAction = async (): Promise<AccountsResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    // Authentication and authorization
    const supabase = await createSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) throw new Error("User not authenticated");

    const dbUser = await prisma.user.findUnique({
      where: { userId: user.id },
    });

    if (!dbUser) {
      throw new Error("User not found in database");
    }

    // Verify business access
    const businessAccess = await prisma.business.findFirst({
      where: {
        id: businessId,
        OR: [
          { ownerId: dbUser.id },
          { users: { some: { userId: dbUser.id, isActive: true } } },
        ],
      },
    });

    if (!businessAccess) {
      throw new Error("Access denied to business");
    }

    const accounts = await prisma.account.findMany({
      where: {
        businessId,
        isActive: true,
      },
      include: {
        parent: true,
        children: true,
      },
      orderBy: [{ accountType: "asc" }, { name: "asc" }],
    });

    return {
      data: accounts,
      errorMessage: null,
    };
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Create account
export const createAccountAction = async (
  accountData: CreateAccountData,
): Promise<AccountResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    // Authentication and authorization
    const supabase = await createSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) throw new Error("User not authenticated");

    const dbUser = await prisma.user.findUnique({
      where: { userId: user.id },
    });

    if (!dbUser) {
      throw new Error("User not found in database");
    }

    // Verify business access
    const businessAccess = await prisma.business.findFirst({
      where: {
        id: businessId,
        OR: [
          { ownerId: dbUser.id },
          { users: { some: { userId: dbUser.id, isActive: true } } },
        ],
      },
    });

    if (!businessAccess) {
      throw new Error("Access denied to business");
    }

    // Input validation
    if (
      !accountData.name ||
      typeof accountData.name !== "string" ||
      accountData.name.trim().length === 0
    ) {
      throw new Error("Account name is required");
    }

    if (accountData.name.trim().length > 100) {
      throw new Error("Account name is too long (max 100 characters)");
    }

    if (
      !accountData.accountType ||
      !Object.values(AccountType).includes(accountData.accountType)
    ) {
      throw new Error("Valid account type is required");
    }

    if (
      accountData.accountNumber &&
      accountData.accountNumber.trim().length > 50
    ) {
      throw new Error("Account number is too long (max 50 characters)");
    }

    if (
      accountData.description &&
      accountData.description.trim().length > 500
    ) {
      throw new Error("Description is too long (max 500 characters)");
    }

    if (
      accountData.balance &&
      (typeof accountData.balance !== "number" || isNaN(accountData.balance))
    ) {
      throw new Error("Balance must be a valid number");
    }

    if (
      accountData.balance &&
      (accountData.balance < -999999999 || accountData.balance > 999999999)
    ) {
      throw new Error("Balance amount is too large");
    }

    // Check if account name already exists for this business
    const existingAccount = await prisma.account.findFirst({
      where: {
        businessId,
        name: accountData.name.trim(),
        isActive: true,
      },
    });

    if (existingAccount) {
      throw new Error("Account with this name already exists");
    }

    // Verify parent account exists if provided
    if (accountData.parentId) {
      const parentAccount = await prisma.account.findFirst({
        where: {
          id: accountData.parentId,
          businessId,
          isActive: true,
        },
      });

      if (!parentAccount) {
        throw new Error("Parent account not found");
      }
    }

    const account = await prisma.account.create({
      data: {
        name: accountData.name.trim(),
        accountNumber: accountData.accountNumber?.trim() || null,
        accountType: accountData.accountType,
        parentId: accountData.parentId || null,
        description: accountData.description?.trim() || null,
        balance: new Decimal(accountData.balance || 0),
        businessId,
      },
      include: {
        parent: true,
        children: true,
      },
    });

    revalidatePath("/accounts");
    return {
      data: account,
      errorMessage: null,
    };
  } catch (error) {
    console.error("Error creating account:", error);
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Update account
export const updateAccountAction = async (
  accountData: UpdateAccountData,
): Promise<AccountResult> => {
  try {
    const { id, ...updateData } = accountData;

    const account = await prisma.account.update({
      where: { id },
      data: updateData,
      include: {
        parent: true,
        children: true,
      },
    });

    revalidatePath("/accounts");
    return {
      data: account,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Get account by ID
export const getAccountByIdAction = async (
  id: string,
): Promise<AccountResult> => {
  try {
    const account = await prisma.account.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        debitTransactions: {
          take: 10,
          orderBy: { transactionDate: "desc" },
        },
        creditTransactions: {
          take: 10,
          orderBy: { transactionDate: "desc" },
        },
      },
    });

    return {
      data: account,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Get accounts by type
export const getAccountsByTypeAction = async (
  accountType: AccountType,
): Promise<AccountsResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const accounts = await prisma.account.findMany({
      where: {
        businessId,
        accountType,
        isActive: true,
      },
      include: {
        parent: true,
        children: true,
      },
      orderBy: { name: "asc" },
    });

    return {
      data: accounts,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Delete account
export const deleteAccountAction = async (
  id: string,
): Promise<AccountResult> => {
  try {
    // Check if account has transactions
    const transactionCount = await prisma.transaction.count({
      where: {
        OR: [{ debitAccountId: id }, { creditAccountId: id }],
      },
    });

    if (transactionCount > 0) {
      // If has transactions, just deactivate
      const account = await prisma.account.update({
        where: { id },
        data: { isActive: false },
      });

      revalidatePath("/accounts");
      return {
        data: account,
        errorMessage: null,
      };
    } else {
      // If no transactions, actually delete
      const account = await prisma.account.delete({
        where: { id },
      });

      revalidatePath("/accounts");
      return {
        data: account,
        errorMessage: null,
      };
    }
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// ============================================
// TRANSACTION MANAGEMENT
// ============================================

// Get transactions for current business
export const getTransactionsAction = async (
  limit?: number,
  offset?: number,
  accountId?: string,
  transactionType?: TransactionType,
  startDate?: Date,
  endDate?: Date,
): Promise<TransactionsResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const whereClause: any = {
      businessId,
    };

    if (accountId) {
      whereClause.OR = [
        { debitAccountId: accountId },
        { creditAccountId: accountId },
      ];
    }

    if (transactionType) whereClause.type = transactionType;
    if (startDate || endDate) {
      whereClause.transactionDate = {};
      if (startDate) whereClause.transactionDate.gte = startDate;
      if (endDate) whereClause.transactionDate.lte = endDate;
    }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        debitAccount: true,
        creditAccount: true,
        party: {
          select: {
            id: true,
            name: true,
          },
        },
        purchase: {
          select: {
            id: true,
            purchaseNumber: true,
          },
        },
        sale: {
          select: {
            id: true,
            saleNumber: true,
          },
        },
        expense: {
          select: {
            id: true,
            description: true,
          },
        },
      },
      orderBy: { transactionDate: "desc" },
      take: limit,
      skip: offset,
    });

    return {
      data: transactions,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Create transaction
export const createTransactionAction = async (
  transactionData: CreateTransactionData,
): Promise<TransactionResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    // Authentication and authorization
    const supabase = await createSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) throw new Error("User not authenticated");

    const dbUser = await prisma.user.findUnique({
      where: { userId: user.id },
    });

    if (!dbUser) {
      throw new Error("User not found in database");
    }

    // Verify business access
    const businessAccess = await prisma.business.findFirst({
      where: {
        id: businessId,
        OR: [
          { ownerId: dbUser.id },
          { users: { some: { userId: dbUser.id, isActive: true } } },
        ],
      },
    });

    if (!businessAccess) {
      throw new Error("Access denied to business");
    }

    // Input validation
    if (
      !transactionData.description ||
      typeof transactionData.description !== "string" ||
      transactionData.description.trim().length === 0
    ) {
      throw new Error("Transaction description is required");
    }

    if (transactionData.description.trim().length > 500) {
      throw new Error("Description is too long (max 500 characters)");
    }

    if (
      !transactionData.amount ||
      typeof transactionData.amount !== "number" ||
      isNaN(transactionData.amount)
    ) {
      throw new Error("Transaction amount must be a valid number");
    }

    if (transactionData.amount <= 0) {
      throw new Error("Transaction amount must be greater than 0");
    }

    if (transactionData.amount > 999999999) {
      throw new Error("Transaction amount is too large");
    }

    if (
      !transactionData.type ||
      !Object.values(TransactionType).includes(transactionData.type)
    ) {
      throw new Error("Valid transaction type is required");
    }

    if (
      !transactionData.debitAccountId ||
      typeof transactionData.debitAccountId !== "string" ||
      transactionData.debitAccountId.trim().length === 0
    ) {
      throw new Error("Debit account is required");
    }

    if (
      !transactionData.creditAccountId ||
      typeof transactionData.creditAccountId !== "string" ||
      transactionData.creditAccountId.trim().length === 0
    ) {
      throw new Error("Credit account is required");
    }

    if (transactionData.debitAccountId === transactionData.creditAccountId) {
      throw new Error("Debit and credit accounts cannot be the same");
    }

    if (
      transactionData.reference &&
      transactionData.reference.trim().length > 100
    ) {
      throw new Error("Reference is too long (max 100 characters)");
    }

    if (transactionData.notes && transactionData.notes.trim().length > 1000) {
      throw new Error("Notes are too long (max 1000 characters)");
    }

    const result = await prisma.$transaction(async (tx) => {
      // Verify both accounts exist and belong to the business
      const [debitAccount, creditAccount] = await Promise.all([
        tx.account.findFirst({
          where: {
            id: transactionData.debitAccountId.trim(),
            businessId,
            isActive: true,
          },
        }),
        tx.account.findFirst({
          where: {
            id: transactionData.creditAccountId.trim(),
            businessId,
            isActive: true,
          },
        }),
      ]);

      if (!debitAccount) {
        throw new Error("Debit account not found or inactive");
      }

      if (!creditAccount) {
        throw new Error("Credit account not found or inactive");
      }

      // Verify referenced entities if provided
      if (transactionData.partyId) {
        const party = await tx.party.findFirst({
          where: {
            id: transactionData.partyId,
            businessId,
            isActive: true,
          },
        });

        if (!party) {
          throw new Error("Referenced party not found");
        }
      }

      if (transactionData.saleId) {
        const sale = await tx.sale.findFirst({
          where: {
            id: transactionData.saleId,
            businessId,
          },
        });

        if (!sale) {
          throw new Error("Referenced sale not found");
        }
      }

      if (transactionData.purchaseId) {
        const purchase = await tx.purchase.findFirst({
          where: {
            id: transactionData.purchaseId,
            businessId,
          },
        });

        if (!purchase) {
          throw new Error("Referenced purchase not found");
        }
      }

      if (transactionData.expenseId) {
        const expense = await tx.expense.findFirst({
          where: {
            id: transactionData.expenseId,
            businessId,
          },
        });

        if (!expense) {
          throw new Error("Referenced expense not found");
        }
      }

      // Create transaction
      const transaction = await tx.transaction.create({
        data: {
          description: transactionData.description.trim(),
          amount: new Decimal(transactionData.amount),
          type: transactionData.type,
          debitAccountId: transactionData.debitAccountId.trim(),
          creditAccountId: transactionData.creditAccountId.trim(),
          reference: transactionData.reference?.trim() || null,
          notes: transactionData.notes?.trim() || null,
          purchaseId: transactionData.purchaseId || null,
          saleId: transactionData.saleId || null,
          partyId: transactionData.partyId || null,
          expenseId: transactionData.expenseId || null,
          businessId,
        },
        include: {
          debitAccount: true,
          creditAccount: true,
        },
      });

      // Update account balances atomically
      await Promise.all([
        tx.account.update({
          where: { id: transactionData.debitAccountId.trim() },
          data: {
            balance: {
              increment: transactionData.amount,
            },
          },
        }),
        tx.account.update({
          where: { id: transactionData.creditAccountId.trim() },
          data: {
            balance: {
              decrement: transactionData.amount,
            },
          },
        }),
      ]);

      return transaction;
    });

    revalidatePath("/accounts");
    return {
      data: result,
      errorMessage: null,
    };
  } catch (error) {
    console.error("Error creating transaction:", error);
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Get transaction by ID
export const getTransactionByIdAction = async (
  id: string,
): Promise<TransactionResult> => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        debitAccount: true,
        creditAccount: true,
        party: true,
        purchase: true,
        sale: true,
        expense: true,
      },
    });

    return {
      data: transaction,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Get account balance
export const getAccountBalanceAction = async (
  accountId: string,
): Promise<{
  data: { balance: number; debitTotal: number; creditTotal: number } | null;
  errorMessage: string | null;
}> => {
  try {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { balance: true },
    });

    if (!account) {
      throw new Error("Account not found");
    }

    // Calculate totals from transactions
    const debitTotal = await prisma.transaction.aggregate({
      where: { debitAccountId: accountId },
      _sum: { amount: true },
    });

    const creditTotal = await prisma.transaction.aggregate({
      where: { creditAccountId: accountId },
      _sum: { amount: true },
    });

    return {
      data: {
        balance: account.balance.toNumber(),
        debitTotal: debitTotal._sum.amount?.toNumber() || 0,
        creditTotal: creditTotal._sum.amount?.toNumber() || 0,
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
