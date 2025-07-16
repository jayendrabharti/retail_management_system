"use server";

import prisma from "@/prisma/client";
import { Category } from "@prisma/client";
import { createSupabaseClient } from "@/supabase/server";
import { getErrorMessage } from "@/utils/utils";
import { revalidatePath } from "next/cache";
import { getCurrentBusinessId } from "./businesses";

// Types
interface CreateCategoryData {
  name: string;
  description?: string;
  parentId?: string;
}

interface UpdateCategoryData {
  id: string;
  name?: string;
  description?: string;
  parentId?: string;
  isActive?: boolean;
}

interface CategoryResult {
  data: Category | null;
  errorMessage: string | null;
}

interface CategoriesResult {
  data: Category[] | null;
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
        parent: true,
        children: {
          where: { isActive: true },
        },
        products: {
          where: { isActive: true },
          select: { id: true },
        },
        _count: {
          select: {
            products: {
              where: { isActive: true },
            },
            children: {
              where: { isActive: true },
            },
          },
        },
      },
      orderBy: [{ parentId: "asc" }, { name: "asc" }],
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
        parent: true,
        children: {
          where: { isActive: true },
        },
        products: {
          where: { isActive: true },
        },
        _count: {
          select: {
            products: {
              where: { isActive: true },
            },
            children: {
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

    // Verify parent category exists if provided
    if (data.parentId) {
      const parentCategory = await prisma.category.findFirst({
        where: {
          id: data.parentId,
          businessId,
          isActive: true,
        },
      });

      if (!parentCategory) {
        throw new Error("Parent category not found");
      }
    }

    // Check if category name already exists at the same level
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: data.name,
        businessId,
        parentId: data.parentId || null,
        isActive: true,
      },
    });

    if (existingCategory) {
      throw new Error("Category name already exists at this level");
    }

    const category = await prisma.category.create({
      data: {
        name: data.name,
        description: data.description,
        parentId: data.parentId,
        businessId,
      },
      include: {
        parent: true,
        children: {
          where: { isActive: true },
        },
        _count: {
          select: {
            products: true,
            children: true,
          },
        },
      },
    });

    revalidatePath("/inventory/categories");
    revalidatePath("/inventory/products");

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

    // Verify parent category exists if provided
    if (data.parentId && data.parentId !== existingCategory.parentId) {
      const parentCategory = await prisma.category.findFirst({
        where: {
          id: data.parentId,
          businessId,
          isActive: true,
        },
      });

      if (!parentCategory) {
        throw new Error("Parent category not found");
      }

      // Prevent circular reference
      if (data.parentId === data.id) {
        throw new Error("Category cannot be its own parent");
      }
    }

    // Check if new name conflicts (if name is being changed)
    if (data.name && data.name !== existingCategory.name) {
      const nameConflict = await prisma.category.findFirst({
        where: {
          name: data.name,
          businessId,
          parentId: data.parentId ?? existingCategory.parentId,
          isActive: true,
          id: { not: data.id },
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
        ...(data.parentId !== undefined && { parentId: data.parentId }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        updatedAt: new Date(),
      },
      include: {
        parent: true,
        children: {
          where: { isActive: true },
        },
        _count: {
          select: {
            products: true,
            children: true,
          },
        },
      },
    });

    revalidatePath("/inventory/categories");
    revalidatePath("/inventory/products");

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

    // Check if category has subcategories
    const subcategoriesCount = await prisma.category.count({
      where: {
        parentId: id,
        businessId,
        isActive: true,
      },
    });

    if (subcategoriesCount > 0) {
      throw new Error("Cannot delete category with active subcategories");
    }

    const category = await prisma.category.update({
      where: {
        id,
      },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    revalidatePath("/inventory/categories");
    revalidatePath("/inventory/products");

    return { data: category, errorMessage: null };
  } catch (error) {
    console.error("Error deleting category:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Get category hierarchy (tree structure)
export const getCategoryHierarchyAction =
  async (): Promise<CategoriesResult> => {
    try {
      const businessId = await getCurrentBusinessId();
      if (!businessId) {
        throw new Error("No business selected");
      }

      // Get all categories and build tree structure
      const categories = await prisma.category.findMany({
        where: {
          businessId,
          isActive: true,
        },
        include: {
          children: {
            where: { isActive: true },
            include: {
              children: {
                where: { isActive: true },
              },
              _count: {
                select: {
                  products: { where: { isActive: true } },
                },
              },
            },
          },
          _count: {
            select: {
              products: { where: { isActive: true } },
            },
          },
        },
        orderBy: { name: "asc" },
      });

      // Filter to get only root categories (those without parent)
      const rootCategories = categories.filter((cat) => !cat.parentId);

      return { data: rootCategories, errorMessage: null };
    } catch (error) {
      console.error("Error fetching category hierarchy:", error);
      return { data: null, errorMessage: getErrorMessage(error) };
    }
  };
