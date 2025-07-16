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

    const account = await prisma.account.create({
      data: {
        ...accountData,
        businessId,
        balance: accountData.balance || 0,
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

    const result = await prisma.$transaction(async (tx) => {
      // Create transaction
      const transaction = await tx.transaction.create({
        data: {
          ...transactionData,
          businessId,
        },
        include: {
          debitAccount: true,
          creditAccount: true,
        },
      });

      // Update account balances
      await tx.account.update({
        where: { id: transactionData.debitAccountId },
        data: {
          balance: {
            increment: transactionData.amount,
          },
        },
      });

      await tx.account.update({
        where: { id: transactionData.creditAccountId },
        data: {
          balance: {
            decrement: transactionData.amount,
          },
        },
      });

      return transaction;
    });

    revalidatePath("/accounts");
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
