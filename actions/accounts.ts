"use server";

import prisma from "@/prisma/client";
import {
  Account,
  Transaction,
  AccountType,
  TransactionType,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { createSupabaseClient } from "@/supabase/server";
import { getErrorMessage } from "@/utils/utils";
import { revalidatePath } from "next/cache";
import { getCurrentBusinessId } from "./businesses";

// Types
interface CreateAccountData {
  name: string;
  accountNumber?: string;
  accountType: AccountType;
  parentId?: string;
  description?: string;
  initialBalance?: number;
}

interface UpdateAccountData {
  id: string;
  name?: string;
  accountNumber?: string;
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
  transactionDate?: Date;
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
        children: {
          where: { isActive: true },
        },
        _count: {
          select: {
            debitTransactions: true,
            creditTransactions: true,
          },
        },
      },
      orderBy: [{ accountType: "asc" }, { name: "asc" }],
    });

    return { data: accounts, errorMessage: null };
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Get account by ID
export const getAccountAction = async (id: string): Promise<AccountResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const account = await prisma.account.findFirst({
      where: {
        id,
        businessId,
      },
      include: {
        parent: true,
        children: {
          where: { isActive: true },
        },
        debitTransactions: {
          orderBy: { transactionDate: "desc" },
          take: 20,
          include: {
            creditAccount: true,
            purchase: true,
            sale: true,
            party: true,
            expense: true,
          },
        },
        creditTransactions: {
          orderBy: { transactionDate: "desc" },
          take: 20,
          include: {
            debitAccount: true,
            purchase: true,
            sale: true,
            party: true,
            expense: true,
          },
        },
      },
    });

    if (!account) {
      throw new Error("Account not found");
    }

    return { data: account, errorMessage: null };
  } catch (error) {
    console.error("Error fetching account:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Create new account
export const createAccountAction = async (
  data: CreateAccountData,
): Promise<AccountResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    // Check if account name already exists
    const existingAccount = await prisma.account.findFirst({
      where: {
        name: data.name,
        businessId,
        isActive: true,
      },
    });

    if (existingAccount) {
      throw new Error("Account name already exists");
    }

    // Verify parent account exists if provided
    if (data.parentId) {
      const parentAccount = await prisma.account.findFirst({
        where: {
          id: data.parentId,
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
        name: data.name,
        accountNumber: data.accountNumber,
        accountType: data.accountType,
        parentId: data.parentId,
        description: data.description,
        balance: new Decimal(data.initialBalance || 0),
        businessId,
      },
      include: {
        parent: true,
      },
    });

    revalidatePath("/accounts");
    revalidatePath("/dashboard");

    return { data: account, errorMessage: null };
  } catch (error) {
    console.error("Error creating account:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Update account
export const updateAccountAction = async (
  data: UpdateAccountData,
): Promise<AccountResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    // Verify account exists
    const existingAccount = await prisma.account.findFirst({
      where: {
        id: data.id,
        businessId,
      },
    });

    if (!existingAccount) {
      throw new Error("Account not found");
    }

    // Check if new name conflicts (if name is being changed)
    if (data.name && data.name !== existingAccount.name) {
      const nameConflict = await prisma.account.findFirst({
        where: {
          name: data.name,
          businessId,
          isActive: true,
          id: { not: data.id },
        },
      });

      if (nameConflict) {
        throw new Error("Account name already exists");
      }
    }

    const account = await prisma.account.update({
      where: {
        id: data.id,
      },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.accountNumber !== undefined && {
          accountNumber: data.accountNumber,
        }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        updatedAt: new Date(),
      },
      include: {
        parent: true,
        children: {
          where: { isActive: true },
        },
      },
    });

    revalidatePath("/accounts");
    revalidatePath("/dashboard");

    return { data: account, errorMessage: null };
  } catch (error) {
    console.error("Error updating account:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Get account balance
export const getAccountBalanceAction = async (accountId: string) => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        businessId,
      },
    });

    if (!account) {
      throw new Error("Account not found");
    }

    return {
      data: {
        accountId,
        accountName: account.name,
        balance: account.balance.toNumber(),
        accountType: account.accountType,
      },
      errorMessage: null,
    };
  } catch (error) {
    console.error("Error fetching account balance:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Get all transactions
export const getTransactionsAction = async (
  accountId?: string,
  limit: number = 50,
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

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        debitAccount: true,
        creditAccount: true,
        purchase: {
          include: {
            party: { select: { name: true } },
          },
        },
        sale: {
          include: {
            party: { select: { name: true } },
          },
        },
        party: { select: { name: true } },
        expense: true,
      },
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      take: limit,
    });

    return { data: transactions, errorMessage: null };
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Create manual transaction
export const createTransactionAction = async (
  data: CreateTransactionData,
): Promise<TransactionResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    // Verify both accounts exist and belong to business
    const [debitAccount, creditAccount] = await Promise.all([
      prisma.account.findFirst({
        where: {
          id: data.debitAccountId,
          businessId,
          isActive: true,
        },
      }),
      prisma.account.findFirst({
        where: {
          id: data.creditAccountId,
          businessId,
          isActive: true,
        },
      }),
    ]);

    if (!debitAccount) {
      throw new Error("Debit account not found");
    }

    if (!creditAccount) {
      throw new Error("Credit account not found");
    }

    if (data.amount <= 0) {
      throw new Error("Transaction amount must be greater than 0");
    }

    const transaction = await prisma.$transaction(async (tx) => {
      // Create transaction record
      const newTransaction = await tx.transaction.create({
        data: {
          description: data.description,
          amount: new Decimal(data.amount),
          type: data.type,
          debitAccountId: data.debitAccountId,
          creditAccountId: data.creditAccountId,
          reference: data.reference,
          notes: data.notes,
          transactionDate: data.transactionDate || new Date(),
          businessId,
          purchaseId: data.purchaseId,
          saleId: data.saleId,
          partyId: data.partyId,
          expenseId: data.expenseId,
        },
        include: {
          debitAccount: true,
          creditAccount: true,
        },
      });

      // Update account balances
      await tx.account.update({
        where: { id: data.debitAccountId },
        data: {
          balance: {
            increment: data.amount,
          },
          updatedAt: new Date(),
        },
      });

      await tx.account.update({
        where: { id: data.creditAccountId },
        data: {
          balance: {
            decrement: data.amount,
          },
          updatedAt: new Date(),
        },
      });

      return newTransaction;
    });

    revalidatePath("/accounts");
    revalidatePath("/transactions");
    revalidatePath("/dashboard");

    return { data: transaction, errorMessage: null };
  } catch (error) {
    console.error("Error creating transaction:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Get trial balance
export const getTrialBalanceAction = async () => {
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
      orderBy: [{ accountType: "asc" }, { name: "asc" }],
    });

    let totalDebits = 0;
    let totalCredits = 0;

    const trialBalanceData = accounts.map((account) => {
      const balance = account.balance.toNumber();
      const isDebitBalance = balance >= 0;

      if (isDebitBalance) {
        totalDebits += Math.abs(balance);
      } else {
        totalCredits += Math.abs(balance);
      }

      return {
        accountId: account.id,
        accountName: account.name,
        accountType: account.accountType,
        debitBalance: isDebitBalance ? Math.abs(balance) : 0,
        creditBalance: !isDebitBalance ? Math.abs(balance) : 0,
      };
    });

    return {
      data: {
        accounts: trialBalanceData,
        totals: {
          debits: totalDebits,
          credits: totalCredits,
          difference: totalDebits - totalCredits,
        },
        isBalanced: Math.abs(totalDebits - totalCredits) < 0.01, // Allow for minor rounding differences
      },
      errorMessage: null,
    };
  } catch (error) {
    console.error("Error generating trial balance:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Get profit and loss statement
export const getProfitLossAction = async (dateFrom: Date, dateTo: Date) => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    // Get revenue accounts (REVENUE type)
    const revenueAccounts = await prisma.account.findMany({
      where: {
        businessId,
        accountType: AccountType.REVENUE,
        isActive: true,
      },
      include: {
        creditTransactions: {
          where: {
            transactionDate: {
              gte: dateFrom,
              lte: dateTo,
            },
          },
        },
      },
    });

    // Get expense accounts (EXPENSE type)
    const expenseAccounts = await prisma.account.findMany({
      where: {
        businessId,
        accountType: AccountType.EXPENSE,
        isActive: true,
      },
      include: {
        debitTransactions: {
          where: {
            transactionDate: {
              gte: dateFrom,
              lte: dateTo,
            },
          },
        },
      },
    });

    // Calculate total revenue
    let totalRevenue = 0;
    const revenueData = revenueAccounts.map((account) => {
      const amount = account.creditTransactions.reduce(
        (sum, transaction) => sum + transaction.amount.toNumber(),
        0,
      );
      totalRevenue += amount;
      return {
        accountName: account.name,
        amount,
      };
    });

    // Calculate total expenses
    let totalExpenses = 0;
    const expenseData = expenseAccounts.map((account) => {
      const amount = account.debitTransactions.reduce(
        (sum, transaction) => sum + transaction.amount.toNumber(),
        0,
      );
      totalExpenses += amount;
      return {
        accountName: account.name,
        amount,
      };
    });

    const netProfit = totalRevenue - totalExpenses;

    return {
      data: {
        period: {
          from: dateFrom,
          to: dateTo,
        },
        revenue: {
          accounts: revenueData,
          total: totalRevenue,
        },
        expenses: {
          accounts: expenseData,
          total: totalExpenses,
        },
        netProfit,
        profitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
      },
      errorMessage: null,
    };
  } catch (error) {
    console.error("Error generating profit & loss statement:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Get balance sheet
export const getBalanceSheetAction = async (asOfDate: Date) => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    // Get all accounts with their balances as of the specified date
    const accounts = await prisma.account.findMany({
      where: {
        businessId,
        isActive: true,
      },
    });

    // Categorize accounts
    const assets = accounts.filter(
      (acc) =>
        acc.accountType === AccountType.ASSET ||
        acc.accountType === AccountType.CASH ||
        acc.accountType === AccountType.BANK ||
        acc.accountType === AccountType.ACCOUNTS_RECEIVABLE ||
        acc.accountType === AccountType.INVENTORY,
    );

    const liabilities = accounts.filter(
      (acc) =>
        acc.accountType === AccountType.LIABILITY ||
        acc.accountType === AccountType.ACCOUNTS_PAYABLE,
    );

    const equity = accounts.filter(
      (acc) => acc.accountType === AccountType.EQUITY,
    );

    const totalAssets = assets.reduce(
      (sum, acc) => sum + acc.balance.toNumber(),
      0,
    );
    const totalLiabilities = liabilities.reduce(
      (sum, acc) => sum + acc.balance.toNumber(),
      0,
    );
    const totalEquity = equity.reduce(
      (sum, acc) => sum + acc.balance.toNumber(),
      0,
    );

    return {
      data: {
        asOfDate,
        assets: {
          accounts: assets.map((acc) => ({
            name: acc.name,
            balance: acc.balance.toNumber(),
          })),
          total: totalAssets,
        },
        liabilities: {
          accounts: liabilities.map((acc) => ({
            name: acc.name,
            balance: acc.balance.toNumber(),
          })),
          total: totalLiabilities,
        },
        equity: {
          accounts: equity.map((acc) => ({
            name: acc.name,
            balance: acc.balance.toNumber(),
          })),
          total: totalEquity,
        },
        totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
        isBalanced:
          Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
      },
      errorMessage: null,
    };
  } catch (error) {
    console.error("Error generating balance sheet:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};
