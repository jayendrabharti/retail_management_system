"use server";

import prisma from "@/prisma/client";
import { Address, AddressType } from "@prisma/client";
import { getCurrentBusinessId } from "./businesses";
import { getErrorMessage } from "@/utils/utils";
import { revalidatePath } from "next/cache";

// Types
interface CreateAddressData {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
  addressType: AddressType;
  isDefault?: boolean;
  // One of these should be provided
  staffId?: string;
  partyId?: string;
  businessId?: string;
}

interface UpdateAddressData {
  id: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  addressType?: AddressType;
  isDefault?: boolean;
  isDeleted?: boolean;
}

interface AddressResult {
  data: Address | null;
  errorMessage: string | null;
}

interface AddressesResult {
  data: Address[] | null;
  errorMessage: string | null;
}

// Get addresses with filters
export const getAddressesAction = async (
  entityType?: "staff" | "party" | "business",
  entityId?: string,
  addressType?: AddressType,
): Promise<AddressesResult> => {
  try {
    const whereClause: any = {
      isDeleted: false,
    };

    if (entityType && entityId) {
      if (entityType === "staff") whereClause.staffId = entityId;
      else if (entityType === "party") whereClause.partyId = entityId;
      else if (entityType === "business") whereClause.businessId = entityId;
    }

    if (addressType) whereClause.addressType = addressType;

    const addresses = await prisma.address.findMany({
      where: whereClause,
      include: {
        staff: {
          select: {
            id: true,
            name: true,
          },
        },
        party: {
          select: {
            id: true,
            name: true,
          },
        },
        business: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return {
      data: addresses,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Create address
export const createAddressAction = async (
  addressData: CreateAddressData,
): Promise<AddressResult> => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // If this is set as default, unset other default addresses for the same entity
      if (addressData.isDefault) {
        const updateData: any = { isDefault: false };
        const whereClause: any = {};

        if (addressData.staffId) {
          whereClause.staffId = addressData.staffId;
        } else if (addressData.partyId) {
          whereClause.partyId = addressData.partyId;
        } else if (addressData.businessId) {
          whereClause.businessId = addressData.businessId;
        }

        if (Object.keys(whereClause).length > 0) {
          await tx.address.updateMany({
            where: whereClause,
            data: updateData,
          });
        }
      }

      // Create the new address
      const address = await tx.address.create({
        data: {
          ...addressData,
          country: addressData.country || "India",
        },
        include: {
          staff: {
            select: {
              id: true,
              name: true,
            },
          },
          party: {
            select: {
              id: true,
              name: true,
            },
          },
          business: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return address;
    });

    revalidatePath("/");
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

// Update address
export const updateAddressAction = async (
  addressData: UpdateAddressData,
): Promise<AddressResult> => {
  try {
    const { id, ...updateData } = addressData;

    const result = await prisma.$transaction(async (tx) => {
      // Get current address to know which entity it belongs to
      const currentAddress = await tx.address.findUnique({
        where: { id },
        select: {
          staffId: true,
          partyId: true,
          businessId: true,
        },
      });

      if (!currentAddress) {
        throw new Error("Address not found");
      }

      // If setting as default, unset other default addresses for the same entity
      if (updateData.isDefault === true) {
        const whereClause: any = {};

        if (currentAddress.staffId) {
          whereClause.staffId = currentAddress.staffId;
        } else if (currentAddress.partyId) {
          whereClause.partyId = currentAddress.partyId;
        } else if (currentAddress.businessId) {
          whereClause.businessId = currentAddress.businessId;
        }

        if (Object.keys(whereClause).length > 0) {
          await tx.address.updateMany({
            where: {
              ...whereClause,
              id: { not: id },
            },
            data: { isDefault: false },
          });
        }
      }

      // Update the address
      const address = await tx.address.update({
        where: { id },
        data: updateData,
        include: {
          staff: {
            select: {
              id: true,
              name: true,
            },
          },
          party: {
            select: {
              id: true,
              name: true,
            },
          },
          business: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return address;
    });

    revalidatePath("/");
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

// Get address by ID
export const getAddressByIdAction = async (
  id: string,
): Promise<AddressResult> => {
  try {
    const address = await prisma.address.findUnique({
      where: { id },
      include: {
        staff: {
          select: {
            id: true,
            name: true,
          },
        },
        party: {
          select: {
            id: true,
            name: true,
          },
        },
        business: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      data: address,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Delete address (soft delete)
export const deleteAddressAction = async (
  id: string,
): Promise<AddressResult> => {
  try {
    const address = await prisma.address.update({
      where: { id },
      data: { isDeleted: true },
      include: {
        staff: {
          select: {
            id: true,
            name: true,
          },
        },
        party: {
          select: {
            id: true,
            name: true,
          },
        },
        business: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    revalidatePath("/");
    return {
      data: address,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Get staff addresses
export const getStaffAddressesAction = async (
  staffId: string,
): Promise<AddressesResult> => {
  try {
    const addresses = await prisma.address.findMany({
      where: {
        staffId,
        isDeleted: false,
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return {
      data: addresses,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Get party addresses
export const getPartyAddressesAction = async (
  partyId: string,
): Promise<AddressesResult> => {
  try {
    const addresses = await prisma.address.findMany({
      where: {
        partyId,
        isDeleted: false,
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return {
      data: addresses,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Get business addresses
export const getBusinessAddressesAction = async (
  businessId?: string,
): Promise<AddressesResult> => {
  try {
    const targetBusinessId = businessId || (await getCurrentBusinessId());
    if (!targetBusinessId) {
      throw new Error("No business ID provided");
    }

    const addresses = await prisma.address.findMany({
      where: {
        businessId: targetBusinessId,
        isDeleted: false,
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return {
      data: addresses,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Set default address
export const setDefaultAddressAction = async (
  id: string,
): Promise<AddressResult> => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Get the address to know which entity it belongs to
      const address = await tx.address.findUnique({
        where: { id },
        select: {
          staffId: true,
          partyId: true,
          businessId: true,
        },
      });

      if (!address) {
        throw new Error("Address not found");
      }

      // Unset other default addresses for the same entity
      const whereClause: any = {};
      if (address.staffId) whereClause.staffId = address.staffId;
      else if (address.partyId) whereClause.partyId = address.partyId;
      else if (address.businessId) whereClause.businessId = address.businessId;

      if (Object.keys(whereClause).length > 0) {
        await tx.address.updateMany({
          where: whereClause,
          data: { isDefault: false },
        });
      }

      // Set this address as default
      const updatedAddress = await tx.address.update({
        where: { id },
        data: { isDefault: true },
        include: {
          staff: {
            select: {
              id: true,
              name: true,
            },
          },
          party: {
            select: {
              id: true,
              name: true,
            },
          },
          business: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return updatedAddress;
    });

    revalidatePath("/");
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
