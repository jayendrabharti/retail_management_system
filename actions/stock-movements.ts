"use server";

import prisma from "@/prisma/client";
import { StockMovement, MovementType } from "@prisma/client";
import { getCurrentBusinessId } from "./businesses";
import { getErrorMessage } from "@/utils/utils";
import { revalidatePath } from "next/cache";

// Types
interface CreateStockMovementData {
  productId: string;
  type: MovementType;
  quantity: number;
  reference?: string;
  reason?: string;
  notes?: string;
  createdBy?: string;
}

interface StockMovementResult {
  data: StockMovement | null;
  errorMessage: string | null;
}

interface StockMovementsResult {
  data: StockMovement[] | null;
  errorMessage: string | null;
}

interface StockSummary {
  totalIn: number;
  totalOut: number;
  netChange: number;
}

// Get stock movements for current business
export const getStockMovementsAction = async (
  limit?: number,
  offset?: number,
  productId?: string,
  movementType?: MovementType,
  startDate?: Date,
  endDate?: Date,
): Promise<StockMovementsResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const whereClause: any = {
      businessId,
    };

    if (productId) whereClause.productId = productId;
    if (movementType) whereClause.type = movementType;
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = startDate;
      if (endDate) whereClause.createdAt.lte = endDate;
    }

    const stockMovements = await prisma.stockMovement.findMany({
      where: whereClause,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    return {
      data: stockMovements,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Create stock movement and update inventory
export const createStockMovementAction = async (
  movementData: CreateStockMovementData,
): Promise<StockMovementResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create stock movement
      const stockMovement = await tx.stockMovement.create({
        data: {
          ...movementData,
          businessId,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              image: true,
            },
          },
        },
      });

      // Update inventory
      const inventory = await tx.inventory.findUnique({
        where: {
          productId_businessId: {
            productId: movementData.productId,
            businessId,
          },
        },
      });

      if (inventory) {
        const newQuantity =
          movementData.type === "IN"
            ? inventory.quantity + movementData.quantity
            : inventory.quantity - movementData.quantity;

        await tx.inventory.update({
          where: {
            productId_businessId: {
              productId: movementData.productId,
              businessId,
            },
          },
          data: {
            quantity: newQuantity,
            availableQty: newQuantity - inventory.reservedQty,
            lastUpdated: new Date(),
          },
        });
      } else {
        // Create new inventory record if it doesn't exist
        const initialQuantity =
          movementData.type === "IN" ? movementData.quantity : 0;
        await tx.inventory.create({
          data: {
            productId: movementData.productId,
            businessId,
            quantity: initialQuantity,
            reservedQty: 0,
            availableQty: initialQuantity,
          },
        });
      }

      return stockMovement;
    });

    revalidatePath("/inventory");
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

// Get stock movements by product
export const getStockMovementsByProductAction = async (
  productId: string,
): Promise<StockMovementsResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const stockMovements = await prisma.stockMovement.findMany({
      where: {
        productId,
        businessId,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      data: stockMovements,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Get stock summary for a product
export const getStockSummaryAction = async (
  productId: string,
  startDate?: Date,
  endDate?: Date,
): Promise<{ data: StockSummary | null; errorMessage: string | null }> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const whereClause: any = {
      productId,
      businessId,
    };

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = startDate;
      if (endDate) whereClause.createdAt.lte = endDate;
    }

    const movements = await prisma.stockMovement.findMany({
      where: whereClause,
      select: {
        type: true,
        quantity: true,
      },
    });

    const summary = movements.reduce(
      (acc, movement) => {
        if (movement.type === "IN") {
          acc.totalIn += movement.quantity;
        } else {
          acc.totalOut += movement.quantity;
        }
        return acc;
      },
      { totalIn: 0, totalOut: 0, netChange: 0 },
    );

    summary.netChange = summary.totalIn - summary.totalOut;

    return {
      data: summary,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Bulk stock adjustment
export const bulkStockAdjustmentAction = async (
  adjustments: Array<{
    productId: string;
    quantity: number;
    reason: string;
    notes?: string;
  }>,
): Promise<{ data: StockMovement[] | null; errorMessage: string | null }> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const result = await prisma.$transaction(async (tx) => {
      const stockMovements: StockMovement[] = [];

      for (const adjustment of adjustments) {
        // Create stock movement
        const stockMovement = await tx.stockMovement.create({
          data: {
            productId: adjustment.productId,
            businessId,
            type: adjustment.quantity > 0 ? "IN" : "OUT",
            quantity: Math.abs(adjustment.quantity),
            reason: adjustment.reason,
            notes: adjustment.notes,
          },
        });

        stockMovements.push(stockMovement);

        // Update inventory
        const inventory = await tx.inventory.findUnique({
          where: {
            productId_businessId: {
              productId: adjustment.productId,
              businessId,
            },
          },
        });

        if (inventory) {
          const newQuantity = inventory.quantity + adjustment.quantity;
          await tx.inventory.update({
            where: {
              productId_businessId: {
                productId: adjustment.productId,
                businessId,
              },
            },
            data: {
              quantity: newQuantity,
              availableQty: newQuantity - inventory.reservedQty,
              lastUpdated: new Date(),
            },
          });
        } else if (adjustment.quantity > 0) {
          // Create new inventory record only if adding stock
          await tx.inventory.create({
            data: {
              productId: adjustment.productId,
              businessId,
              quantity: adjustment.quantity,
              reservedQty: 0,
              availableQty: adjustment.quantity,
            },
          });
        }
      }

      return stockMovements;
    });

    revalidatePath("/inventory");
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
