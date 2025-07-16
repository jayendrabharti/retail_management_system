"use server";

import prisma from "@/prisma/client";
import { TaxRate, DiscountScheme, DiscountType } from "@prisma/client";
import { getCurrentBusinessId } from "./businesses";
import { getErrorMessage } from "@/utils/utils";
import { revalidatePath } from "next/cache";

// Types
interface CreateTaxRateData {
  name: string;
  rate: number;
}

interface UpdateTaxRateData {
  id: string;
  name?: string;
  rate?: number;
  isActive?: boolean;
}

interface CreateDiscountSchemeData {
  name: string;
  description?: string;
  type: DiscountType;
  value: number;
  minQuantity?: number;
  minAmount?: number;
  validFrom: Date;
  validUntil?: Date;
}

interface UpdateDiscountSchemeData {
  id: string;
  name?: string;
  description?: string;
  type?: DiscountType;
  value?: number;
  minQuantity?: number;
  minAmount?: number;
  validFrom?: Date;
  validUntil?: Date;
  isActive?: boolean;
}

interface TaxRateResult {
  data: TaxRate | null;
  errorMessage: string | null;
}

interface TaxRatesResult {
  data: TaxRate[] | null;
  errorMessage: string | null;
}

interface DiscountSchemeResult {
  data: DiscountScheme | null;
  errorMessage: string | null;
}

interface DiscountSchemesResult {
  data: DiscountScheme[] | null;
  errorMessage: string | null;
}

// ============================================
// TAX RATE MANAGEMENT
// ============================================

// Get all tax rates for current business
export const getTaxRatesAction = async (): Promise<TaxRatesResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const taxRates = await prisma.taxRate.findMany({
      where: {
        businessId,
        isActive: true,
      },
      orderBy: { name: "asc" },
    });

    return {
      data: taxRates,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Create tax rate
export const createTaxRateAction = async (
  taxRateData: CreateTaxRateData,
): Promise<TaxRateResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const taxRate = await prisma.taxRate.create({
      data: {
        ...taxRateData,
        businessId,
      },
    });

    revalidatePath("/");
    return {
      data: taxRate,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Update tax rate
export const updateTaxRateAction = async (
  taxRateData: UpdateTaxRateData,
): Promise<TaxRateResult> => {
  try {
    const { id, ...updateData } = taxRateData;

    const taxRate = await prisma.taxRate.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/");
    return {
      data: taxRate,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Get tax rate by ID
export const getTaxRateByIdAction = async (
  id: string,
): Promise<TaxRateResult> => {
  try {
    const taxRate = await prisma.taxRate.findUnique({
      where: { id },
    });

    return {
      data: taxRate,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Delete tax rate
export const deleteTaxRateAction = async (
  id: string,
): Promise<TaxRateResult> => {
  try {
    const taxRate = await prisma.taxRate.update({
      where: { id },
      data: { isActive: false },
    });

    revalidatePath("/");
    return {
      data: taxRate,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// ============================================
// DISCOUNT SCHEME MANAGEMENT
// ============================================

// Get all discount schemes for current business
export const getDiscountSchemesAction =
  async (): Promise<DiscountSchemesResult> => {
    try {
      const businessId = await getCurrentBusinessId();
      if (!businessId) {
        throw new Error("No business selected");
      }

      const discountSchemes = await prisma.discountScheme.findMany({
        where: {
          businessId,
          isActive: true,
        },
        orderBy: { name: "asc" },
      });

      return {
        data: discountSchemes,
        errorMessage: null,
      };
    } catch (error) {
      return {
        data: null,
        errorMessage: getErrorMessage(error),
      };
    }
  };

// Get active discount schemes
export const getActiveDiscountSchemesAction =
  async (): Promise<DiscountSchemesResult> => {
    try {
      const businessId = await getCurrentBusinessId();
      if (!businessId) {
        throw new Error("No business selected");
      }

      const now = new Date();
      const discountSchemes = await prisma.discountScheme.findMany({
        where: {
          businessId,
          isActive: true,
          validFrom: { lte: now },
          OR: [{ validUntil: null }, { validUntil: { gte: now } }],
        },
        orderBy: { name: "asc" },
      });

      return {
        data: discountSchemes,
        errorMessage: null,
      };
    } catch (error) {
      return {
        data: null,
        errorMessage: getErrorMessage(error),
      };
    }
  };

// Create discount scheme
export const createDiscountSchemeAction = async (
  discountSchemeData: CreateDiscountSchemeData,
): Promise<DiscountSchemeResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const discountScheme = await prisma.discountScheme.create({
      data: {
        ...discountSchemeData,
        businessId,
      },
    });

    revalidatePath("/");
    return {
      data: discountScheme,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Update discount scheme
export const updateDiscountSchemeAction = async (
  discountSchemeData: UpdateDiscountSchemeData,
): Promise<DiscountSchemeResult> => {
  try {
    const { id, ...updateData } = discountSchemeData;

    const discountScheme = await prisma.discountScheme.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/");
    return {
      data: discountScheme,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Get discount scheme by ID
export const getDiscountSchemeByIdAction = async (
  id: string,
): Promise<DiscountSchemeResult> => {
  try {
    const discountScheme = await prisma.discountScheme.findUnique({
      where: { id },
    });

    return {
      data: discountScheme,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Delete discount scheme
export const deleteDiscountSchemeAction = async (
  id: string,
): Promise<DiscountSchemeResult> => {
  try {
    const discountScheme = await prisma.discountScheme.update({
      where: { id },
      data: { isActive: false },
    });

    revalidatePath("/");
    return {
      data: discountScheme,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Calculate applicable discount
export const calculateDiscountAction = async (
  orderAmount: number,
  quantity: number,
): Promise<{
  data: {
    discountAmount: number;
    discountScheme: DiscountScheme | null;
  } | null;
  errorMessage: string | null;
}> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const now = new Date();
    const applicableSchemes = await prisma.discountScheme.findMany({
      where: {
        businessId,
        isActive: true,
        validFrom: { lte: now },
        OR: [{ validUntil: null }, { validUntil: { gte: now } }],
        AND: [
          {
            OR: [{ minAmount: null }, { minAmount: { lte: orderAmount } }],
          },
          {
            OR: [{ minQuantity: null }, { minQuantity: { lte: quantity } }],
          },
        ],
      },
      orderBy: { value: "desc" }, // Get the highest discount first
    });

    if (applicableSchemes.length === 0) {
      return {
        data: { discountAmount: 0, discountScheme: null },
        errorMessage: null,
      };
    }

    const bestScheme = applicableSchemes[0];
    let discountAmount = 0;

    if (bestScheme.type === "PERCENTAGE") {
      discountAmount = (orderAmount * bestScheme.value.toNumber()) / 100;
    } else if (bestScheme.type === "FIXED_AMOUNT") {
      discountAmount = bestScheme.value.toNumber();
    }

    return {
      data: { discountAmount, discountScheme: bestScheme },
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};
