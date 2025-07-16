"use server";

import prisma from "@/prisma/client";
import { Report, ReportType } from "@prisma/client";
import { getCurrentBusinessId } from "./businesses";
import { getErrorMessage } from "@/utils/utils";
import { revalidatePath } from "next/cache";

// Types
interface CreateReportData {
  name: string;
  description?: string;
  reportType: ReportType;
  data: any;
  filters?: any;
  isScheduled?: boolean;
  scheduleConfig?: any;
}

interface UpdateReportData {
  id: string;
  name?: string;
  description?: string;
  data?: any;
  filters?: any;
  isScheduled?: boolean;
  scheduleConfig?: any;
}

interface ReportResult {
  data: Report | null;
  errorMessage: string | null;
}

interface ReportsResult {
  data: Report[] | null;
  errorMessage: string | null;
}

interface SalesReportData {
  totalSales: number;
  totalQuantity: number;
  totalOrders: number;
  averageOrderValue: number;
  topProducts: Array<{
    productId: string;
    productName: string;
    quantitySold: number;
    totalRevenue: number;
  }>;
  salesByDate: Array<{
    date: string;
    sales: number;
    orders: number;
  }>;
}

interface PurchaseReportData {
  totalPurchases: number;
  totalQuantity: number;
  totalOrders: number;
  averageOrderValue: number;
  topSuppliers: Array<{
    supplierId: string;
    supplierName: string;
    totalPurchases: number;
    orderCount: number;
  }>;
  purchasesByDate: Array<{
    date: string;
    purchases: number;
    orders: number;
  }>;
}

interface InventoryReportData {
  totalProducts: number;
  totalValue: number;
  lowStockProducts: Array<{
    productId: string;
    productName: string;
    currentStock: number;
    reorderLevel: number;
    value: number;
  }>;
  topValueProducts: Array<{
    productId: string;
    productName: string;
    quantity: number;
    value: number;
  }>;
}

// Get all reports for current business
export const getReportsAction = async (
  reportType?: ReportType,
  limit?: number,
  offset?: number,
): Promise<ReportsResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const whereClause: any = {
      businessId,
    };

    if (reportType) whereClause.reportType = reportType;

    const reports = await prisma.report.findMany({
      where: whereClause,
      orderBy: { generatedAt: "desc" },
      take: limit,
      skip: offset,
    });

    return {
      data: reports,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Create report
export const createReportAction = async (
  reportData: CreateReportData,
): Promise<ReportResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const report = await prisma.report.create({
      data: {
        ...reportData,
        businessId,
      },
    });

    revalidatePath("/reports");
    return {
      data: report,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Update report
export const updateReportAction = async (
  reportData: UpdateReportData,
): Promise<ReportResult> => {
  try {
    const { id, ...updateData } = reportData;

    const report = await prisma.report.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/reports");
    return {
      data: report,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Get report by ID
export const getReportByIdAction = async (
  id: string,
): Promise<ReportResult> => {
  try {
    const report = await prisma.report.findUnique({
      where: { id },
    });

    return {
      data: report,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Delete report
export const deleteReportAction = async (id: string): Promise<ReportResult> => {
  try {
    const report = await prisma.report.delete({
      where: { id },
    });

    revalidatePath("/reports");
    return {
      data: report,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Generate sales report
export const generateSalesReportAction = async (
  startDate: Date,
  endDate: Date,
): Promise<{ data: SalesReportData | null; errorMessage: string | null }> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const sales = await prisma.sale.findMany({
      where: {
        businessId,
        saleDate: {
          gte: startDate,
          lte: endDate,
        },
        status: { in: ["COMPLETED", "DELIVERED"] },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const totalSales = sales.reduce(
      (sum, sale) => sum + sale.totalAmount.toNumber(),
      0,
    );
    const totalQuantity = sales.reduce(
      (sum, sale) =>
        sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0,
    );
    const totalOrders = sales.length;
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    // Top products
    const productSales = new Map();
    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        const existing = productSales.get(item.productId) || {
          productId: item.productId,
          productName: item.product.name,
          quantitySold: 0,
          totalRevenue: 0,
        };
        existing.quantitySold += item.quantity;
        existing.totalRevenue += item.totalPrice.toNumber();
        productSales.set(item.productId, existing);
      });
    });

    const topProducts = Array.from(productSales.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    // Sales by date
    const salesByDate = new Map();
    sales.forEach((sale) => {
      const dateKey = sale.saleDate.toISOString().split("T")[0];
      const existing = salesByDate.get(dateKey) || {
        date: dateKey,
        sales: 0,
        orders: 0,
      };
      existing.sales += sale.totalAmount.toNumber();
      existing.orders += 1;
      salesByDate.set(dateKey, existing);
    });

    const reportData: SalesReportData = {
      totalSales,
      totalQuantity,
      totalOrders,
      averageOrderValue,
      topProducts,
      salesByDate: Array.from(salesByDate.values()).sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    };

    return {
      data: reportData,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Generate purchase report
export const generatePurchaseReportAction = async (
  startDate: Date,
  endDate: Date,
): Promise<{
  data: PurchaseReportData | null;
  errorMessage: string | null;
}> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const purchases = await prisma.purchase.findMany({
      where: {
        businessId,
        purchaseDate: {
          gte: startDate,
          lte: endDate,
        },
        status: { in: ["RECEIVED", "COMPLETED"] },
      },
      include: {
        items: true,
        party: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const totalPurchases = purchases.reduce(
      (sum, purchase) => sum + purchase.totalAmount.toNumber(),
      0,
    );
    const totalQuantity = purchases.reduce(
      (sum, purchase) =>
        sum +
        purchase.items.reduce(
          (itemSum, item) => itemSum + item.quantity.toNumber(),
          0,
        ),
      0,
    );
    const totalOrders = purchases.length;
    const averageOrderValue =
      totalOrders > 0 ? totalPurchases / totalOrders : 0;

    // Top suppliers
    const supplierPurchases = new Map();
    purchases.forEach((purchase) => {
      if (purchase.party) {
        const existing = supplierPurchases.get(purchase.partyId) || {
          supplierId: purchase.partyId,
          supplierName: purchase.party.name,
          totalPurchases: 0,
          orderCount: 0,
        };
        existing.totalPurchases += purchase.totalAmount.toNumber();
        existing.orderCount += 1;
        supplierPurchases.set(purchase.partyId, existing);
      }
    });

    const topSuppliers = Array.from(supplierPurchases.values())
      .sort((a, b) => b.totalPurchases - a.totalPurchases)
      .slice(0, 10);

    // Purchases by date
    const purchasesByDate = new Map();
    purchases.forEach((purchase) => {
      const dateKey = purchase.purchaseDate.toISOString().split("T")[0];
      const existing = purchasesByDate.get(dateKey) || {
        date: dateKey,
        purchases: 0,
        orders: 0,
      };
      existing.purchases += purchase.totalAmount.toNumber();
      existing.orders += 1;
      purchasesByDate.set(dateKey, existing);
    });

    const reportData: PurchaseReportData = {
      totalPurchases,
      totalQuantity,
      totalOrders,
      averageOrderValue,
      topSuppliers,
      purchasesByDate: Array.from(purchasesByDate.values()).sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    };

    return {
      data: reportData,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};

// Generate inventory report
export const generateInventoryReportAction = async (): Promise<{
  data: InventoryReportData | null;
  errorMessage: string | null;
}> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const inventory = await prisma.inventory.findMany({
      where: { businessId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sellingPrice: true,
            reorderLevel: true,
          },
        },
      },
    });

    const totalProducts = inventory.length;
    const totalValue = inventory.reduce(
      (sum, item) => sum + item.quantity * item.product.sellingPrice.toNumber(),
      0,
    );

    // Low stock products
    const lowStockProducts = inventory
      .filter(
        (item) =>
          item.product.reorderLevel &&
          item.quantity <= item.product.reorderLevel,
      )
      .map((item) => ({
        productId: item.productId,
        productName: item.product.name,
        currentStock: item.quantity,
        reorderLevel: item.product.reorderLevel || 0,
        value: item.quantity * item.product.sellingPrice.toNumber(),
      }))
      .sort((a, b) => b.value - a.value);

    // Top value products
    const topValueProducts = inventory
      .map((item) => ({
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity,
        value: item.quantity * item.product.sellingPrice.toNumber(),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const reportData: InventoryReportData = {
      totalProducts,
      totalValue,
      lowStockProducts,
      topValueProducts,
    };

    return {
      data: reportData,
      errorMessage: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: getErrorMessage(error),
    };
  }
};
