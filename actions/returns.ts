"use server";

import prisma from "@/prisma/client";
import { Return, ReturnStatus, ReturnItem } from "@prisma/client";
import { getCurrentBusinessId } from "./businesses";
import { getErrorMessage } from "@/utils/utils";
import { revalidatePath } from "next/cache";

// Types
interface CreateReturnData {
  saleId?: string;
  reason: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

interface UpdateReturnData {
  id: string;
  reason?: string;
  status?: ReturnStatus;
}

interface ReturnResult {
  data: (Return & { items: ReturnItem[] }) | null;
  errorMessage: string | null;
}

interface ReturnsResult {
  data: (Return & { items: ReturnItem[] })[] | null;
  errorMessage: string | null;
}

// Get all returns for current business
export const getReturnsAction = async (
  limit?: number,
  offset?: number,
  status?: ReturnStatus,
  startDate?: Date,
  endDate?: Date,
): Promise<ReturnsResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const whereClause: any = {
      businessId,
    };

    if (status) whereClause.status = status;
    if (startDate || endDate) {
      whereClause.returnDate = {};
      if (startDate) whereClause.returnDate.gte = startDate;
      if (endDate) whereClause.returnDate.lte = endDate;
    }

    const returns = await prisma.return.findMany({
      where: whereClause,
      include: {
        items: {
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
        },
        sale: {
          select: {
            id: true,
            saleNumber: true,
            saleDate: true,
            party: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { returnDate: "desc" },
      take: limit,
      skip: offset,
    });

    return {
      data: returns,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Create return
export const createReturnAction = async (
  returnData: CreateReturnData,
): Promise<ReturnResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const { items, ...returnInfo } = returnData;
    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

    const result = await prisma.$transaction(async (tx) => {
      // Create return
      const returnRecord = await tx.return.create({
        data: {
          ...returnInfo,
          businessId,
          totalAmount,
          status: "INITIATED",
        },
      });

      // Create return items
      await tx.returnItem.createMany({
        data: items.map((item) => ({
          returnId: returnRecord.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
      });

      // Get the complete return with items
      const completeReturn = await tx.return.findUnique({
        where: { id: returnRecord.id },
        include: {
          items: {
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
          },
        },
      });

      return completeReturn;
    });

    revalidatePath("/returns");
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

// Update return
export const updateReturnAction = async (
  returnData: UpdateReturnData,
): Promise<ReturnResult> => {
  try {
    const { id, ...updateData } = returnData;

    const returnRecord = await prisma.return.update({
      where: { id },
      data: updateData,
      include: {
        items: {
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
        },
      },
    });

    revalidatePath("/returns");
    return {
      data: returnRecord,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Get return by ID
export const getReturnByIdAction = async (
  id: string,
): Promise<ReturnResult> => {
  try {
    const returnRecord = await prisma.return.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                image: true,
                sellingPrice: true,
              },
            },
          },
        },
        sale: {
          select: {
            id: true,
            saleNumber: true,
            saleDate: true,
            party: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return {
      data: returnRecord,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Approve return
export const approveReturnAction = async (
  id: string,
): Promise<ReturnResult> => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Update return status
      const returnRecord = await tx.return.update({
        where: { id },
        data: { status: "APPROVED" },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      // Create stock movements for returned items
      for (const item of returnRecord.items) {
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            businessId: returnRecord.businessId,
            type: "IN",
            quantity: item.quantity,
            reference: `RETURN-${returnRecord.returnNumber}`,
            reason: "Return",
            notes: `Customer return: ${returnRecord.reason}`,
          },
        });

        // Update inventory
        const inventory = await tx.inventory.findUnique({
          where: {
            productId_businessId: {
              productId: item.productId,
              businessId: returnRecord.businessId,
            },
          },
        });

        if (inventory) {
          const newQuantity = inventory.quantity + item.quantity;
          await tx.inventory.update({
            where: {
              productId_businessId: {
                productId: item.productId,
                businessId: returnRecord.businessId,
              },
            },
            data: {
              quantity: newQuantity,
              availableQty: newQuantity - inventory.reservedQty,
              lastUpdated: new Date(),
            },
          });
        }
      }

      return returnRecord;
    });

    revalidatePath("/returns");
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

// Reject return
export const rejectReturnAction = async (id: string): Promise<ReturnResult> => {
  try {
    const returnRecord = await prisma.return.update({
      where: { id },
      data: { status: "REJECTED" },
      include: {
        items: {
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
        },
      },
    });

    revalidatePath("/returns");
    return {
      data: returnRecord,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Complete return
export const completeReturnAction = async (
  id: string,
): Promise<ReturnResult> => {
  try {
    const returnRecord = await prisma.return.update({
      where: { id },
      data: { status: "COMPLETED" },
      include: {
        items: {
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
        },
      },
    });

    revalidatePath("/returns");
    return {
      data: returnRecord,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Get returns by sale
export const getReturnsBySaleAction = async (
  saleId: string,
): Promise<ReturnsResult> => {
  try {
    const returns = await prisma.return.findMany({
      where: { saleId },
      include: {
        items: {
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
        },
      },
      orderBy: { returnDate: "desc" },
    });

    return {
      data: returns,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};
