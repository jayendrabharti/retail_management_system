"use server";

import prisma from "@/prisma/client";
import { Product } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { createSupabaseClient } from "@/supabase/server";
import { getErrorMessage } from "@/utils/utils";
import { revalidatePath } from "next/cache";
import { getCurrentBusinessId } from "./businesses";

// Types
interface CreateProductData {
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  categoryId: string;
  brand?: string;
  model?: string;
  color?: string;
  size?: string;
  weight?: number;
  dimensions?: string;
  image?: string;
  attachments?: string[];
  unit?: string;
  secondaryUnit?: string;
  unitConvertion?: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  reorderLevel?: number;
  costPrice: number;
  sellingPrice: number;
  mrp?: number;
  taxRate: number;
  discountRate: number;
  isService?: boolean;
  trackInventory?: boolean;
  allowNegative?: boolean;
}

interface UpdateProductData {
  id: string;
  name?: string;
  description?: string;
  sku?: string;
  barcode?: string;
  categoryId?: string;
  brand?: string;
  model?: string;
  color?: string;
  size?: string;
  weight?: number;
  dimensions?: string;
  image?: string;
  attachments?: string[];
  unit?: string;
  secondaryUnit?: string;
  unitConvertion?: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  reorderLevel?: number;
  costPrice?: number;
  sellingPrice?: number;
  mrp?: number;
  taxRate?: number;
  discountRate?: number;
  isActive?: boolean;
  isService?: boolean;
  trackInventory?: boolean;
  allowNegative?: boolean;
}

interface ProductResult {
  data: Product | null;
  errorMessage: string | null;
}

interface ProductsResult {
  data: Product[] | null;
  errorMessage: string | null;
}

interface ProductFilters {
  categoryId?: string;
  brand?: string;
  isService?: boolean;
  trackInventory?: boolean;
  lowStock?: boolean;
  search?: string;
  priceRange?: { min: number; max: number };
}

// Get all products for current business
export const getProductsAction = async (
  filters?: ProductFilters,
): Promise<ProductsResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const whereClause: any = {
      businessId,
      isActive: true,
    };

    // Apply filters
    if (filters?.categoryId) {
      whereClause.categoryId = filters.categoryId;
    }

    if (filters?.brand) {
      whereClause.brand = { contains: filters.brand, mode: "insensitive" };
    }

    if (filters?.isService !== undefined) {
      whereClause.isService = filters.isService;
    }

    if (filters?.trackInventory !== undefined) {
      whereClause.trackInventory = filters.trackInventory;
    }

    if (filters?.search) {
      whereClause.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { sku: { contains: filters.search, mode: "insensitive" } },
        { barcode: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters?.priceRange) {
      whereClause.sellingPrice = {
        gte: filters.priceRange.min,
        lte: filters.priceRange.max,
      };
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        category: true,
        inventory: true,
        _count: {
          select: {
            purchaseItems: true,
            saleItems: true,
            stockMovements: true,
          },
        },
      },
      orderBy: [{ name: "asc" }],
    });

    // Filter for low stock if requested
    let filteredProducts = products;
    if (filters?.lowStock) {
      filteredProducts = products.filter((product) => {
        const inventory = product.inventory[0];
        return inventory && product.minStockLevel
          ? inventory.availableQty <= product.minStockLevel
          : false;
      });
    }

    return { data: filteredProducts, errorMessage: null };
  } catch (error) {
    console.error("Error fetching products:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Get product by ID
export const getProductAction = async (id: string): Promise<ProductResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const product = await prisma.product.findFirst({
      where: {
        id,
        businessId,
        isActive: true,
      },
      include: {
        category: true,
        inventory: true,
        productBatch: true,
        priceHistory: {
          orderBy: { effectiveFrom: "desc" },
          take: 10,
        },
        stockMovements: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        _count: {
          select: {
            purchaseItems: true,
            saleItems: true,
            stockMovements: true,
          },
        },
      },
    });

    if (!product) {
      throw new Error("Product not found");
    }

    return { data: product, errorMessage: null };
  } catch (error) {
    console.error("Error fetching product:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Create new product
export const createProductAction = async (
  data: CreateProductData,
): Promise<ProductResult> => {
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

    // Verify category exists
    const category = await prisma.category.findFirst({
      where: {
        id: data.categoryId,
        businessId,
        isActive: true,
      },
    });

    if (!category) {
      throw new Error("Category not found");
    }

    // Generate SKU if not provided
    let sku = data.sku;
    if (!sku) {
      const productCount = await prisma.product.count({
        where: { businessId },
      });
      sku = `SKU-${String(productCount + 1).padStart(6, "0")}`;
    }

    // Check if SKU already exists
    const existingSku = await prisma.product.findFirst({
      where: {
        sku,
        businessId,
        isActive: true,
      },
    });

    if (existingSku) {
      throw new Error("SKU already exists");
    }

    // Check if barcode already exists (if provided)
    if (data.barcode) {
      const existingBarcode = await prisma.product.findFirst({
        where: {
          barcode: data.barcode,
          businessId,
          isActive: true,
        },
      });

      if (existingBarcode) {
        throw new Error("Barcode already exists");
      }
    }

    const product = await prisma.$transaction(async (tx) => {
      // Create product
      const newProduct = await tx.product.create({
        data: {
          name: data.name,
          description: data.description,
          sku,
          barcode: data.barcode,
          categoryId: data.categoryId,
          brand: data.brand,
          model: data.model,
          color: data.color,
          size: data.size,
          weight: data.weight ? new Decimal(data.weight) : null,
          dimensions: data.dimensions,
          image: data.image,
          attachments: data.attachments || [],
          unit: data.unit || "pcs",
          secondaryUnit: data.secondaryUnit,
          unitConvertion: data.unitConvertion
            ? new Decimal(data.unitConvertion)
            : null,
          minStockLevel: data.minStockLevel,
          maxStockLevel: data.maxStockLevel,
          reorderLevel: data.reorderLevel,
          costPrice: new Decimal(data.costPrice),
          sellingPrice: new Decimal(data.sellingPrice),
          mrp: data.mrp ? new Decimal(data.mrp) : null,
          taxRate: new Decimal(data.taxRate),
          discountRate: new Decimal(data.discountRate),
          isService: data.isService || false,
          trackInventory: data.trackInventory !== false,
          allowNegative: data.allowNegative || false,
          businessId,
          createdBy: dbUser.id,
        },
        include: {
          category: true,
        },
      });

      // Create inventory record if product tracks inventory
      if (newProduct.trackInventory) {
        await tx.inventory.create({
          data: {
            productId: newProduct.id,
            businessId,
            quantity: 0,
            reservedQty: 0,
            availableQty: 0,
          },
        });
      }

      // Create initial price history
      await tx.priceHistory.create({
        data: {
          productId: newProduct.id,
          costPrice: new Decimal(data.costPrice),
          sellingPrice: new Decimal(data.sellingPrice),
          mrp: data.mrp ? new Decimal(data.mrp) : null,
          reason: "Initial product creation",
        },
      });

      return newProduct;
    });

    revalidatePath("/inventory/products");
    revalidatePath("/inventory");

    return { data: product, errorMessage: null };
  } catch (error) {
    console.error("Error creating product:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Update product
export const updateProductAction = async (
  data: UpdateProductData,
): Promise<ProductResult> => {
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

    // Verify product exists
    const existingProduct = await prisma.product.findFirst({
      where: {
        id: data.id,
        businessId,
      },
    });

    if (!existingProduct) {
      throw new Error("Product not found");
    }

    // Verify category exists if being changed
    if (data.categoryId && data.categoryId !== existingProduct.categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: data.categoryId,
          businessId,
          isActive: true,
        },
      });

      if (!category) {
        throw new Error("Category not found");
      }
    }

    // Check SKU uniqueness if being changed
    if (data.sku && data.sku !== existingProduct.sku) {
      const existingSku = await prisma.product.findFirst({
        where: {
          sku: data.sku,
          businessId,
          isActive: true,
          id: { not: data.id },
        },
      });

      if (existingSku) {
        throw new Error("SKU already exists");
      }
    }

    // Check barcode uniqueness if being changed
    if (data.barcode && data.barcode !== existingProduct.barcode) {
      const existingBarcode = await prisma.product.findFirst({
        where: {
          barcode: data.barcode,
          businessId,
          isActive: true,
          id: { not: data.id },
        },
      });

      if (existingBarcode) {
        throw new Error("Barcode already exists");
      }
    }

    const product = await prisma.$transaction(async (tx) => {
      // Track price changes
      const priceChanged =
        (data.costPrice &&
          data.costPrice !== existingProduct.costPrice.toNumber()) ||
        (data.sellingPrice &&
          data.sellingPrice !== existingProduct.sellingPrice.toNumber()) ||
        (data.mrp && data.mrp !== existingProduct.mrp?.toNumber());

      // Update product
      const updatedProduct = await tx.product.update({
        where: { id: data.id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.description !== undefined && {
            description: data.description,
          }),
          ...(data.sku !== undefined && { sku: data.sku }),
          ...(data.barcode !== undefined && { barcode: data.barcode }),
          ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
          ...(data.brand !== undefined && { brand: data.brand }),
          ...(data.model !== undefined && { model: data.model }),
          ...(data.color !== undefined && { color: data.color }),
          ...(data.size !== undefined && { size: data.size }),
          ...(data.weight !== undefined && {
            weight: data.weight ? new Decimal(data.weight) : null,
          }),
          ...(data.dimensions !== undefined && { dimensions: data.dimensions }),
          ...(data.image !== undefined && { image: data.image }),
          ...(data.attachments !== undefined && {
            attachments: data.attachments,
          }),
          ...(data.unit !== undefined && { unit: data.unit }),
          ...(data.secondaryUnit !== undefined && {
            secondaryUnit: data.secondaryUnit,
          }),
          ...(data.unitConvertion !== undefined && {
            unitConvertion: data.unitConvertion
              ? new Decimal(data.unitConvertion)
              : null,
          }),
          ...(data.minStockLevel !== undefined && {
            minStockLevel: data.minStockLevel,
          }),
          ...(data.maxStockLevel !== undefined && {
            maxStockLevel: data.maxStockLevel,
          }),
          ...(data.reorderLevel !== undefined && {
            reorderLevel: data.reorderLevel,
          }),
          ...(data.costPrice !== undefined && {
            costPrice: new Decimal(data.costPrice),
          }),
          ...(data.sellingPrice !== undefined && {
            sellingPrice: new Decimal(data.sellingPrice),
          }),
          ...(data.mrp !== undefined && {
            mrp: data.mrp ? new Decimal(data.mrp) : null,
          }),
          ...(data.taxRate !== undefined && {
            taxRate: new Decimal(data.taxRate),
          }),
          ...(data.discountRate !== undefined && {
            discountRate: new Decimal(data.discountRate),
          }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
          ...(data.isService !== undefined && { isService: data.isService }),
          ...(data.trackInventory !== undefined && {
            trackInventory: data.trackInventory,
          }),
          ...(data.allowNegative !== undefined && {
            allowNegative: data.allowNegative,
          }),
          updatedBy: dbUser.id,
          updatedAt: new Date(),
        },
        include: {
          category: true,
        },
      });

      // Create price history if prices changed
      if (priceChanged) {
        await tx.priceHistory.create({
          data: {
            productId: data.id,
            costPrice: data.costPrice
              ? new Decimal(data.costPrice)
              : existingProduct.costPrice,
            sellingPrice: data.sellingPrice
              ? new Decimal(data.sellingPrice)
              : existingProduct.sellingPrice,
            mrp: data.mrp ? new Decimal(data.mrp) : existingProduct.mrp,
            reason: "Price update",
          },
        });
      }

      return updatedProduct;
    });

    revalidatePath("/inventory/products");
    revalidatePath("/inventory");

    return { data: product, errorMessage: null };
  } catch (error) {
    console.error("Error updating product:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Delete product (soft delete)
export const deleteProductAction = async (
  id: string,
): Promise<ProductResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    // Check if product has any transactions
    const transactionCount = await prisma.saleItem.count({
      where: { productId: id },
    });

    const purchaseCount = await prisma.purchaseItem.count({
      where: { productId: id },
    });

    if (transactionCount > 0 || purchaseCount > 0) {
      throw new Error("Cannot delete product with transaction history");
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    revalidatePath("/inventory/products");
    revalidatePath("/inventory");

    return { data: product, errorMessage: null };
  } catch (error) {
    console.error("Error deleting product:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Get low stock products
export const getLowStockProductsAction = async (): Promise<ProductsResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const products = await prisma.product.findMany({
      where: {
        businessId,
        isActive: true,
        trackInventory: true,
        minStockLevel: { not: null },
      },
      include: {
        category: true,
        inventory: true,
      },
    });

    // Filter products where available quantity is below minimum stock level
    const lowStockProducts = products.filter((product) => {
      const inventory = product.inventory[0];
      return inventory && product.minStockLevel
        ? inventory.availableQty <= product.minStockLevel
        : false;
    });

    return { data: lowStockProducts, errorMessage: null };
  } catch (error) {
    console.error("Error fetching low stock products:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};
