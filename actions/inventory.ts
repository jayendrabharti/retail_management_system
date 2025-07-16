"use server";

import prisma from "@/prisma/client";
import { Inventory, StockMovement, MovementType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { createSupabaseClient } from "@/supabase/server";
import { getErrorMessage } from "@/utils/utils";
import { revalidatePath } from "next/cache";
import { getCurrentBusinessId } from "./businesses";

// Types
interface InventoryResult {
  data: Inventory | null;
  errorMessage: string | null;
}

interface InventoriesResult {
  data: Inventory[] | null;
  errorMessage: string | null;
}

interface StockMovementResult {
  data: StockMovement | null;
  errorMessage: string | null;
}

interface StockMovementsResult {
  data: StockMovement[] | null;
  errorMessage: string | null;
}

interface StockAdjustmentData {
  productId: string;
  quantity: number;
  type: MovementType;
  reason?: string;
  notes?: string;
  reference?: string;
}

interface StockTransferData {
  productId: string;
  quantity: number;
  fromLocation?: string;
  toLocation?: string;
  notes?: string;
}

// Get all inventory for current business
export const getInventoriesAction = async (): Promise<InventoriesResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const inventories = await prisma.inventory.findMany({
      where: {
        businessId,
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
      orderBy: [{ product: { name: "asc" } }],
    });

    return { data: inventories, errorMessage: null };
  } catch (error) {
    console.error("Error fetching inventories:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Get inventory by product ID
export const getInventoryByProductAction = async (
  productId: string,
): Promise<InventoryResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const inventory = await prisma.inventory.findFirst({
      where: {
        productId,
        businessId,
      },
      include: {
        product: {
          include: {
            category: true,
            stockMovements: {
              orderBy: { createdAt: "desc" },
              take: 20,
            },
          },
        },
      },
    });

    if (!inventory) {
      throw new Error("Inventory not found");
    }

    return { data: inventory, errorMessage: null };
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Get low stock items
export const getLowStockInventoriesAction =
  async (): Promise<InventoriesResult> => {
    try {
      const businessId = await getCurrentBusinessId();
      if (!businessId) {
        throw new Error("No business selected");
      }

      const inventories = await prisma.inventory.findMany({
        where: {
          businessId,
          product: {
            isActive: true,
            trackInventory: true,
            minStockLevel: { not: null },
          },
        },
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      });

      // Filter for low stock items
      const lowStockItems = inventories.filter((inventory) => {
        return (
          inventory.product.minStockLevel &&
          inventory.availableQty <= inventory.product.minStockLevel
        );
      });

      return { data: lowStockItems, errorMessage: null };
    } catch (error) {
      console.error("Error fetching low stock inventories:", error);
      return { data: null, errorMessage: getErrorMessage(error) };
    }
  };

// Get out of stock items
export const getOutOfStockInventoriesAction =
  async (): Promise<InventoriesResult> => {
    try {
      const businessId = await getCurrentBusinessId();
      if (!businessId) {
        throw new Error("No business selected");
      }

      const inventories = await prisma.inventory.findMany({
        where: {
          businessId,
          availableQty: { lte: 0 },
          product: {
            isActive: true,
            trackInventory: true,
          },
        },
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      });

      return { data: inventories, errorMessage: null };
    } catch (error) {
      console.error("Error fetching out of stock inventories:", error);
      return { data: null, errorMessage: getErrorMessage(error) };
    }
  };

// Adjust stock quantity
export const adjustStockAction = async (
  data: StockAdjustmentData,
): Promise<StockMovementResult> => {
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

    // Verify product exists and tracks inventory
    const product = await prisma.product.findFirst({
      where: {
        id: data.productId,
        businessId,
        isActive: true,
        trackInventory: true,
      },
      include: {
        inventory: true,
      },
    });

    if (!product) {
      throw new Error("Product not found or does not track inventory");
    }

    const inventory = product.inventory[0];
    if (!inventory) {
      throw new Error("Inventory record not found");
    }

    // Calculate new quantities
    let newQuantity = inventory.quantity;

    if (data.type === MovementType.IN || data.type === MovementType.RETURN) {
      newQuantity += data.quantity;
    } else if (
      data.type === MovementType.OUT ||
      data.type === MovementType.DAMAGE
    ) {
      newQuantity -= data.quantity;
    } else if (data.type === MovementType.ADJUSTMENT) {
      // For adjustment, the quantity is the new total quantity
      newQuantity = data.quantity;
    }

    // Check if negative stock is allowed
    if (newQuantity < 0 && !product.allowNegative) {
      throw new Error("Negative stock not allowed for this product");
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update inventory
      const updatedInventory = await tx.inventory.update({
        where: {
          id: inventory.id,
        },
        data: {
          quantity: newQuantity,
          availableQty: newQuantity - inventory.reservedQty,
          lastUpdated: new Date(),
        },
      });

      // Create stock movement record
      const stockMovement = await tx.stockMovement.create({
        data: {
          productId: data.productId,
          businessId,
          type: data.type,
          quantity: Math.abs(data.quantity),
          reference: data.reference,
          reason: data.reason,
          notes: data.notes,
          createdBy: dbUser.id,
        },
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      });

      return stockMovement;
    });

    revalidatePath("/inventory");
    revalidatePath("/dashboard");

    return { data: result, errorMessage: null };
  } catch (error) {
    console.error("Error adjusting stock:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Transfer stock (for multi-location businesses - future feature)
export const transferStockAction = async (
  data: StockTransferData,
): Promise<StockMovementResult> => {
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

    // Verify product exists and has sufficient stock
    const product = await prisma.product.findFirst({
      where: {
        id: data.productId,
        businessId,
        isActive: true,
        trackInventory: true,
      },
      include: {
        inventory: true,
      },
    });

    if (!product) {
      throw new Error("Product not found or does not track inventory");
    }

    const inventory = product.inventory[0];
    if (!inventory) {
      throw new Error("Inventory record not found");
    }

    if (inventory.availableQty < data.quantity) {
      throw new Error("Insufficient stock for transfer");
    }

    const stockMovement = await prisma.stockMovement.create({
      data: {
        productId: data.productId,
        businessId,
        type: MovementType.TRANSFER,
        quantity: data.quantity,
        reason: `Transfer from ${data.fromLocation || "unknown"} to ${data.toLocation || "unknown"}`,
        notes: data.notes,
        createdBy: dbUser.id,
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
    });

    revalidatePath("/inventory");

    return { data: stockMovement, errorMessage: null };
  } catch (error) {
    console.error("Error transferring stock:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Get stock movements for a product
export const getStockMovementsAction = async (
  productId?: string,
  limit: number = 50,
): Promise<StockMovementsResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const whereClause: any = {
      businessId,
    };

    if (productId) {
      whereClause.productId = productId;
    }

    const stockMovements = await prisma.stockMovement.findMany({
      where: whereClause,
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    return { data: stockMovements, errorMessage: null };
  } catch (error) {
    console.error("Error fetching stock movements:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Get inventory valuation
export const getInventoryValuationAction = async () => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const inventories = await prisma.inventory.findMany({
      where: {
        businessId,
        product: {
          isActive: true,
          trackInventory: true,
        },
      },
      include: {
        product: true,
      },
    });

    let totalCostValue = 0;
    let totalSellingValue = 0;
    let totalItems = 0;

    const valuationData = inventories.map((inventory) => {
      const costValue =
        inventory.quantity * inventory.product.costPrice.toNumber();
      const sellingValue =
        inventory.quantity * inventory.product.sellingPrice.toNumber();

      totalCostValue += costValue;
      totalSellingValue += sellingValue;
      totalItems += inventory.quantity;

      return {
        productId: inventory.productId,
        productName: inventory.product.name,
        sku: inventory.product.sku,
        quantity: inventory.quantity,
        costPrice: inventory.product.costPrice.toNumber(),
        sellingPrice: inventory.product.sellingPrice.toNumber(),
        costValue,
        sellingValue,
        potentialProfit: sellingValue - costValue,
      };
    });

    return {
      data: {
        items: valuationData,
        summary: {
          totalItems,
          totalCostValue,
          totalSellingValue,
          totalPotentialProfit: totalSellingValue - totalCostValue,
          averageCostPerItem: totalItems > 0 ? totalCostValue / totalItems : 0,
          averageSellingPerItem:
            totalItems > 0 ? totalSellingValue / totalItems : 0,
        },
      },
      errorMessage: null,
    };
  } catch (error) {
    console.error("Error calculating inventory valuation:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Reserve stock (for pending orders)
export const reserveStockAction = async (
  productId: string,
  quantity: number,
): Promise<InventoryResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const inventory = await prisma.inventory.findFirst({
      where: {
        productId,
        businessId,
      },
    });

    if (!inventory) {
      throw new Error("Inventory not found");
    }

    if (inventory.availableQty < quantity) {
      throw new Error("Insufficient available stock");
    }

    const updatedInventory = await prisma.inventory.update({
      where: {
        id: inventory.id,
      },
      data: {
        reservedQty: inventory.reservedQty + quantity,
        availableQty: inventory.availableQty - quantity,
        lastUpdated: new Date(),
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
    });

    revalidatePath("/inventory");

    return { data: updatedInventory, errorMessage: null };
  } catch (error) {
    console.error("Error reserving stock:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Release reserved stock
export const releaseReservedStockAction = async (
  productId: string,
  quantity: number,
): Promise<InventoryResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const inventory = await prisma.inventory.findFirst({
      where: {
        productId,
        businessId,
      },
    });

    if (!inventory) {
      throw new Error("Inventory not found");
    }

    if (inventory.reservedQty < quantity) {
      throw new Error("Cannot release more than reserved quantity");
    }

    const updatedInventory = await prisma.inventory.update({
      where: {
        id: inventory.id,
      },
      data: {
        reservedQty: inventory.reservedQty - quantity,
        availableQty: inventory.availableQty + quantity,
        lastUpdated: new Date(),
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
    });

    revalidatePath("/inventory");

    return { data: updatedInventory, errorMessage: null };
  } catch (error) {
    console.error("Error releasing reserved stock:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};
