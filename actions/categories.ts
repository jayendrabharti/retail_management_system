"use server";

import prisma from "@/prisma/client";
import { Category } from "@prisma/client";
import { createSupabaseClient } from "@/supabase/server";
import { getErrorMessage } from "@/utils/utils";
import { revalidatePath } from "next/cache";
import { getCurrentBusinessId } from "./businesses";

export interface CategoryWithProducts extends Category {
  products: { id: string }[];
  _count: {
    products: number;
  };
}
// Types
interface CreateCategoryData {
  name: string;
  description?: string;
}

interface UpdateCategoryData {
  id: string;
  name?: string;
  description?: string;
  isActive?: boolean;
}

interface CategoryResult {
  data: Category | null;
  errorMessage: string | null;
}

interface CategoriesResult {
  data: CategoryWithProducts[] | null;
  errorMessage: string | null;
}

// Get all categories for current business
export const getCategoriesAction = async (): Promise<CategoriesResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const categories = await prisma.category.findMany({
      where: {
        businessId,
        isActive: true,
      },
      include: {
        products: {
          where: { isActive: true },
          select: { id: true },
        },
        _count: {
          select: {
            products: {
              where: { isActive: true },
            },
          },
        },
      },
      orderBy: [{ name: "asc" }],
    });

    return { data: categories, errorMessage: null };
  } catch (error) {
    console.error("Error fetching categories:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Get category by ID
export const getCategoryAction = async (
  id: string,
): Promise<CategoryResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const category = await prisma.category.findFirst({
      where: {
        id,
        businessId,
        isActive: true,
      },
      include: {
        products: {
          where: { isActive: true },
        },
        _count: {
          select: {
            products: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    if (!category) {
      throw new Error("Category not found");
    }

    return { data: category, errorMessage: null };
  } catch (error) {
    console.error("Error fetching category:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Create new category
export const createCategoryAction = async (
  data: CreateCategoryData,
): Promise<CategoryResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    // Check if category name already exists at the same level
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: data.name,
        businessId,
      },
    });

    if (existingCategory) {
      throw new Error("Category name already exists at this level");
    }

    const category = await prisma.category.create({
      data: {
        name: data.name,
        description: data.description,
        businessId,
      },
    });

    revalidatePath("/inventory");

    return { data: category, errorMessage: null };
  } catch (error) {
    console.error("Error creating category:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Update category
export const updateCategoryAction = async (
  data: UpdateCategoryData,
): Promise<CategoryResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    // Verify category exists
    const existingCategory = await prisma.category.findFirst({
      where: {
        id: data.id,
        businessId,
      },
    });

    if (!existingCategory) {
      throw new Error("Category not found");
    }

    // Check if new name conflicts (if name is being changed)
    if (data.name && data.name !== existingCategory.name) {
      const nameConflict = await prisma.category.findFirst({
        where: {
          id: { not: data.id },
          name: data.name,
          businessId,
          isActive: true,
        },
      });

      if (nameConflict) {
        throw new Error("Category name already exists at this level");
      }
    }

    const category = await prisma.category.update({
      where: {
        id: data.id,
      },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        updatedAt: new Date(),
      },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    revalidatePath("/inventory");
    return { data: category, errorMessage: null };
  } catch (error) {
    console.error("Error updating category:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Delete category (soft delete)
export const deleteCategoryAction = async (
  id: string,
): Promise<CategoryResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    // Check if category has products
    const productsCount = await prisma.product.count({
      where: {
        categoryId: id,
        businessId,
        isActive: true,
      },
    });

    if (productsCount > 0) {
      throw new Error("Cannot delete category with active products");
    }

    const category = await prisma.category.delete({
      where: {
        id,
      },
    });

    revalidatePath("/inventory");

    return { data: category, errorMessage: null };
  } catch (error) {
    console.error("Error deleting category:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};
