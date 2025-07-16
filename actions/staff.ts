"use server";

import prisma from "@/prisma/client";
import { Staff, SalaryType } from "@prisma/client";
import { getCurrentBusinessId } from "./businesses";
import { getErrorMessage } from "@/utils/utils";
import { revalidatePath } from "next/cache";

// Types
interface CreateStaffData {
  employeeId?: string;
  name: string;
  position: string;
  department?: string;
  salary?: number;
  salaryType?: SalaryType;
  hireDate: Date;
  businessUserId: string;
  addresses?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
    addressType: string;
  }[];
}

interface UpdateStaffData {
  id: string;
  employeeId?: string;
  name?: string;
  position?: string;
  department?: string;
  salary?: number;
  salaryType?: SalaryType;
  hireDate?: Date;
  terminationDate?: Date;
  isActive?: boolean;
}

interface StaffResult {
  data: Staff | null;
  errorMessage: string | null;
}

interface StaffsResult {
  data: Staff[] | null;
  errorMessage: string | null;
}

// Get all staff for current business
export const getStaffAction = async (): Promise<StaffsResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const staff = await prisma.staff.findMany({
      where: {
        businessUser: {
          businessId,
        },
        isActive: true,
      },
      include: {
        addresses: true,
        businessUser: {
          include: {
            user: true,
            business: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return {
      data: staff,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Create staff
export const createStaffAction = async (
  staffData: CreateStaffData,
): Promise<StaffResult> => {
  try {
    const { addresses, ...staffInfo } = staffData;

    const staff = await prisma.staff.create({
      data: {
        ...staffInfo,
        addresses: addresses
          ? {
              create: addresses.map((addr) => ({
                ...addr,
                addressType: addr.addressType as any,
              })),
            }
          : undefined,
      },
      include: {
        addresses: true,
        businessUser: {
          include: {
            user: true,
            business: true,
          },
        },
      },
    });

    revalidatePath("/");
    return {
      data: staff,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Update staff
export const updateStaffAction = async (
  staffData: UpdateStaffData,
): Promise<StaffResult> => {
  try {
    const { id, ...updateData } = staffData;

    const staff = await prisma.staff.update({
      where: { id },
      data: updateData,
      include: {
        addresses: true,
        businessUser: {
          include: {
            user: true,
            business: true,
          },
        },
      },
    });

    revalidatePath("/");
    return {
      data: staff,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Get staff by ID
export const getStaffByIdAction = async (id: string): Promise<StaffResult> => {
  try {
    const staff = await prisma.staff.findUnique({
      where: { id },
      include: {
        addresses: true,
        businessUser: {
          include: {
            user: true,
            business: true,
          },
        },
      },
    });

    return {
      data: staff,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Terminate staff
export const terminateStaffAction = async (
  id: string,
  terminationDate: Date,
): Promise<StaffResult> => {
  try {
    const staff = await prisma.staff.update({
      where: { id },
      data: {
        terminationDate,
        isActive: false,
      },
      include: {
        addresses: true,
        businessUser: {
          include: {
            user: true,
            business: true,
          },
        },
      },
    });

    revalidatePath("/");
    return {
      data: staff,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Reactivate staff
export const reactivateStaffAction = async (
  id: string,
): Promise<StaffResult> => {
  try {
    const staff = await prisma.staff.update({
      where: { id },
      data: {
        terminationDate: null,
        isActive: true,
      },
      include: {
        addresses: true,
        businessUser: {
          include: {
            user: true,
            business: true,
          },
        },
      },
    });

    revalidatePath("/");
    return {
      data: staff,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Get staff by department
export const getStaffByDepartmentAction = async (
  department: string,
): Promise<StaffsResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const staff = await prisma.staff.findMany({
      where: {
        department,
        businessUser: {
          businessId,
        },
        isActive: true,
      },
      include: {
        addresses: true,
        businessUser: {
          include: {
            user: true,
            business: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return {
      data: staff,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Search staff
export const searchStaffAction = async (
  searchTerm: string,
): Promise<StaffsResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const staff = await prisma.staff.findMany({
      where: {
        businessUser: {
          businessId,
        },
        isActive: true,
        OR: [
          { name: { contains: searchTerm, mode: "insensitive" } },
          { employeeId: { contains: searchTerm, mode: "insensitive" } },
          { position: { contains: searchTerm, mode: "insensitive" } },
          { department: { contains: searchTerm, mode: "insensitive" } },
        ],
      },
      include: {
        addresses: true,
        businessUser: {
          include: {
            user: true,
            business: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return {
      data: staff,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};
