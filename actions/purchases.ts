"use server";

import prisma from "@/prisma/client";
import {
  Purchase,
  PurchaseItem,
  PurchaseStatus,
  PaymentMethod,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { createSupabaseClient } from "@/supabase/server";
import { getErrorMessage } from "@/utils/utils";
import { revalidatePath } from "next/cache";
import { getCurrentBusinessId } from "./businesses";

// Types
interface CreatePurchaseData {
  partyId?: string;
  purchaseDate?: Date;
  dueDate?: Date;
  paymentMethod?: PaymentMethod;
  paymentTermId?: string;
  invoiceNumber?: string;
  notes?: string;
  items: CreatePurchaseItemData[];
}

interface CreatePurchaseItemData {
  productId: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discount?: number;
}

interface UpdatePurchaseData {
  id: string;
  partyId?: string;
  purchaseDate?: Date;
  dueDate?: Date;
  status?: PurchaseStatus;
  paymentMethod?: PaymentMethod;
  paymentTermId?: string;
  invoiceNumber?: string;
  notes?: string;
  items?: CreatePurchaseItemData[];
}

interface PurchaseResult {
  data: Purchase | null;
  errorMessage: string | null;
}

interface PurchasesResult {
  data: Purchase[] | null;
  errorMessage: string | null;
}

interface PurchaseFilters {
  partyId?: string;
  status?: PurchaseStatus;
  paymentMethod?: PaymentMethod;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

// Get all purchases for current business
export const getPurchasesAction = async (
  filters?: PurchaseFilters,
): Promise<PurchasesResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const whereClause: any = {
      businessId,
    };

    // Apply filters
    if (filters?.partyId) {
      whereClause.partyId = filters.partyId;
    }

    if (filters?.status) {
      whereClause.status = filters.status;
    }

    if (filters?.paymentMethod) {
      whereClause.paymentMethod = filters.paymentMethod;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      whereClause.purchaseDate = {};
      if (filters.dateFrom) {
        whereClause.purchaseDate.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        whereClause.purchaseDate.lte = filters.dateTo;
      }
    }

    if (filters?.search) {
      whereClause.OR = [
        { invoiceNumber: { contains: filters.search, mode: "insensitive" } },
        { notes: { contains: filters.search, mode: "insensitive" } },
        { party: { name: { contains: filters.search, mode: "insensitive" } } },
      ];
    }

    const purchases = await prisma.purchase.findMany({
      where: whereClause,
      include: {
        party: true,
        paymentTerm: true,
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
        _count: {
          select: {
            items: true,
            transactions: true,
          },
        },
      },
      orderBy: [{ purchaseDate: "desc" }, { purchaseNumber: "desc" }],
    });

    return { data: purchases, errorMessage: null };
  } catch (error) {
    console.error("Error fetching purchases:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Get purchase by ID
export const getPurchaseAction = async (
  id: string,
): Promise<PurchaseResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const purchase = await prisma.purchase.findFirst({
      where: {
        id,
        businessId,
      },
      include: {
        party: {
          include: {
            addresses: {
              where: { isDeleted: false },
            },
          },
        },
        paymentTerm: true,
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
        transactions: {
          orderBy: { transactionDate: "desc" },
        },
      },
    });

    if (!purchase) {
      throw new Error("Purchase not found");
    }

    return { data: purchase, errorMessage: null };
  } catch (error) {
    console.error("Error fetching purchase:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Create new purchase
export const createPurchaseAction = async (
  data: CreatePurchaseData,
): Promise<PurchaseResult> => {
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

    // Verify party exists if provided
    if (data.partyId) {
      const party = await prisma.party.findFirst({
        where: {
          id: data.partyId,
          businessId,
          isActive: true,
          type: { in: ["SUPPLIER", "BOTH"] },
        },
      });

      if (!party) {
        throw new Error("Supplier not found");
      }
    }

    // Verify payment term exists if provided
    if (data.paymentTermId) {
      const paymentTerm = await prisma.paymentTerm.findFirst({
        where: {
          id: data.paymentTermId,
          businessId,
          isActive: true,
        },
      });

      if (!paymentTerm) {
        throw new Error("Payment term not found");
      }
    }

    // Verify all products exist and calculate totals
    let subtotal = 0;
    let totalTaxAmount = 0;
    let totalDiscountAmount = 0;

    for (const item of data.items) {
      const product = await prisma.product.findFirst({
        where: {
          id: item.productId,
          businessId,
          isActive: true,
        },
      });

      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      const itemSubtotal = item.quantity * item.unitPrice;
      const itemDiscount = itemSubtotal * ((item.discount || 0) / 100);
      const discountedAmount = itemSubtotal - itemDiscount;
      const itemTax =
        discountedAmount * ((item.taxRate || product.taxRate.toNumber()) / 100);

      subtotal += itemSubtotal;
      totalDiscountAmount += itemDiscount;
      totalTaxAmount += itemTax;
    }

    const totalAmount = subtotal - totalDiscountAmount + totalTaxAmount;

    const purchase = await prisma.$transaction(async (tx) => {
      // Create purchase
      const newPurchase = await tx.purchase.create({
        data: {
          partyId: data.partyId,
          purchaseDate: data.purchaseDate || new Date(),
          dueDate: data.dueDate,
          paymentMethod: data.paymentMethod || PaymentMethod.CASH,
          paymentTermId: data.paymentTermId,
          invoiceNumber: data.invoiceNumber,
          subtotal: new Decimal(subtotal),
          taxAmount: new Decimal(totalTaxAmount),
          discountAmount: new Decimal(totalDiscountAmount),
          totalAmount: new Decimal(totalAmount),
          balanceAmount: new Decimal(totalAmount),
          notes: data.notes,
          businessId,
        },
      });

      // Create purchase items and update inventory
      for (const item of data.items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId },
        });

        if (!product) continue;

        const itemSubtotal = item.quantity * item.unitPrice;
        const itemDiscount = itemSubtotal * ((item.discount || 0) / 100);
        const discountedAmount = itemSubtotal - itemDiscount;
        const itemTax =
          discountedAmount *
          ((item.taxRate || product.taxRate.toNumber()) / 100);

        // Create purchase item
        await tx.purchaseItem.create({
          data: {
            purchaseId: newPurchase.id,
            productId: item.productId,
            quantity: new Decimal(item.quantity),
            unitPrice: new Decimal(item.unitPrice),
            totalPrice: new Decimal(itemSubtotal),
            taxRate: new Decimal(item.taxRate || product.taxRate.toNumber()),
            taxAmount: new Decimal(itemTax),
            discount: new Decimal(item.discount || 0),
          },
        });

        // Update inventory if product tracks inventory
        if (product.trackInventory) {
          const inventory = await tx.inventory.findFirst({
            where: {
              productId: item.productId,
              businessId,
            },
          });

          if (inventory) {
            await tx.inventory.update({
              where: { id: inventory.id },
              data: {
                quantity: inventory.quantity + item.quantity,
                availableQty: inventory.availableQty + item.quantity,
                lastUpdated: new Date(),
              },
            });
          } else {
            // Create inventory record if it doesn't exist
            await tx.inventory.create({
              data: {
                productId: item.productId,
                businessId,
                quantity: item.quantity,
                reservedQty: 0,
                availableQty: item.quantity,
              },
            });
          }

          // Create stock movement
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              businessId,
              type: "IN",
              quantity: item.quantity,
              reference: newPurchase.id,
              reason: "Purchase",
              notes: `Purchase from ${data.partyId ? "supplier" : "vendor"}`,
            },
          });
        }

        // Update product cost price if different
        if (item.unitPrice !== product.costPrice.toNumber()) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              costPrice: new Decimal(item.unitPrice),
              updatedAt: new Date(),
            },
          });

          // Create price history
          await tx.priceHistory.create({
            data: {
              productId: item.productId,
              costPrice: new Decimal(item.unitPrice),
              sellingPrice: product.sellingPrice,
              mrp: product.mrp,
              reason: "Purchase price update",
            },
          });
        }
      }

      return newPurchase;
    });

    revalidatePath("/purchases");
    revalidatePath("/dashboard");
    revalidatePath("/inventory");

    return { data: purchase, errorMessage: null };
  } catch (error) {
    console.error("Error creating purchase:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Update purchase
export const updatePurchaseAction = async (
  data: UpdatePurchaseData,
): Promise<PurchaseResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    // Verify purchase exists
    const existingPurchase = await prisma.purchase.findFirst({
      where: {
        id: data.id,
        businessId,
      },
      include: {
        items: true,
      },
    });

    if (!existingPurchase) {
      throw new Error("Purchase not found");
    }

    // Check if purchase can be updated
    if (
      existingPurchase.status === PurchaseStatus.COMPLETED ||
      existingPurchase.status === PurchaseStatus.CANCELLED
    ) {
      throw new Error("Cannot update completed or cancelled purchase");
    }

    // Verify party exists if being changed
    if (data.partyId && data.partyId !== existingPurchase.partyId) {
      const party = await prisma.party.findFirst({
        where: {
          id: data.partyId,
          businessId,
          isActive: true,
          type: { in: ["SUPPLIER", "BOTH"] },
        },
      });

      if (!party) {
        throw new Error("Supplier not found");
      }
    }

    // If items are being updated, recalculate totals
    let updateData: any = {
      ...(data.partyId !== undefined && { partyId: data.partyId }),
      ...(data.purchaseDate !== undefined && {
        purchaseDate: data.purchaseDate,
      }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.paymentMethod !== undefined && {
        paymentMethod: data.paymentMethod,
      }),
      ...(data.paymentTermId !== undefined && {
        paymentTermId: data.paymentTermId,
      }),
      ...(data.invoiceNumber !== undefined && {
        invoiceNumber: data.invoiceNumber,
      }),
      ...(data.notes !== undefined && { notes: data.notes }),
      updatedAt: new Date(),
    };

    if (data.items) {
      // Calculate new totals
      let subtotal = 0;
      let totalTaxAmount = 0;
      let totalDiscountAmount = 0;

      for (const item of data.items) {
        const product = await prisma.product.findFirst({
          where: {
            id: item.productId,
            businessId,
            isActive: true,
          },
        });

        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }

        const itemSubtotal = item.quantity * item.unitPrice;
        const itemDiscount = itemSubtotal * ((item.discount || 0) / 100);
        const discountedAmount = itemSubtotal - itemDiscount;
        const itemTax =
          discountedAmount *
          ((item.taxRate || product.taxRate.toNumber()) / 100);

        subtotal += itemSubtotal;
        totalDiscountAmount += itemDiscount;
        totalTaxAmount += itemTax;
      }

      const totalAmount = subtotal - totalDiscountAmount + totalTaxAmount;

      updateData = {
        ...updateData,
        subtotal: new Decimal(subtotal),
        taxAmount: new Decimal(totalTaxAmount),
        discountAmount: new Decimal(totalDiscountAmount),
        totalAmount: new Decimal(totalAmount),
        balanceAmount: new Decimal(
          totalAmount - existingPurchase.paidAmount.toNumber(),
        ),
      };
    }

    const purchase = await prisma.$transaction(async (tx) => {
      // Update purchase
      const updatedPurchase = await tx.purchase.update({
        where: { id: data.id },
        data: updateData,
      });

      // Update items if provided
      if (data.items) {
        // Revert inventory changes for existing items
        for (const existingItem of existingPurchase.items) {
          const product = await tx.product.findFirst({
            where: { id: existingItem.productId },
          });

          if (product?.trackInventory) {
            const inventory = await tx.inventory.findFirst({
              where: {
                productId: existingItem.productId,
                businessId,
              },
            });

            if (inventory) {
              await tx.inventory.update({
                where: { id: inventory.id },
                data: {
                  quantity:
                    inventory.quantity - existingItem.quantity.toNumber(),
                  availableQty:
                    inventory.availableQty - existingItem.quantity.toNumber(),
                  lastUpdated: new Date(),
                },
              });
            }
          }
        }

        // Delete existing items
        await tx.purchaseItem.deleteMany({
          where: { purchaseId: data.id },
        });

        // Create new items and update inventory
        for (const item of data.items) {
          const product = await tx.product.findFirst({
            where: { id: item.productId },
          });

          if (!product) continue;

          const itemSubtotal = item.quantity * item.unitPrice;
          const itemDiscount = itemSubtotal * ((item.discount || 0) / 100);
          const discountedAmount = itemSubtotal - itemDiscount;
          const itemTax =
            discountedAmount *
            ((item.taxRate || product.taxRate.toNumber()) / 100);

          // Create purchase item
          await tx.purchaseItem.create({
            data: {
              purchaseId: data.id,
              productId: item.productId,
              quantity: new Decimal(item.quantity),
              unitPrice: new Decimal(item.unitPrice),
              totalPrice: new Decimal(itemSubtotal),
              taxRate: new Decimal(item.taxRate || product.taxRate.toNumber()),
              taxAmount: new Decimal(itemTax),
              discount: new Decimal(item.discount || 0),
            },
          });

          // Update inventory
          if (product.trackInventory) {
            const inventory = await tx.inventory.findFirst({
              where: {
                productId: item.productId,
                businessId,
              },
            });

            if (inventory) {
              await tx.inventory.update({
                where: { id: inventory.id },
                data: {
                  quantity: inventory.quantity + item.quantity,
                  availableQty: inventory.availableQty + item.quantity,
                  lastUpdated: new Date(),
                },
              });
            }
          }
        }
      }

      return updatedPurchase;
    });

    revalidatePath("/purchases");
    revalidatePath("/dashboard");
    revalidatePath("/inventory");

    return { data: purchase, errorMessage: null };
  } catch (error) {
    console.error("Error updating purchase:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Cancel purchase
export const cancelPurchaseAction = async (
  id: string,
): Promise<PurchaseResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const existingPurchase = await prisma.purchase.findFirst({
      where: {
        id,
        businessId,
      },
      include: {
        items: true,
      },
    });

    if (!existingPurchase) {
      throw new Error("Purchase not found");
    }

    if (existingPurchase.status === PurchaseStatus.COMPLETED) {
      throw new Error("Cannot cancel completed purchase");
    }

    if (existingPurchase.status === PurchaseStatus.CANCELLED) {
      throw new Error("Purchase is already cancelled");
    }

    const purchase = await prisma.$transaction(async (tx) => {
      // Update purchase status
      const cancelledPurchase = await tx.purchase.update({
        where: { id },
        data: {
          status: PurchaseStatus.CANCELLED,
          updatedAt: new Date(),
        },
      });

      // Revert inventory changes
      for (const item of existingPurchase.items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId },
        });

        if (product?.trackInventory) {
          const inventory = await tx.inventory.findFirst({
            where: {
              productId: item.productId,
              businessId,
            },
          });

          if (inventory) {
            await tx.inventory.update({
              where: { id: inventory.id },
              data: {
                quantity: inventory.quantity - item.quantity.toNumber(),
                availableQty: inventory.availableQty - item.quantity.toNumber(),
                lastUpdated: new Date(),
              },
            });

            // Create stock movement for cancellation
            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                businessId,
                type: "OUT",
                quantity: item.quantity.toNumber(),
                reference: id,
                reason: "Purchase cancellation",
              },
            });
          }
        }
      }

      return cancelledPurchase;
    });

    revalidatePath("/purchases");
    revalidatePath("/dashboard");
    revalidatePath("/inventory");

    return { data: purchase, errorMessage: null };
  } catch (error) {
    console.error("Error cancelling purchase:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Record payment for purchase
export const recordPurchasePaymentAction = async (
  purchaseId: string,
  amount: number,
  paymentMethod: PaymentMethod,
  notes?: string,
): Promise<PurchaseResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const purchase = await prisma.purchase.findFirst({
      where: {
        id: purchaseId,
        businessId,
      },
    });

    if (!purchase) {
      throw new Error("Purchase not found");
    }

    if (amount <= 0) {
      throw new Error("Payment amount must be greater than 0");
    }

    if (amount > purchase.balanceAmount.toNumber()) {
      throw new Error("Payment amount cannot exceed balance amount");
    }

    const newPaidAmount = purchase.paidAmount.toNumber() + amount;
    const newBalanceAmount = purchase.totalAmount.toNumber() - newPaidAmount;

    const updatedPurchase = await prisma.$transaction(async (tx) => {
      // Update purchase payment amounts
      const updated = await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          paidAmount: new Decimal(newPaidAmount),
          balanceAmount: new Decimal(newBalanceAmount),
          status:
            newBalanceAmount <= 0 ? PurchaseStatus.COMPLETED : purchase.status,
          updatedAt: new Date(),
        },
      });

      // Create transaction record
      const cashAccount = await tx.account.findFirst({
        where: {
          businessId,
          accountType: "CASH",
        },
      });

      const payablesAccount = await tx.account.findFirst({
        where: {
          businessId,
          accountType: "ACCOUNTS_PAYABLE",
        },
      });

      if (cashAccount && payablesAccount) {
        await tx.transaction.create({
          data: {
            businessId,
            description: `Payment made for purchase ${purchase.purchaseNumber}`,
            amount: new Decimal(amount),
            type: "PAYMENT",
            debitAccountId: payablesAccount.id,
            creditAccountId: cashAccount.id,
            purchaseId: purchaseId,
            partyId: purchase.partyId,
            reference: `PUR-${purchase.purchaseNumber}`,
            notes,
          },
        });
      }

      return updated;
    });

    revalidatePath("/purchases");
    revalidatePath("/dashboard");

    return { data: updatedPurchase, errorMessage: null };
  } catch (error) {
    console.error("Error recording purchase payment:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Get purchase statistics
export const getPurchaseStatsAction = async (
  dateFrom?: Date,
  dateTo?: Date,
) => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const whereClause: any = { businessId };

    if (dateFrom || dateTo) {
      whereClause.purchaseDate = {};
      if (dateFrom) whereClause.purchaseDate.gte = dateFrom;
      if (dateTo) whereClause.purchaseDate.lte = dateTo;
    }

    const [totalPurchases, totalAmount, paidAmount, pendingAmount] =
      await Promise.all([
        prisma.purchase.count({
          where: {
            ...whereClause,
            status: { not: PurchaseStatus.CANCELLED },
          },
        }),
        prisma.purchase.aggregate({
          where: {
            ...whereClause,
            status: { not: PurchaseStatus.CANCELLED },
          },
          _sum: {
            totalAmount: true,
          },
        }),
        prisma.purchase.aggregate({
          where: {
            ...whereClause,
            status: { not: PurchaseStatus.CANCELLED },
          },
          _sum: {
            paidAmount: true,
          },
        }),
        prisma.purchase.aggregate({
          where: {
            ...whereClause,
            status: { not: PurchaseStatus.CANCELLED },
            balanceAmount: { gt: 0 },
          },
          _sum: {
            balanceAmount: true,
          },
        }),
      ]);

    return {
      data: {
        totalPurchases,
        totalAmount: totalAmount._sum.totalAmount?.toNumber() || 0,
        paidAmount: paidAmount._sum.paidAmount?.toNumber() || 0,
        pendingAmount: pendingAmount._sum.balanceAmount?.toNumber() || 0,
        averagePurchaseValue:
          totalPurchases > 0
            ? (totalAmount._sum.totalAmount?.toNumber() || 0) / totalPurchases
            : 0,
      },
      errorMessage: null,
    };
  } catch (error) {
    console.error("Error fetching purchase statistics:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};
