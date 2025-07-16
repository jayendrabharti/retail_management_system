"use server";

import prisma from "@/prisma/client";
import { PriceHistory } from "@prisma/client";
import { getCurrentBusinessId } from "./businesses";
import { getErrorMessage } from "@/utils/utils";
import { revalidatePath } from "next/cache";

// Types
interface CreatePriceHistoryData {
  productId: string;
  costPrice?: number;
  sellingPrice?: number;
  mrp?: number;
  reason?: string;
  effectiveFrom?: Date;
}

interface PriceHistoryResult {
  data: PriceHistory | null;
  errorMessage: string | null;
}

interface PriceHistoriesResult {
  data: PriceHistory[] | null;
  errorMessage: string | null;
}

interface PriceChangeData {
  productId: string;
  newCostPrice?: number;
  newSellingPrice?: number;
  newMrp?: number;
  reason: string;
  effectiveFrom?: Date;
}

// Get price history for a product
export const getPriceHistoryAction = async (
  productId: string,
  limit?: number,
  offset?: number,
): Promise<PriceHistoriesResult> => {
  try {
    const priceHistory = await prisma.priceHistory.findMany({
      where: { productId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
      },
      orderBy: { effectiveFrom: "desc" },
      take: limit,
      skip: offset,
    });

    return {
      data: priceHistory,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Create price history entry
export const createPriceHistoryAction = async (
  priceData: CreatePriceHistoryData,
): Promise<PriceHistoryResult> => {
  try {
    const priceHistory = await prisma.priceHistory.create({
      data: {
        ...priceData,
        effectiveFrom: priceData.effectiveFrom || new Date(),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
      },
    });

    return {
      data: priceHistory,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Update product prices and create history entry
export const updateProductPricesAction = async (
  priceChangeData: PriceChangeData,
): Promise<{
  priceHistory: PriceHistory | null;
  errorMessage: string | null;
}> => {
  try {
    const {
      productId,
      newCostPrice,
      newSellingPrice,
      newMrp,
      reason,
      effectiveFrom,
    } = priceChangeData;

    const result = await prisma.$transaction(async (tx) => {
      // Get current product prices
      const currentProduct = await tx.product.findUnique({
        where: { id: productId },
        select: {
          costPrice: true,
          sellingPrice: true,
          mrp: true,
        },
      });

      if (!currentProduct) {
        throw new Error("Product not found");
      }

      // Create price history entry with old prices
      const priceHistory = await tx.priceHistory.create({
        data: {
          productId,
          costPrice: newCostPrice || currentProduct.costPrice,
          sellingPrice: newSellingPrice || currentProduct.sellingPrice,
          mrp: newMrp || currentProduct.mrp,
          reason,
          effectiveFrom: effectiveFrom || new Date(),
        },
      });

      // Update product with new prices
      const updateData: any = {};
      if (newCostPrice !== undefined) updateData.costPrice = newCostPrice;
      if (newSellingPrice !== undefined)
        updateData.sellingPrice = newSellingPrice;
      if (newMrp !== undefined) updateData.mrp = newMrp;

      if (Object.keys(updateData).length > 0) {
        await tx.product.update({
          where: { id: productId },
          data: updateData,
        });
      }

      return priceHistory;
    });

    revalidatePath("/products");
    return {
      priceHistory: result,
      errorMessage: null,
    };
  } catch (error) {
    return {
      priceHistory: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Get price history by ID
export const getPriceHistoryByIdAction = async (
  id: string,
): Promise<PriceHistoryResult> => {
  try {
    const priceHistory = await prisma.priceHistory.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
      },
    });

    return {
      data: priceHistory,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Get price trends for a product
export const getPriceTrendsAction = async (
  productId: string,
  startDate?: Date,
  endDate?: Date,
): Promise<{
  data: {
    costPriceTrend: any[];
    sellingPriceTrend: any[];
    mrpTrend: any[];
  } | null;
  errorMessage: string | null;
}> => {
  try {
    const whereClause: any = { productId };

    if (startDate || endDate) {
      whereClause.effectiveFrom = {};
      if (startDate) whereClause.effectiveFrom.gte = startDate;
      if (endDate) whereClause.effectiveFrom.lte = endDate;
    }

    const priceHistory = await prisma.priceHistory.findMany({
      where: whereClause,
      orderBy: { effectiveFrom: "asc" },
      select: {
        effectiveFrom: true,
        costPrice: true,
        sellingPrice: true,
        mrp: true,
        reason: true,
      },
    });

    const costPriceTrend = priceHistory
      .filter((p) => p.costPrice !== null)
      .map((p) => ({
        date: p.effectiveFrom,
        price: p.costPrice?.toNumber(),
        reason: p.reason,
      }));

    const sellingPriceTrend = priceHistory
      .filter((p) => p.sellingPrice !== null)
      .map((p) => ({
        date: p.effectiveFrom,
        price: p.sellingPrice?.toNumber(),
        reason: p.reason,
      }));

    const mrpTrend = priceHistory
      .filter((p) => p.mrp !== null)
      .map((p) => ({
        date: p.effectiveFrom,
        price: p.mrp?.toNumber(),
        reason: p.reason,
      }));

    return {
      data: {
        costPriceTrend,
        sellingPriceTrend,
        mrpTrend,
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

// Get all price changes for current business
export const getAllPriceChangesAction = async (
  startDate?: Date,
  endDate?: Date,
  limit?: number,
  offset?: number,
): Promise<PriceHistoriesResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const whereClause: any = {
      product: {
        businessId,
      },
    };

    if (startDate || endDate) {
      whereClause.effectiveFrom = {};
      if (startDate) whereClause.effectiveFrom.gte = startDate;
      if (endDate) whereClause.effectiveFrom.lte = endDate;
    }

    const priceHistory = await prisma.priceHistory.findMany({
      where: whereClause,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { effectiveFrom: "desc" },
      take: limit,
      skip: offset,
    });

    return {
      data: priceHistory,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Get price changes by reason
export const getPriceChangesByReasonAction = async (
  reason: string,
): Promise<PriceHistoriesResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const priceHistory = await prisma.priceHistory.findMany({
      where: {
        reason: {
          contains: reason,
          mode: "insensitive",
        },
        product: {
          businessId,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
      },
      orderBy: { effectiveFrom: "desc" },
    });

    return {
      data: priceHistory,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Bulk price update
export const bulkPriceUpdateAction = async (
  updates: Array<{
    productId: string;
    newCostPrice?: number;
    newSellingPrice?: number;
    newMrp?: number;
  }>,
  reason: string,
): Promise<{ data: PriceHistory[] | null; errorMessage: string | null }> => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const priceHistories: PriceHistory[] = [];

      for (const update of updates) {
        // Get current product prices
        const currentProduct = await tx.product.findUnique({
          where: { id: update.productId },
          select: {
            costPrice: true,
            sellingPrice: true,
            mrp: true,
          },
        });

        if (!currentProduct) {
          continue; // Skip if product not found
        }

        // Create price history entry
        const priceHistory = await tx.priceHistory.create({
          data: {
            productId: update.productId,
            costPrice: update.newCostPrice || currentProduct.costPrice,
            sellingPrice: update.newSellingPrice || currentProduct.sellingPrice,
            mrp: update.newMrp || currentProduct.mrp,
            reason,
            effectiveFrom: new Date(),
          },
        });

        priceHistories.push(priceHistory);

        // Update product prices
        const updateData: any = {};
        if (update.newCostPrice !== undefined)
          updateData.costPrice = update.newCostPrice;
        if (update.newSellingPrice !== undefined)
          updateData.sellingPrice = update.newSellingPrice;
        if (update.newMrp !== undefined) updateData.mrp = update.newMrp;

        if (Object.keys(updateData).length > 0) {
          await tx.product.update({
            where: { id: update.productId },
            data: updateData,
          });
        }
      }

      return priceHistories;
    });

    revalidatePath("/products");
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
