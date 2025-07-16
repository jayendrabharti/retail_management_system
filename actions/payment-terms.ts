"use server";

import prisma from "@/prisma/client";
import { PaymentTerm } from "@prisma/client";
import { getCurrentBusinessId } from "./businesses";
import { getErrorMessage } from "@/utils/utils";
import { revalidatePath } from "next/cache";

// Types
interface CreatePaymentTermData {
  name: string;
  description?: string;
  daysNet?: number;
  discountDays?: number;
  discountPercent?: number;
}

interface UpdatePaymentTermData {
  id: string;
  name?: string;
  description?: string;
  daysNet?: number;
  discountDays?: number;
  discountPercent?: number;
  isActive?: boolean;
}

interface PaymentTermResult {
  data: PaymentTerm | null;
  errorMessage: string | null;
}

interface PaymentTermsResult {
  data: PaymentTerm[] | null;
  errorMessage: string | null;
}

// Get all payment terms for current business
export const getPaymentTermsAction = async (): Promise<PaymentTermsResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const paymentTerms = await prisma.paymentTerm.findMany({
      where: {
        businessId,
        isActive: true,
      },
      orderBy: { name: "asc" },
    });

    return {
      data: paymentTerms,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Create payment term
export const createPaymentTermAction = async (
  paymentTermData: CreatePaymentTermData,
): Promise<PaymentTermResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const paymentTerm = await prisma.paymentTerm.create({
      data: {
        ...paymentTermData,
        businessId,
      },
    });

    revalidatePath("/");
    return {
      data: paymentTerm,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Update payment term
export const updatePaymentTermAction = async (
  paymentTermData: UpdatePaymentTermData,
): Promise<PaymentTermResult> => {
  try {
    const { id, ...updateData } = paymentTermData;

    const paymentTerm = await prisma.paymentTerm.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/");
    return {
      data: paymentTerm,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Get payment term by ID
export const getPaymentTermByIdAction = async (
  id: string,
): Promise<PaymentTermResult> => {
  try {
    const paymentTerm = await prisma.paymentTerm.findUnique({
      where: { id },
    });

    return {
      data: paymentTerm,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Delete payment term
export const deletePaymentTermAction = async (
  id: string,
): Promise<PaymentTermResult> => {
  try {
    // Check if payment term is being used
    const partiesUsingTerm = await prisma.party.count({
      where: { paymentTermId: id },
    });

    const purchasesUsingTerm = await prisma.purchase.count({
      where: { paymentTermId: id },
    });

    const salesUsingTerm = await prisma.sale.count({
      where: { paymentTermId: id },
    });

    if (partiesUsingTerm > 0 || purchasesUsingTerm > 0 || salesUsingTerm > 0) {
      // If being used, just deactivate
      const paymentTerm = await prisma.paymentTerm.update({
        where: { id },
        data: { isActive: false },
      });

      revalidatePath("/");
      return {
        data: paymentTerm,
        errorMessage: null,
      };
    } else {
      // If not being used, actually delete
      const paymentTerm = await prisma.paymentTerm.delete({
        where: { id },
      });

      revalidatePath("/");
      return {
        data: paymentTerm,
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

// Toggle payment term status
export const togglePaymentTermStatusAction = async (
  id: string,
): Promise<PaymentTermResult> => {
  try {
    const currentTerm = await prisma.paymentTerm.findUnique({
      where: { id },
      select: { isActive: true },
    });

    if (!currentTerm) {
      throw new Error("Payment term not found");
    }

    const paymentTerm = await prisma.paymentTerm.update({
      where: { id },
      data: { isActive: !currentTerm.isActive },
    });

    revalidatePath("/");
    return {
      data: paymentTerm,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};
