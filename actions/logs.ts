"use server";

import prisma from "@/prisma/client";
import { AuditLog, BusinessLog } from "@prisma/client";
import { getCurrentBusinessId } from "./businesses";
import { getErrorMessage } from "@/utils/utils";

// Types
interface CreateAuditLogData {
  tableName: string;
  recordId: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  oldData?: any;
  newData?: any;
  userId: string;
}

interface CreateBusinessLogData {
  action: string;
  note?: string;
  tableName?: string;
  recordId?: string;
  oldValues?: any;
  newValues?: any;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}

interface AuditLogResult {
  data: AuditLog | null;
  errorMessage: string | null;
}

interface AuditLogsResult {
  data: AuditLog[] | null;
  errorMessage: string | null;
}

interface BusinessLogResult {
  data: BusinessLog | null;
  errorMessage: string | null;
}

interface BusinessLogsResult {
  data: BusinessLog[] | null;
  errorMessage: string | null;
}

// ============================================
// AUDIT LOG MANAGEMENT
// ============================================

// Get audit logs with filters
export const getAuditLogsAction = async (
  tableName?: string,
  recordId?: string,
  userId?: string,
  action?: string,
  startDate?: Date,
  endDate?: Date,
  limit?: number,
  offset?: number,
): Promise<AuditLogsResult> => {
  try {
    const whereClause: any = {};

    if (tableName) whereClause.tableName = tableName;
    if (recordId) whereClause.recordId = recordId;
    if (userId) whereClause.userId = userId;
    if (action) whereClause.action = action;
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = startDate;
      if (endDate) whereClause.createdAt.lte = endDate;
    }

    const auditLogs = await prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    return {
      data: auditLogs,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Create audit log
export const createAuditLogAction = async (
  auditData: CreateAuditLogData,
): Promise<AuditLogResult> => {
  try {
    const auditLog = await prisma.auditLog.create({
      data: auditData,
    });

    return {
      data: auditLog,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Get audit log by ID
export const getAuditLogByIdAction = async (
  id: string,
): Promise<AuditLogResult> => {
  try {
    const auditLog = await prisma.auditLog.findUnique({
      where: { id },
    });

    return {
      data: auditLog,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Get audit logs for a specific record
export const getRecordAuditLogsAction = async (
  tableName: string,
  recordId: string,
): Promise<AuditLogsResult> => {
  try {
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        tableName,
        recordId,
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      data: auditLogs,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Get audit logs by user
export const getUserAuditLogsAction = async (
  userId: string,
  limit?: number,
  offset?: number,
): Promise<AuditLogsResult> => {
  try {
    const auditLogs = await prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    return {
      data: auditLogs,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// ============================================
// BUSINESS LOG MANAGEMENT
// ============================================

// Get business logs for current business
export const getBusinessLogsAction = async (
  action?: string,
  tableName?: string,
  userId?: string,
  startDate?: Date,
  endDate?: Date,
  limit?: number,
  offset?: number,
): Promise<BusinessLogsResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const whereClause: any = {
      businessId,
    };

    if (action) whereClause.action = action;
    if (tableName) whereClause.tableName = tableName;
    if (userId) whereClause.userId = userId;
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = startDate;
      if (endDate) whereClause.createdAt.lte = endDate;
    }

    const businessLogs = await prisma.businessLog.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    return {
      data: businessLogs,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Create business log
export const createBusinessLogAction = async (
  logData: CreateBusinessLogData,
): Promise<BusinessLogResult> => {
  try {
    const businessId = await getCurrentBusinessId();

    const businessLog = await prisma.businessLog.create({
      data: {
        ...logData,
        businessId,
      },
    });

    return {
      data: businessLog,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Get business log by ID
export const getBusinessLogByIdAction = async (
  id: string,
): Promise<BusinessLogResult> => {
  try {
    const businessLog = await prisma.businessLog.findUnique({
      where: { id },
    });

    return {
      data: businessLog,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Log user action
export const logUserActionAction = async (
  action: string,
  note?: string,
  tableName?: string,
  recordId?: string,
  oldValues?: any,
  newValues?: any,
  request?: Request,
): Promise<BusinessLogResult> => {
  try {
    const businessId = await getCurrentBusinessId();

    // Extract user ID from session or context
    // This would need to be implemented based on your auth system
    const userId = "current-user-id"; // Replace with actual user ID extraction

    // Extract IP and user agent from request if provided
    let ipAddress: string | undefined;
    let userAgent: string | undefined;

    if (request) {
      ipAddress =
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown";
      userAgent = request.headers.get("user-agent") || undefined;
    }

    const businessLog = await prisma.businessLog.create({
      data: {
        businessId,
        action,
        note,
        tableName,
        recordId,
        oldValues,
        newValues,
        userId,
        ipAddress,
        userAgent,
      },
    });

    return {
      data: businessLog,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Get recent activity
export const getRecentActivityAction = async (
  limit: number = 50,
): Promise<BusinessLogsResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const businessLogs = await prisma.businessLog.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return {
      data: businessLogs,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Get activity by date range
export const getActivityByDateRangeAction = async (
  startDate: Date,
  endDate: Date,
): Promise<BusinessLogsResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const businessLogs = await prisma.businessLog.findMany({
      where: {
        businessId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      data: businessLogs,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Get activity summary
export const getActivitySummaryAction = async (
  startDate?: Date,
  endDate?: Date,
): Promise<{
  data: { [key: string]: number } | null;
  errorMessage: string | null;
}> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const whereClause: any = {
      businessId,
    };

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = startDate;
      if (endDate) whereClause.createdAt.lte = endDate;
    }

    const logs = await prisma.businessLog.findMany({
      where: whereClause,
      select: {
        action: true,
      },
    });

    const summary = logs.reduce(
      (acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      },
      {} as { [key: string]: number },
    );

    return {
      data: summary,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};
