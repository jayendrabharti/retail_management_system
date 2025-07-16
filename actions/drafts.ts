"use server";

import prisma from "@/prisma/client";
import { Draft } from "@prisma/client";
import { getCurrentBusinessId } from "./businesses";
import { getErrorMessage } from "@/utils/utils";
import { revalidatePath } from "next/cache";

// Types
interface CreateDraftData {
  type: string;
  data: any;
  expiresAt?: Date;
}

interface UpdateDraftData {
  id: string;
  type?: string;
  data?: any;
  expiresAt?: Date;
}

interface DraftResult {
  data: Draft | null;
  errorMessage: string | null;
}

interface DraftsResult {
  data: Draft[] | null;
  errorMessage: string | null;
}

// Get all drafts for current business
export const getDraftsAction = async (
  type?: string,
  limit?: number,
  offset?: number,
): Promise<DraftsResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const whereClause: any = {
      businessId,
    };

    if (type) whereClause.type = type;

    const drafts = await prisma.draft.findMany({
      where: whereClause,
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
    });

    return {
      data: drafts,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Create draft
export const createDraftAction = async (
  draftData: CreateDraftData,
): Promise<DraftResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    // Set default expiry to 30 days if not provided
    const defaultExpiry = new Date();
    defaultExpiry.setDate(defaultExpiry.getDate() + 30);

    const draft = await prisma.draft.create({
      data: {
        ...draftData,
        businessId,
        expiresAt: draftData.expiresAt || defaultExpiry,
      },
    });

    revalidatePath("/drafts");
    return {
      data: draft,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Update draft
export const updateDraftAction = async (
  draftData: UpdateDraftData,
): Promise<DraftResult> => {
  try {
    const { id, ...updateData } = draftData;

    const draft = await prisma.draft.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/drafts");
    return {
      data: draft,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Get draft by ID
export const getDraftByIdAction = async (id: string): Promise<DraftResult> => {
  try {
    const draft = await prisma.draft.findUnique({
      where: { id },
    });

    return {
      data: draft,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Delete draft
export const deleteDraftAction = async (id: string): Promise<DraftResult> => {
  try {
    const draft = await prisma.draft.delete({
      where: { id },
    });

    revalidatePath("/drafts");
    return {
      data: draft,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Get drafts by type
export const getDraftsByTypeAction = async (
  type: string,
): Promise<DraftsResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const drafts = await prisma.draft.findMany({
      where: {
        businessId,
        type,
      },
      orderBy: { updatedAt: "desc" },
    });

    return {
      data: drafts,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Save sale draft
export const saveSaleDraftAction = async (
  saleData: any,
): Promise<DraftResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    // Check if a draft already exists for this sale
    const existingDraft = await prisma.draft.findFirst({
      where: {
        businessId,
        type: "sale",
        data: {
          path: ["id"],
          equals: saleData.id,
        },
      },
    });

    let draft;
    if (existingDraft) {
      // Update existing draft
      draft = await prisma.draft.update({
        where: { id: existingDraft.id },
        data: {
          data: saleData,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new draft
      draft = await prisma.draft.create({
        data: {
          businessId,
          type: "sale",
          data: saleData,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });
    }

    return {
      data: draft,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Save purchase draft
export const savePurchaseDraftAction = async (
  purchaseData: any,
): Promise<DraftResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    // Check if a draft already exists for this purchase
    const existingDraft = await prisma.draft.findFirst({
      where: {
        businessId,
        type: "purchase",
        data: {
          path: ["id"],
          equals: purchaseData.id,
        },
      },
    });

    let draft;
    if (existingDraft) {
      // Update existing draft
      draft = await prisma.draft.update({
        where: { id: existingDraft.id },
        data: {
          data: purchaseData,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new draft
      draft = await prisma.draft.create({
        data: {
          businessId,
          type: "purchase",
          data: purchaseData,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });
    }

    return {
      data: draft,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Save quotation draft
export const saveQuotationDraftAction = async (
  quotationData: any,
): Promise<DraftResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    // Check if a draft already exists for this quotation
    const existingDraft = await prisma.draft.findFirst({
      where: {
        businessId,
        type: "quotation",
        data: {
          path: ["id"],
          equals: quotationData.id,
        },
      },
    });

    let draft;
    if (existingDraft) {
      // Update existing draft
      draft = await prisma.draft.update({
        where: { id: existingDraft.id },
        data: {
          data: quotationData,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new draft
      draft = await prisma.draft.create({
        data: {
          businessId,
          type: "quotation",
          data: quotationData,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });
    }

    return {
      data: draft,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Clean expired drafts
export const cleanExpiredDraftsAction = async (): Promise<{
  data: { deletedCount: number } | null;
  errorMessage: string | null;
}> => {
  try {
    const result = await prisma.draft.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return {
      data: { deletedCount: result.count },
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Auto-save functionality (for real-time editing)
export const autoSaveDraftAction = async (
  type: string,
  data: any,
  tempId?: string,
): Promise<DraftResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    // Use tempId or generate one based on data structure
    const identifier = tempId || data.id || `temp_${Date.now()}`;

    const existingDraft = await prisma.draft.findFirst({
      where: {
        businessId,
        type,
        data: {
          path: ["tempId"],
          equals: identifier,
        },
      },
    });

    let draft;
    if (existingDraft) {
      draft = await prisma.draft.update({
        where: { id: existingDraft.id },
        data: {
          data: { ...data, tempId: identifier },
          updatedAt: new Date(),
        },
      });
    } else {
      draft = await prisma.draft.create({
        data: {
          businessId,
          type,
          data: { ...data, tempId: identifier },
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days for auto-save
        },
      });
    }

    return {
      data: draft,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};
