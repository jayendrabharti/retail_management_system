"use server";

import prisma from "@/prisma/client";
import { Sale, SaleItem, SaleStatus, PaymentMethod } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { createSupabaseClient } from "@/supabase/server";
import { getErrorMessage } from "@/utils/utils";
import { revalidatePath } from "next/cache";
import { getCurrentBusinessId } from "./businesses";

// Types
interface CreateSaleData {
  partyId?: string;
  saleDate?: Date;
  dueDate?: Date;
  paymentMethod?: PaymentMethod;
  paymentTermId?: string;
  quotationId?: string;
  notes?: string;
  items: CreateSaleItemData[];
}

interface CreateSaleItemData {
  productId: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discount?: number;
}

interface UpdateSaleData {
  id: string;
  partyId?: string;
  saleDate?: Date;
  dueDate?: Date;
  status?: SaleStatus;
  paymentMethod?: PaymentMethod;
  paymentTermId?: string;
  notes?: string;
  items?: CreateSaleItemData[];
}

interface SaleResult {
  data: Sale | null;
  errorMessage: string | null;
}

interface SalesResult {
  data: Sale[] | null;
  errorMessage: string | null;
}

interface SaleFilters {
  partyId?: string;
  status?: SaleStatus;
  paymentMethod?: PaymentMethod;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

// Get all sales for current business
export const getSalesAction = async (
  filters?: SaleFilters,
): Promise<SalesResult> => {
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
      whereClause.saleDate = {};
      if (filters.dateFrom) {
        whereClause.saleDate.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        whereClause.saleDate.lte = filters.dateTo;
      }
    }

    if (filters?.search) {
      whereClause.OR = [
        { invoiceNumber: { contains: filters.search, mode: "insensitive" } },
        { notes: { contains: filters.search, mode: "insensitive" } },
        { party: { name: { contains: filters.search, mode: "insensitive" } } },
      ];
    }

    const sales = await prisma.sale.findMany({
      where: whereClause,
      include: {
        party: true,
        paymentTerm: true,
        quotation: true,
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
            returns: true,
          },
        },
      },
      orderBy: [{ saleDate: "desc" }, { saleNumber: "desc" }],
    });

    return { data: sales, errorMessage: null };
  } catch (error) {
    console.error("Error fetching sales:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Get sale by ID
export const getSaleAction = async (id: string): Promise<SaleResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const sale = await prisma.sale.findFirst({
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
        quotation: true,
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
        returns: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!sale) {
      throw new Error("Sale not found");
    }

    return { data: sale, errorMessage: null };
  } catch (error) {
    console.error("Error fetching sale:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Create new sale
export const createSaleAction = async (
  data: CreateSaleData,
): Promise<SaleResult> => {
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
        },
      });

      if (!party) {
        throw new Error("Customer not found");
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

    // Verify quotation exists if provided
    if (data.quotationId) {
      const quotation = await prisma.quotation.findFirst({
        where: {
          id: data.quotationId,
          businessId,
          status: "ACCEPTED",
        },
      });

      if (!quotation) {
        throw new Error("Quotation not found or not accepted");
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

      // Check inventory if product tracks inventory
      if (product.trackInventory) {
        const inventory = await prisma.inventory.findFirst({
          where: {
            productId: item.productId,
            businessId,
          },
        });

        if (
          inventory &&
          inventory.availableQty < item.quantity &&
          !product.allowNegative
        ) {
          throw new Error(`Insufficient stock for product: ${product.name}`);
        }
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

    // Generate invoice number
    const saleCount = await prisma.sale.count({
      where: { businessId },
    });
    const invoiceNumber = `INV-${String(saleCount + 1).padStart(6, "0")}`;

    const sale = await prisma.$transaction(async (tx) => {
      // Create sale
      const newSale = await tx.sale.create({
        data: {
          partyId: data.partyId,
          saleDate: data.saleDate || new Date(),
          dueDate: data.dueDate,
          paymentMethod: data.paymentMethod || PaymentMethod.CASH,
          paymentTermId: data.paymentTermId,
          quotationId: data.quotationId,
          invoiceNumber,
          subtotal: new Decimal(subtotal),
          taxAmount: new Decimal(totalTaxAmount),
          discountAmount: new Decimal(totalDiscountAmount),
          totalAmount: new Decimal(totalAmount),
          balanceAmount: new Decimal(totalAmount),
          notes: data.notes,
          businessId,
        },
      });

      // Create sale items and update inventory
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

        // Create sale item
        await tx.saleItem.create({
          data: {
            saleId: newSale.id,
            productId: item.productId,
            quantity: item.quantity,
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
                quantity: inventory.quantity - item.quantity,
                availableQty: inventory.availableQty - item.quantity,
                lastUpdated: new Date(),
              },
            });

            // Create stock movement
            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                businessId,
                type: "OUT",
                quantity: item.quantity,
                reference: newSale.id,
                reason: "Sale",
                notes: `Sale to ${data.partyId ? "customer" : "walk-in customer"}`,
              },
            });
          }
        }
      }

      // Update quotation status if converted from quotation
      if (data.quotationId) {
        await tx.quotation.update({
          where: { id: data.quotationId },
          data: { status: "CONVERTED" },
        });
      }

      return newSale;
    });

    revalidatePath("/sales");
    revalidatePath("/dashboard");
    revalidatePath("/inventory");

    return { data: sale, errorMessage: null };
  } catch (error) {
    console.error("Error creating sale:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Update sale
export const updateSaleAction = async (
  data: UpdateSaleData,
): Promise<SaleResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    // Verify sale exists
    const existingSale = await prisma.sale.findFirst({
      where: {
        id: data.id,
        businessId,
      },
      include: {
        items: true,
      },
    });

    if (!existingSale) {
      throw new Error("Sale not found");
    }

    // Check if sale can be updated (only pending/confirmed sales can be updated)
    if (
      existingSale.status === SaleStatus.COMPLETED ||
      existingSale.status === SaleStatus.CANCELLED
    ) {
      throw new Error("Cannot update completed or cancelled sale");
    }

    // Verify party exists if being changed
    if (data.partyId && data.partyId !== existingSale.partyId) {
      const party = await prisma.party.findFirst({
        where: {
          id: data.partyId,
          businessId,
          isActive: true,
        },
      });

      if (!party) {
        throw new Error("Customer not found");
      }
    }

    // If items are being updated, recalculate totals
    let updateData: any = {
      ...(data.partyId !== undefined && { partyId: data.partyId }),
      ...(data.saleDate !== undefined && { saleDate: data.saleDate }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.paymentMethod !== undefined && {
        paymentMethod: data.paymentMethod,
      }),
      ...(data.paymentTermId !== undefined && {
        paymentTermId: data.paymentTermId,
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
          totalAmount - existingSale.paidAmount.toNumber(),
        ),
      };
    }

    const sale = await prisma.$transaction(async (tx) => {
      // Update sale
      const updatedSale = await tx.sale.update({
        where: { id: data.id },
        data: updateData,
      });

      // Update items if provided
      if (data.items) {
        // Delete existing items
        await tx.saleItem.deleteMany({
          where: { saleId: data.id },
        });

        // Revert inventory changes for existing items
        for (const existingItem of existingSale.items) {
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
                  quantity: inventory.quantity + existingItem.quantity,
                  availableQty: inventory.availableQty + existingItem.quantity,
                  lastUpdated: new Date(),
                },
              });
            }
          }
        }

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

          // Create sale item
          await tx.saleItem.create({
            data: {
              saleId: data.id,
              productId: item.productId,
              quantity: item.quantity,
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
                  quantity: inventory.quantity - item.quantity,
                  availableQty: inventory.availableQty - item.quantity,
                  lastUpdated: new Date(),
                },
              });
            }
          }
        }
      }

      return updatedSale;
    });

    revalidatePath("/sales");
    revalidatePath("/dashboard");
    revalidatePath("/inventory");

    return { data: sale, errorMessage: null };
  } catch (error) {
    console.error("Error updating sale:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Cancel sale
export const cancelSaleAction = async (id: string): Promise<SaleResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const existingSale = await prisma.sale.findFirst({
      where: {
        id,
        businessId,
      },
      include: {
        items: true,
      },
    });

    if (!existingSale) {
      throw new Error("Sale not found");
    }

    if (existingSale.status === SaleStatus.COMPLETED) {
      throw new Error("Cannot cancel completed sale");
    }

    if (existingSale.status === SaleStatus.CANCELLED) {
      throw new Error("Sale is already cancelled");
    }

    const sale = await prisma.$transaction(async (tx) => {
      // Update sale status
      const cancelledSale = await tx.sale.update({
        where: { id },
        data: {
          status: SaleStatus.CANCELLED,
          updatedAt: new Date(),
        },
      });

      // Revert inventory changes
      for (const item of existingSale.items) {
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
                quantity: inventory.quantity + item.quantity,
                availableQty: inventory.availableQty + item.quantity,
                lastUpdated: new Date(),
              },
            });

            // Create stock movement for cancellation
            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                businessId,
                type: "IN",
                quantity: item.quantity,
                reference: id,
                reason: "Sale cancellation",
              },
            });
          }
        }
      }

      return cancelledSale;
    });

    revalidatePath("/sales");
    revalidatePath("/dashboard");
    revalidatePath("/inventory");

    return { data: sale, errorMessage: null };
  } catch (error) {
    console.error("Error cancelling sale:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Record payment for sale
export const recordSalePaymentAction = async (
  saleId: string,
  amount: number,
  paymentMethod: PaymentMethod,
  notes?: string,
): Promise<SaleResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const sale = await prisma.sale.findFirst({
      where: {
        id: saleId,
        businessId,
      },
    });

    if (!sale) {
      throw new Error("Sale not found");
    }

    if (amount <= 0) {
      throw new Error("Payment amount must be greater than 0");
    }

    if (amount > sale.balanceAmount.toNumber()) {
      throw new Error("Payment amount cannot exceed balance amount");
    }

    const newPaidAmount = sale.paidAmount.toNumber() + amount;
    const newBalanceAmount = sale.totalAmount.toNumber() - newPaidAmount;

    const updatedSale = await prisma.$transaction(async (tx) => {
      // Update sale payment amounts
      const updated = await tx.sale.update({
        where: { id: saleId },
        data: {
          paidAmount: new Decimal(newPaidAmount),
          balanceAmount: new Decimal(newBalanceAmount),
          status: newBalanceAmount <= 0 ? SaleStatus.COMPLETED : sale.status,
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

      const receivablesAccount = await tx.account.findFirst({
        where: {
          businessId,
          accountType: "ACCOUNTS_RECEIVABLE",
        },
      });

      if (cashAccount && receivablesAccount) {
        await tx.transaction.create({
          data: {
            businessId,
            description: `Payment received for sale ${sale.saleNumber}`,
            amount: new Decimal(amount),
            type: "RECEIPT",
            debitAccountId: cashAccount.id,
            creditAccountId: receivablesAccount.id,
            saleId: saleId,
            partyId: sale.partyId,
            reference: `SAL-${sale.saleNumber}`,
            notes,
          },
        });
      }

      return updated;
    });

    revalidatePath("/sales");
    revalidatePath("/dashboard");

    return { data: updatedSale, errorMessage: null };
  } catch (error) {
    console.error("Error recording sale payment:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Get sales statistics
export const getSalesStatsAction = async (dateFrom?: Date, dateTo?: Date) => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const whereClause: any = { businessId };

    if (dateFrom || dateTo) {
      whereClause.saleDate = {};
      if (dateFrom) whereClause.saleDate.gte = dateFrom;
      if (dateTo) whereClause.saleDate.lte = dateTo;
    }

    const [totalSales, totalAmount, paidAmount, pendingAmount] =
      await Promise.all([
        prisma.sale.count({
          where: {
            ...whereClause,
            status: { not: SaleStatus.CANCELLED },
          },
        }),
        prisma.sale.aggregate({
          where: {
            ...whereClause,
            status: { not: SaleStatus.CANCELLED },
          },
          _sum: {
            totalAmount: true,
          },
        }),
        prisma.sale.aggregate({
          where: {
            ...whereClause,
            status: { not: SaleStatus.CANCELLED },
          },
          _sum: {
            paidAmount: true,
          },
        }),
        prisma.sale.aggregate({
          where: {
            ...whereClause,
            status: { not: SaleStatus.CANCELLED },
            balanceAmount: { gt: 0 },
          },
          _sum: {
            balanceAmount: true,
          },
        }),
      ]);

    return {
      data: {
        totalSales,
        totalAmount: totalAmount._sum.totalAmount?.toNumber() || 0,
        paidAmount: paidAmount._sum.paidAmount?.toNumber() || 0,
        pendingAmount: pendingAmount._sum.balanceAmount?.toNumber() || 0,
        averageSaleValue:
          totalSales > 0
            ? (totalAmount._sum.totalAmount?.toNumber() || 0) / totalSales
            : 0,
      },
      errorMessage: null,
    };
  } catch (error) {
    console.error("Error fetching sales statistics:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};
