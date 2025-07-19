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

    // Verify user has access to this business
    const supabase = await createSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) throw new Error("User not authenticated");

    const dbUser = await prisma.user.findUnique({
      where: { userId: user.id },
    });

    if (!dbUser) {
      throw new Error("User not found in database");
    }

    // Verify business access
    const businessAccess = await prisma.business.findFirst({
      where: {
        id: businessId,
        OR: [
          { ownerId: dbUser.id },
          { users: { some: { userId: dbUser.id, isActive: true } } },
        ],
      },
    });

    if (!businessAccess) {
      throw new Error("Access denied to business");
    }

    const whereClause: any = {
      businessId,
    };

    // Apply filters with proper validation
    if (filters?.partyId) {
      // Validate party belongs to business
      const party = await prisma.party.findFirst({
        where: { id: filters.partyId, businessId },
      });
      if (!party) {
        throw new Error("Invalid party specified");
      }
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
      // Sanitize search input to prevent injection
      const sanitizedSearch = filters.search.replace(/[%_\\]/g, "\\$&");
      whereClause.OR = [
        { invoiceNumber: { contains: sanitizedSearch, mode: "insensitive" } },
        { notes: { contains: sanitizedSearch, mode: "insensitive" } },
        { party: { name: { contains: sanitizedSearch, mode: "insensitive" } } },
      ];
    }

    const sales = await prisma.sale.findMany({
      where: whereClause,
      include: {
        party: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            // Don't expose sensitive party data
          },
        },
        paymentTerm: true,
        quotation: {
          select: {
            id: true,
            quotationNumber: true,
            status: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                unit: true,
                category: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
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
      // Limit results to prevent performance issues
      take: 1000,
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

    // Authentication and authorization
    const supabase = await createSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) throw new Error("User not authenticated");

    const dbUser = await prisma.user.findUnique({
      where: { userId: user.id },
    });

    if (!dbUser) {
      throw new Error("User not found in database");
    }

    // Verify business access
    const businessAccess = await prisma.business.findFirst({
      where: {
        id: businessId,
        OR: [
          { ownerId: dbUser.id },
          { users: { some: { userId: dbUser.id, isActive: true } } },
        ],
      },
    });

    if (!businessAccess) {
      throw new Error("Access denied to business");
    }

    // Input validation
    if (!id || typeof id !== "string" || id.trim().length === 0) {
      throw new Error("Invalid sale ID");
    }

    const sale = await prisma.sale.findFirst({
      where: {
        id: id.trim(),
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

    // Authentication and authorization
    const supabase = await createSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) throw new Error("User not authenticated");

    const dbUser = await prisma.user.findUnique({
      where: { userId: user.id },
    });

    if (!dbUser) {
      throw new Error("User not found in database");
    }

    // Verify business access
    const businessAccess = await prisma.business.findFirst({
      where: {
        id: businessId,
        OR: [
          { ownerId: dbUser.id },
          { users: { some: { userId: dbUser.id, isActive: true } } },
        ],
      },
    });

    if (!businessAccess) {
      throw new Error("Access denied to business");
    }

    // Input validation
    if (!data.items || data.items.length === 0) {
      throw new Error("At least one item is required");
    }

    if (data.items.length > 100) {
      throw new Error("Too many items in sale (max 100)");
    }

    // Validate all numeric values
    for (const item of data.items) {
      if (item.quantity <= 0) {
        throw new Error("Item quantity must be positive");
      }
      if (item.unitPrice < 0) {
        throw new Error("Item unit price cannot be negative");
      }
      if (item.taxRate && (item.taxRate < 0 || item.taxRate > 100)) {
        throw new Error("Tax rate must be between 0 and 100");
      }
      if (item.discount && (item.discount < 0 || item.discount > 100)) {
        throw new Error("Discount must be between 0 and 100");
      }
    }

    // Use database transaction for atomicity and race condition prevention
    const newSale = await prisma.$transaction(async (tx) => {
      // Verify party exists if provided (within transaction)
      if (data.partyId) {
        const party = await tx.party.findFirst({
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
        const paymentTerm = await tx.paymentTerm.findFirst({
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
        const quotation = await tx.quotation.findFirst({
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

      // Verify all products exist and calculate totals with inventory checks
      let subtotal = 0;
      let totalTaxAmount = 0;
      let totalDiscountAmount = 0;

      for (const item of data.items) {
        const product = await tx.product.findFirst({
          where: {
            id: item.productId,
            businessId,
            isActive: true,
          },
        });

        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }

        // Check inventory with row-level locking to prevent race conditions
        if (product.trackInventory) {
          const inventory = await tx.inventory.findFirst({
            where: {
              productId: item.productId,
              businessId,
            },
          });

          if (!inventory) {
            throw new Error(
              `No inventory record found for product: ${product.name}`,
            );
          }

          if (
            inventory.availableQty < item.quantity &&
            !product.allowNegative
          ) {
            throw new Error(
              `Insufficient stock for product: ${product.name}. Available: ${inventory.availableQty}, Required: ${item.quantity}`,
            );
          }
        }

        // Calculate item totals with precision
        const itemSubtotal = Number(
          (item.quantity * item.unitPrice).toFixed(2),
        );
        const discountRate = item.discount || 0;
        const itemDiscount = Number(
          (itemSubtotal * (discountRate / 100)).toFixed(2),
        );
        const discountedAmount = itemSubtotal - itemDiscount;
        const taxRate = item.taxRate || product.taxRate.toNumber();
        const itemTax = Number((discountedAmount * (taxRate / 100)).toFixed(2));

        subtotal += itemSubtotal;
        totalDiscountAmount += itemDiscount;
        totalTaxAmount += itemTax;
      }

      const totalAmount = Number(
        (subtotal - totalDiscountAmount + totalTaxAmount).toFixed(2),
      );

      // Generate unique invoice number with race condition protection
      const currentCount = await tx.sale.count({
        where: { businessId },
      });
      const invoiceNumber = `INV-${String(currentCount + 1).padStart(6, "0")}`;

      // Create sale
      const sale = await tx.sale.create({
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
          notes: data.notes?.trim() || null,
          businessId,
          status: "PENDING",
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
            saleId: sale.id,
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
                reference: sale.id,
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

      return sale;
    });

    revalidatePath("/sales");
    revalidatePath("/dashboard");
    revalidatePath("/inventory");

    return { data: newSale, errorMessage: null };
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

    // Authentication and authorization
    const supabase = await createSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) throw new Error("User not authenticated");

    const dbUser = await prisma.user.findUnique({
      where: { userId: user.id },
    });

    if (!dbUser) {
      throw new Error("User not found in database");
    }

    // Verify business access
    const businessAccess = await prisma.business.findFirst({
      where: {
        id: businessId,
        OR: [
          { ownerId: dbUser.id },
          { users: { some: { userId: dbUser.id, isActive: true } } },
        ],
      },
    });

    if (!businessAccess) {
      throw new Error("Access denied to business");
    }

    // Input validation
    if (
      !data.id ||
      typeof data.id !== "string" ||
      data.id.trim().length === 0
    ) {
      throw new Error("Invalid sale ID");
    }

    // Use transaction for atomic operations
    const sale = await prisma.$transaction(async (tx) => {
      // Verify sale exists within transaction
      const existingSale = await tx.sale.findFirst({
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
        const party = await tx.party.findFirst({
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

      // If items are being updated, validate them
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
        ...(data.notes !== undefined && { notes: data.notes?.trim() || null }),
        updatedAt: new Date(),
      };

      if (data.items) {
        // Validate items
        if (data.items.length === 0) {
          throw new Error("At least one item is required");
        }

        if (data.items.length > 100) {
          throw new Error("Too many items in sale (max 100)");
        }

        // Validate all numeric values
        for (const item of data.items) {
          if (item.quantity <= 0) {
            throw new Error("Item quantity must be positive");
          }
          if (item.unitPrice < 0) {
            throw new Error("Item unit price cannot be negative");
          }
          if (item.taxRate && (item.taxRate < 0 || item.taxRate > 100)) {
            throw new Error("Tax rate must be between 0 and 100");
          }
          if (item.discount && (item.discount < 0 || item.discount > 100)) {
            throw new Error("Discount must be between 0 and 100");
          }
        }

        // Calculate new totals
        let subtotal = 0;
        let totalTaxAmount = 0;
        let totalDiscountAmount = 0;

        for (const item of data.items) {
          const product = await tx.product.findFirst({
            where: {
              id: item.productId,
              businessId,
              isActive: true,
            },
          });

          if (!product) {
            throw new Error(`Product not found: ${item.productId}`);
          }

          const itemSubtotal = Number(
            (item.quantity * item.unitPrice).toFixed(2),
          );
          const discountRate = item.discount || 0;
          const itemDiscount = Number(
            (itemSubtotal * (discountRate / 100)).toFixed(2),
          );
          const discountedAmount = itemSubtotal - itemDiscount;
          const taxRate = item.taxRate || product.taxRate.toNumber();
          const itemTax = Number(
            (discountedAmount * (taxRate / 100)).toFixed(2),
          );

          subtotal += itemSubtotal;
          totalDiscountAmount += itemDiscount;
          totalTaxAmount += itemTax;
        }

        const totalAmount = Number(
          (subtotal - totalDiscountAmount + totalTaxAmount).toFixed(2),
        );

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

              // Create stock movement for reversion
              await tx.stockMovement.create({
                data: {
                  productId: existingItem.productId,
                  businessId,
                  type: "IN",
                  quantity: existingItem.quantity,
                  reference: data.id,
                  reason: "Sale Update - Revert",
                  notes: `Reverted stock for sale update`,
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

          // Check inventory for new items
          if (product.trackInventory) {
            const inventory = await tx.inventory.findFirst({
              where: {
                productId: item.productId,
                businessId,
              },
            });

            if (!inventory) {
              throw new Error(
                `No inventory record found for product: ${product.name}`,
              );
            }

            if (
              inventory.availableQty < item.quantity &&
              !product.allowNegative
            ) {
              throw new Error(
                `Insufficient stock for product: ${product.name}. Available: ${inventory.availableQty}, Required: ${item.quantity}`,
              );
            }
          }

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

              // Create stock movement
              await tx.stockMovement.create({
                data: {
                  productId: item.productId,
                  businessId,
                  type: "OUT",
                  quantity: item.quantity,
                  reference: data.id,
                  reason: "Sale Update",
                  notes: `Updated sale item`,
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

    // Authentication and authorization
    const supabase = await createSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) throw new Error("User not authenticated");

    const dbUser = await prisma.user.findUnique({
      where: { userId: user.id },
    });

    if (!dbUser) {
      throw new Error("User not found in database");
    }

    // Verify business access
    const businessAccess = await prisma.business.findFirst({
      where: {
        id: businessId,
        OR: [
          { ownerId: dbUser.id },
          { users: { some: { userId: dbUser.id, isActive: true } } },
        ],
      },
    });

    if (!businessAccess) {
      throw new Error("Access denied to business");
    }

    // Input validation
    if (!id || typeof id !== "string" || id.trim().length === 0) {
      throw new Error("Invalid sale ID");
    }

    const sale = await prisma.$transaction(async (tx) => {
      const existingSale = await tx.sale.findFirst({
        where: {
          id: id.trim(),
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

      // Check if sale has payments - only allow cancellation if no payments or full refund
      if (existingSale.paidAmount.toNumber() > 0) {
        throw new Error(
          "Cannot cancel sale with payments. Create a return instead.",
        );
      }

      // Update sale status
      const cancelledSale = await tx.sale.update({
        where: { id: id.trim() },
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
                reference: id.trim(),
                reason: "Sale cancellation",
                notes: `Sale ${existingSale.invoiceNumber} cancelled - stock restored`,
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

    // Authentication and authorization
    const supabase = await createSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) throw new Error("User not authenticated");

    const dbUser = await prisma.user.findUnique({
      where: { userId: user.id },
    });

    if (!dbUser) {
      throw new Error("User not found in database");
    }

    // Verify business access
    const businessAccess = await prisma.business.findFirst({
      where: {
        id: businessId,
        OR: [
          { ownerId: dbUser.id },
          { users: { some: { userId: dbUser.id, isActive: true } } },
        ],
      },
    });

    if (!businessAccess) {
      throw new Error("Access denied to business");
    }

    // Input validation
    if (!saleId || typeof saleId !== "string" || saleId.trim().length === 0) {
      throw new Error("Invalid sale ID");
    }

    if (!amount || typeof amount !== "number" || amount <= 0) {
      throw new Error("Payment amount must be greater than 0");
    }

    if (amount > 999999999) {
      throw new Error("Payment amount is too large");
    }

    if (
      !paymentMethod ||
      !Object.values(PaymentMethod).includes(paymentMethod)
    ) {
      throw new Error("Invalid payment method");
    }

    const updatedSale = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: {
          id: saleId.trim(),
          businessId,
        },
      });

      if (!sale) {
        throw new Error("Sale not found");
      }

      if (sale.status === SaleStatus.CANCELLED) {
        throw new Error("Cannot record payment for cancelled sale");
      }

      const currentBalance = sale.balanceAmount.toNumber();

      if (amount > currentBalance) {
        throw new Error(
          `Payment amount (${amount}) cannot exceed balance amount (${currentBalance})`,
        );
      }

      const newPaidAmount = sale.paidAmount.toNumber() + amount;
      const newBalanceAmount = sale.totalAmount.toNumber() - newPaidAmount;

      // Update sale payment amounts
      const updated = await tx.sale.update({
        where: { id: saleId.trim() },
        data: {
          paidAmount: new Decimal(newPaidAmount),
          balanceAmount: new Decimal(newBalanceAmount),
          status: newBalanceAmount <= 0.01 ? SaleStatus.COMPLETED : sale.status, // Use small tolerance for floating point
          updatedAt: new Date(),
        },
      });

      // Create transaction record for accounting
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
            description: `Payment received for sale ${sale.invoiceNumber}`,
            amount: new Decimal(amount),
            type: "RECEIPT",
            debitAccountId: cashAccount.id,
            creditAccountId: receivablesAccount.id,
            saleId: saleId.trim(),
            partyId: sale.partyId,
            reference: `SAL-${sale.invoiceNumber}`,
            notes: notes?.trim() || null,
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

    // Authentication and authorization
    const supabase = await createSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) throw new Error("User not authenticated");

    const dbUser = await prisma.user.findUnique({
      where: { userId: user.id },
    });

    if (!dbUser) {
      throw new Error("User not found in database");
    }

    // Verify business access
    const businessAccess = await prisma.business.findFirst({
      where: {
        id: businessId,
        OR: [
          { ownerId: dbUser.id },
          { users: { some: { userId: dbUser.id, isActive: true } } },
        ],
      },
    });

    if (!businessAccess) {
      throw new Error("Access denied to business");
    }

    // Input validation
    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw new Error("Start date cannot be after end date");
    }

    if (dateFrom && dateFrom > new Date()) {
      throw new Error("Start date cannot be in the future");
    }

    if (dateTo && dateTo > new Date()) {
      throw new Error("End date cannot be in the future");
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
        totalAmount: Number(
          (totalAmount._sum.totalAmount?.toNumber() || 0).toFixed(2),
        ),
        paidAmount: Number(
          (paidAmount._sum.paidAmount?.toNumber() || 0).toFixed(2),
        ),
        pendingAmount: Number(
          (pendingAmount._sum.balanceAmount?.toNumber() || 0).toFixed(2),
        ),
        averageSaleValue:
          totalSales > 0
            ? Number(
                (
                  (totalAmount._sum.totalAmount?.toNumber() || 0) / totalSales
                ).toFixed(2),
              )
            : 0,
        dateRange: {
          from: dateFrom || null,
          to: dateTo || null,
        },
      },
      errorMessage: null,
    };
  } catch (error) {
    console.error("Error fetching sales statistics:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};
