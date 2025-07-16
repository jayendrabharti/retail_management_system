"use server";

import prisma from "@/prisma/client";
import { Quotation, QuotationItem, QuotationStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { createSupabaseClient } from "@/supabase/server";
import { getErrorMessage } from "@/utils/utils";
import { revalidatePath } from "next/cache";
import { getCurrentBusinessId } from "./businesses";

// Types
interface CreateQuotationData {
  partyId?: string;
  quotationDate?: Date;
  validUntil?: Date;
  notes?: string;
  termsConditions?: string;
  items: CreateQuotationItemData[];
}

interface CreateQuotationItemData {
  productId: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discount?: number;
}

interface UpdateQuotationData {
  id: string;
  partyId?: string;
  quotationDate?: Date;
  validUntil?: Date;
  status?: QuotationStatus;
  notes?: string;
  termsConditions?: string;
  items?: CreateQuotationItemData[];
}

interface QuotationResult {
  data: Quotation | null;
  errorMessage: string | null;
}

interface QuotationsResult {
  data: Quotation[] | null;
  errorMessage: string | null;
}

interface QuotationFilters {
  partyId?: string;
  status?: QuotationStatus;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

// Get all quotations for current business
export const getQuotationsAction = async (
  filters?: QuotationFilters,
): Promise<QuotationsResult> => {
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

    if (filters?.dateFrom || filters?.dateTo) {
      whereClause.quotationDate = {};
      if (filters.dateFrom) {
        whereClause.quotationDate.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        whereClause.quotationDate.lte = filters.dateTo;
      }
    }

    if (filters?.search) {
      whereClause.OR = [
        { notes: { contains: filters.search, mode: "insensitive" } },
        { termsConditions: { contains: filters.search, mode: "insensitive" } },
        { party: { name: { contains: filters.search, mode: "insensitive" } } },
      ];
    }

    const quotations = await prisma.quotation.findMany({
      where: whereClause,
      include: {
        party: true,
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
        sales: true, // To check if converted to sale
        _count: {
          select: {
            items: true,
            sales: true,
          },
        },
      },
      orderBy: [{ quotationDate: "desc" }, { quotationNumber: "desc" }],
    });

    return { data: quotations, errorMessage: null };
  } catch (error) {
    console.error("Error fetching quotations:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Get quotation by ID
export const getQuotationAction = async (
  id: string,
): Promise<QuotationResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const quotation = await prisma.quotation.findFirst({
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
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
        sales: true,
      },
    });

    if (!quotation) {
      throw new Error("Quotation not found");
    }

    return { data: quotation, errorMessage: null };
  } catch (error) {
    console.error("Error fetching quotation:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Create new quotation
export const createQuotationAction = async (
  data: CreateQuotationData,
): Promise<QuotationResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    // Verify party exists if provided
    if (data.partyId) {
      const party = await prisma.party.findFirst({
        where: {
          id: data.partyId,
          businessId,
          isActive: true,
          type: { in: ["CUSTOMER", "BOTH"] },
        },
      });

      if (!party) {
        throw new Error("Customer not found");
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

    const quotation = await prisma.$transaction(async (tx) => {
      // Create quotation
      const newQuotation = await tx.quotation.create({
        data: {
          partyId: data.partyId,
          quotationDate: data.quotationDate || new Date(),
          validUntil: data.validUntil,
          subtotal: new Decimal(subtotal),
          taxAmount: new Decimal(totalTaxAmount),
          discountAmount: new Decimal(totalDiscountAmount),
          totalAmount: new Decimal(totalAmount),
          notes: data.notes,
          termsConditions: data.termsConditions,
          businessId,
        },
      });

      // Create quotation items
      for (const item of data.items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId },
        });

        if (!product) continue;

        const itemSubtotal = item.quantity * item.unitPrice;

        await tx.quotationItem.create({
          data: {
            quotationId: newQuotation.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: new Decimal(item.unitPrice),
            totalPrice: new Decimal(itemSubtotal),
            taxRate: new Decimal(item.taxRate || product.taxRate.toNumber()),
            discount: new Decimal(item.discount || 0),
          },
        });
      }

      return newQuotation;
    });

    revalidatePath("/quotations");
    revalidatePath("/dashboard");

    return { data: quotation, errorMessage: null };
  } catch (error) {
    console.error("Error creating quotation:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Update quotation
export const updateQuotationAction = async (
  data: UpdateQuotationData,
): Promise<QuotationResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    // Verify quotation exists
    const existingQuotation = await prisma.quotation.findFirst({
      where: {
        id: data.id,
        businessId,
      },
      include: {
        items: true,
      },
    });

    if (!existingQuotation) {
      throw new Error("Quotation not found");
    }

    // Check if quotation can be updated
    if (existingQuotation.status === QuotationStatus.CONVERTED) {
      throw new Error("Cannot update converted quotation");
    }

    // Verify party exists if being changed
    if (data.partyId && data.partyId !== existingQuotation.partyId) {
      const party = await prisma.party.findFirst({
        where: {
          id: data.partyId,
          businessId,
          isActive: true,
          type: { in: ["CUSTOMER", "BOTH"] },
        },
      });

      if (!party) {
        throw new Error("Customer not found");
      }
    }

    // If items are being updated, recalculate totals
    let updateData: any = {
      ...(data.partyId !== undefined && { partyId: data.partyId }),
      ...(data.quotationDate !== undefined && {
        quotationDate: data.quotationDate,
      }),
      ...(data.validUntil !== undefined && { validUntil: data.validUntil }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.termsConditions !== undefined && {
        termsConditions: data.termsConditions,
      }),
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
      };
    }

    const quotation = await prisma.$transaction(async (tx) => {
      // Update quotation
      const updatedQuotation = await tx.quotation.update({
        where: { id: data.id },
        data: updateData,
      });

      // Update items if provided
      if (data.items) {
        // Delete existing items
        await tx.quotationItem.deleteMany({
          where: { quotationId: data.id },
        });

        // Create new items
        for (const item of data.items) {
          const product = await tx.product.findFirst({
            where: { id: item.productId },
          });

          if (!product) continue;

          const itemSubtotal = item.quantity * item.unitPrice;

          await tx.quotationItem.create({
            data: {
              quotationId: data.id,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: new Decimal(item.unitPrice),
              totalPrice: new Decimal(itemSubtotal),
              taxRate: new Decimal(item.taxRate || product.taxRate.toNumber()),
              discount: new Decimal(item.discount || 0),
            },
          });
        }
      }

      return updatedQuotation;
    });

    revalidatePath("/quotations");
    revalidatePath("/dashboard");

    return { data: quotation, errorMessage: null };
  } catch (error) {
    console.error("Error updating quotation:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Delete quotation
export const deleteQuotationAction = async (
  id: string,
): Promise<QuotationResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    // Check if quotation has been converted to sale
    const salesCount = await prisma.sale.count({
      where: { quotationId: id },
    });

    if (salesCount > 0) {
      throw new Error(
        "Cannot delete quotation that has been converted to sale",
      );
    }

    const quotation = await prisma.$transaction(async (tx) => {
      // Delete quotation items first
      await tx.quotationItem.deleteMany({
        where: { quotationId: id },
      });

      // Delete quotation
      return await tx.quotation.delete({
        where: { id },
      });
    });

    revalidatePath("/quotations");
    revalidatePath("/dashboard");

    return { data: quotation, errorMessage: null };
  } catch (error) {
    console.error("Error deleting quotation:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Update quotation status
export const updateQuotationStatusAction = async (
  id: string,
  status: QuotationStatus,
): Promise<QuotationResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const quotation = await prisma.quotation.findFirst({
      where: {
        id,
        businessId,
      },
    });

    if (!quotation) {
      throw new Error("Quotation not found");
    }

    // Check if status change is valid
    if (
      quotation.status === QuotationStatus.CONVERTED &&
      status !== QuotationStatus.CONVERTED
    ) {
      throw new Error("Cannot change status of converted quotation");
    }

    // Check if quotation has expired
    if (
      quotation.validUntil &&
      new Date() > quotation.validUntil &&
      status === QuotationStatus.ACCEPTED
    ) {
      throw new Error("Cannot accept expired quotation");
    }

    const updatedQuotation = await prisma.quotation.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date(),
      },
      include: {
        party: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    revalidatePath("/quotations");
    revalidatePath("/dashboard");

    return { data: updatedQuotation, errorMessage: null };
  } catch (error) {
    console.error("Error updating quotation status:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Convert quotation to sale
export const convertQuotationToSaleAction = async (id: string) => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const quotation = await prisma.quotation.findFirst({
      where: {
        id,
        businessId,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        party: true,
      },
    });

    if (!quotation) {
      throw new Error("Quotation not found");
    }

    if (quotation.status !== QuotationStatus.ACCEPTED) {
      throw new Error("Only accepted quotations can be converted to sales");
    }

    if (quotation.validUntil && new Date() > quotation.validUntil) {
      throw new Error("Cannot convert expired quotation");
    }

    // Check inventory availability
    for (const item of quotation.items) {
      if (item.product.trackInventory) {
        const inventory = await prisma.inventory.findFirst({
          where: {
            productId: item.productId,
            businessId,
          },
        });

        if (
          inventory &&
          inventory.availableQty < item.quantity &&
          !item.product.allowNegative
        ) {
          throw new Error(
            `Insufficient stock for product: ${item.product.name}`,
          );
        }
      }
    }

    // Generate invoice number
    const saleCount = await prisma.sale.count({
      where: { businessId },
    });
    const invoiceNumber = `INV-${String(saleCount + 1).padStart(6, "0")}`;

    const sale = await prisma.$transaction(async (tx) => {
      // Create sale from quotation
      const newSale = await tx.sale.create({
        data: {
          partyId: quotation.partyId,
          quotationId: quotation.id,
          saleDate: new Date(),
          invoiceNumber,
          subtotal: quotation.subtotal,
          taxAmount: quotation.taxAmount,
          discountAmount: quotation.discountAmount,
          totalAmount: quotation.totalAmount,
          balanceAmount: quotation.totalAmount,
          notes: quotation.notes,
          businessId,
        },
      });

      // Create sale items from quotation items
      for (const item of quotation.items) {
        await tx.saleItem.create({
          data: {
            saleId: newSale.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            taxRate: item.taxRate,
            discount: item.discount,
          },
        });

        // Update inventory
        if (item.product.trackInventory) {
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
                reason: "Sale from quotation",
                notes: `Converted from quotation ${quotation.quotationNumber}`,
              },
            });
          }
        }
      }

      // Update quotation status
      await tx.quotation.update({
        where: { id },
        data: {
          status: QuotationStatus.CONVERTED,
          updatedAt: new Date(),
        },
      });

      return newSale;
    });

    revalidatePath("/quotations");
    revalidatePath("/sales");
    revalidatePath("/dashboard");
    revalidatePath("/inventory");

    return {
      data: { sale, quotation },
      errorMessage: null,
    };
  } catch (error) {
    console.error("Error converting quotation to sale:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Get quotation statistics
export const getQuotationStatsAction = async (
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
      whereClause.quotationDate = {};
      if (dateFrom) whereClause.quotationDate.gte = dateFrom;
      if (dateTo) whereClause.quotationDate.lte = dateTo;
    }

    const [
      totalQuotations,
      draftQuotations,
      sentQuotations,
      acceptedQuotations,
      rejectedQuotations,
      convertedQuotations,
      expiredQuotations,
      totalValue,
      acceptedValue,
      convertedValue,
    ] = await Promise.all([
      prisma.quotation.count({ where: whereClause }),
      prisma.quotation.count({
        where: { ...whereClause, status: QuotationStatus.DRAFT },
      }),
      prisma.quotation.count({
        where: { ...whereClause, status: QuotationStatus.SENT },
      }),
      prisma.quotation.count({
        where: { ...whereClause, status: QuotationStatus.ACCEPTED },
      }),
      prisma.quotation.count({
        where: { ...whereClause, status: QuotationStatus.REJECTED },
      }),
      prisma.quotation.count({
        where: { ...whereClause, status: QuotationStatus.CONVERTED },
      }),
      prisma.quotation.count({
        where: { ...whereClause, status: QuotationStatus.EXPIRED },
      }),
      prisma.quotation.aggregate({
        where: whereClause,
        _sum: { totalAmount: true },
      }),
      prisma.quotation.aggregate({
        where: { ...whereClause, status: QuotationStatus.ACCEPTED },
        _sum: { totalAmount: true },
      }),
      prisma.quotation.aggregate({
        where: { ...whereClause, status: QuotationStatus.CONVERTED },
        _sum: { totalAmount: true },
      }),
    ]);

    const conversionRate =
      sentQuotations > 0 ? (convertedQuotations / sentQuotations) * 100 : 0;
    const acceptanceRate =
      sentQuotations > 0 ? (acceptedQuotations / sentQuotations) * 100 : 0;

    return {
      data: {
        totalQuotations,
        draftQuotations,
        sentQuotations,
        acceptedQuotations,
        rejectedQuotations,
        convertedQuotations,
        expiredQuotations,
        totalValue: totalValue._sum.totalAmount?.toNumber() || 0,
        acceptedValue: acceptedValue._sum.totalAmount?.toNumber() || 0,
        convertedValue: convertedValue._sum.totalAmount?.toNumber() || 0,
        conversionRate,
        acceptanceRate,
      },
      errorMessage: null,
    };
  } catch (error) {
    console.error("Error fetching quotation statistics:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};
