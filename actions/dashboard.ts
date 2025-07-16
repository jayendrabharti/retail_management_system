"use server";

import prisma from "@/prisma/client";
import { SaleStatus, PurchaseStatus } from "@prisma/client";
import { getErrorMessage } from "@/utils/utils";
import { getCurrentBusinessId } from "./businesses";

// Get dashboard overview data
export const getDashboardOverviewAction = async (
  dateFrom?: Date,
  dateTo?: Date,
) => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    // Default to current month if no dates provided
    if (!dateFrom && !dateTo) {
      const now = new Date();
      dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
      dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    const whereClause: any = { businessId };
    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) whereClause.createdAt.gte = dateFrom;
      if (dateTo) whereClause.createdAt.lte = dateTo;
    }

    const [
      // Sales data
      salesStats,
      totalSalesAmount,
      recentSales,

      // Purchase data
      purchaseStats,
      totalPurchaseAmount,
      recentPurchases,

      // Inventory data
      totalProducts,
      lowStockProducts,
      outOfStockProducts,

      // Party data
      totalCustomers,
      totalSuppliers,

      // Financial data
      totalExpenses,
      pendingReceivables,
      pendingPayables,

      // Recent activities
      recentQuotations,
    ] = await Promise.all([
      // Sales statistics
      prisma.sale.aggregate({
        where: {
          businessId,
          status: { not: SaleStatus.CANCELLED },
          ...(dateFrom && { saleDate: { gte: dateFrom } }),
          ...(dateTo && { saleDate: { lte: dateTo } }),
        },
        _count: { id: true },
        _sum: { totalAmount: true, paidAmount: true, balanceAmount: true },
      }),

      // Total sales amount (all time)
      prisma.sale.aggregate({
        where: {
          businessId,
          status: { not: SaleStatus.CANCELLED },
        },
        _sum: { totalAmount: true },
      }),

      // Recent sales
      prisma.sale.findMany({
        where: { businessId },
        include: {
          party: { select: { name: true } },
          items: { include: { product: { select: { name: true } } } },
        },
        orderBy: { saleDate: "desc" },
        take: 5,
      }),

      // Purchase statistics
      prisma.purchase.aggregate({
        where: {
          businessId,
          status: { not: PurchaseStatus.CANCELLED },
          ...(dateFrom && { purchaseDate: { gte: dateFrom } }),
          ...(dateTo && { purchaseDate: { lte: dateTo } }),
        },
        _count: { id: true },
        _sum: { totalAmount: true, paidAmount: true, balanceAmount: true },
      }),

      // Total purchase amount (all time)
      prisma.purchase.aggregate({
        where: {
          businessId,
          status: { not: PurchaseStatus.CANCELLED },
        },
        _sum: { totalAmount: true },
      }),

      // Recent purchases
      prisma.purchase.findMany({
        where: { businessId },
        include: {
          party: { select: { name: true } },
          items: { include: { product: { select: { name: true } } } },
        },
        orderBy: { purchaseDate: "desc" },
        take: 5,
      }),

      // Product counts
      prisma.product.count({
        where: { businessId, isActive: true },
      }),

      // Low stock products
      prisma.inventory.count({
        where: {
          businessId,
          product: {
            isActive: true,
            trackInventory: true,
            minStockLevel: { not: null },
          },
        },
      }),

      // Out of stock products
      prisma.inventory.count({
        where: {
          businessId,
          availableQty: { lte: 0 },
          product: {
            isActive: true,
            trackInventory: true,
          },
        },
      }),

      // Customer count
      prisma.party.count({
        where: {
          businessId,
          type: { in: ["CUSTOMER", "BOTH"] },
          isActive: true,
        },
      }),

      // Supplier count
      prisma.party.count({
        where: {
          businessId,
          type: { in: ["SUPPLIER", "BOTH"] },
          isActive: true,
        },
      }),

      // Total expenses
      prisma.expense.aggregate({
        where: {
          businessId,
          ...(dateFrom && { date: { gte: dateFrom } }),
          ...(dateTo && { date: { lte: dateTo } }),
        },
        _sum: { amount: true },
      }),

      // Pending receivables
      prisma.party.aggregate({
        where: {
          businessId,
          type: { in: ["CUSTOMER", "BOTH"] },
          balance: { gt: 0 },
          isActive: true,
        },
        _sum: { balance: true },
      }),

      // Pending payables
      prisma.party.aggregate({
        where: {
          businessId,
          type: { in: ["SUPPLIER", "BOTH"] },
          balance: { gt: 0 },
          isActive: true,
        },
        _sum: { balance: true },
      }),

      // Recent quotations
      prisma.quotation.findMany({
        where: { businessId },
        include: {
          party: { select: { name: true } },
        },
        orderBy: { quotationDate: "desc" },
        take: 5,
      }),
    ]);

    // Calculate profit (sales - purchases - expenses)
    const totalSales = totalSalesAmount._sum.totalAmount?.toNumber() || 0;
    const totalPurchases =
      totalPurchaseAmount._sum.totalAmount?.toNumber() || 0;
    const totalExpenseAmount = totalExpenses._sum.amount?.toNumber() || 0;
    const grossProfit = totalSales - totalPurchases;
    const netProfit = grossProfit - totalExpenseAmount;

    // Get low stock items for alerts
    const lowStockItems = await prisma.inventory.findMany({
      where: {
        businessId,
        product: {
          isActive: true,
          trackInventory: true,
          minStockLevel: { not: null },
        },
      },
      include: {
        product: {
          select: {
            name: true,
            minStockLevel: true,
          },
        },
      },
      take: 10,
    });

    const actualLowStockItems = lowStockItems.filter(
      (item) =>
        item.product.minStockLevel &&
        item.availableQty <= item.product.minStockLevel,
    );

    return {
      data: {
        // Financial overview
        financial: {
          totalSales,
          totalPurchases,
          totalExpenses: totalExpenseAmount,
          grossProfit,
          netProfit,
          profitMargin: totalSales > 0 ? (netProfit / totalSales) * 100 : 0,
        },

        // Period statistics (for the specified date range)
        period: {
          sales: {
            count: salesStats._count.id || 0,
            amount: salesStats._sum.totalAmount?.toNumber() || 0,
            paid: salesStats._sum.paidAmount?.toNumber() || 0,
            pending: salesStats._sum.balanceAmount?.toNumber() || 0,
          },
          purchases: {
            count: purchaseStats._count.id || 0,
            amount: purchaseStats._sum.totalAmount?.toNumber() || 0,
            paid: purchaseStats._sum.paidAmount?.toNumber() || 0,
            pending: purchaseStats._sum.balanceAmount?.toNumber() || 0,
          },
          expenses: {
            amount: totalExpenseAmount,
          },
        },

        // Inventory overview
        inventory: {
          totalProducts,
          lowStockCount: actualLowStockItems.length,
          outOfStockCount: outOfStockProducts,
          lowStockItems: actualLowStockItems.map((item) => ({
            productName: item.product.name,
            currentStock: item.availableQty,
            minStock: item.product.minStockLevel,
          })),
        },

        // Party overview
        parties: {
          totalCustomers,
          totalSuppliers,
          pendingReceivables: pendingReceivables._sum.balance?.toNumber() || 0,
          pendingPayables: pendingPayables._sum.balance?.toNumber() || 0,
        },

        // Recent activities
        recent: {
          sales: recentSales.map((sale) => ({
            id: sale.id,
            saleNumber: sale.saleNumber,
            partyName: sale.party?.name || "Walk-in Customer",
            amount: sale.totalAmount.toNumber(),
            status: sale.status,
            date: sale.saleDate,
            itemCount: sale.items.length,
          })),
          purchases: recentPurchases.map((purchase) => ({
            id: purchase.id,
            purchaseNumber: purchase.purchaseNumber,
            partyName: purchase.party?.name || "Vendor",
            amount: purchase.totalAmount.toNumber(),
            status: purchase.status,
            date: purchase.purchaseDate,
            itemCount: purchase.items.length,
          })),
          quotations: recentQuotations.map((quotation) => ({
            id: quotation.id,
            quotationNumber: quotation.quotationNumber,
            partyName: quotation.party?.name || "Customer",
            amount: quotation.totalAmount.toNumber(),
            status: quotation.status,
            date: quotation.quotationDate,
          })),
        },
      },
      errorMessage: null,
    };
  } catch (error) {
    console.error("Error fetching dashboard overview:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Get sales chart data for dashboard
export const getSalesChartDataAction = async (days: number = 30) => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sales = await prisma.sale.findMany({
      where: {
        businessId,
        status: { not: SaleStatus.CANCELLED },
        saleDate: { gte: startDate },
      },
      select: {
        saleDate: true,
        totalAmount: true,
        status: true,
      },
    });

    // Group by date
    const chartData = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const dateStr = date.toISOString().split("T")[0];

      const daySales = sales.filter(
        (sale) => sale.saleDate.toISOString().split("T")[0] === dateStr,
      );

      const totalAmount = daySales.reduce(
        (sum, sale) => sum + sale.totalAmount.toNumber(),
        0,
      );

      chartData.push({
        date: dateStr,
        amount: totalAmount,
        count: daySales.length,
      });
    }

    return { data: chartData, errorMessage: null };
  } catch (error) {
    console.error("Error fetching sales chart data:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Get top products by sales
export const getTopProductsAction = async (
  limit: number = 10,
  days?: number,
) => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const whereClause: any = {
      sale: {
        businessId,
        status: { not: SaleStatus.CANCELLED },
      },
    };

    if (days) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      whereClause.sale.saleDate = { gte: startDate };
    }

    const topProducts = await prisma.saleItem.groupBy({
      by: ["productId"],
      where: whereClause,
      _sum: {
        quantity: true,
        totalPrice: true,
      },
      _count: {
        productId: true,
      },
      orderBy: {
        _sum: {
          totalPrice: "desc",
        },
      },
      take: limit,
    });

    // Get product details
    const productIds = topProducts.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        sellingPrice: true,
        category: {
          select: { name: true },
        },
      },
    });

    const result = topProducts.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      return {
        productId: item.productId,
        productName: product?.name || "Unknown Product",
        sku: product?.sku || "",
        categoryName: product?.category.name || "",
        quantitySold: item._sum.quantity || 0,
        totalRevenue: item._sum.totalPrice?.toNumber() || 0,
        salesCount: item._count.productId || 0,
        averagePrice: item._sum.quantity
          ? (item._sum.totalPrice?.toNumber() || 0) / (item._sum.quantity || 1)
          : 0,
      };
    });

    return { data: result, errorMessage: null };
  } catch (error) {
    console.error("Error fetching top products:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Get business performance metrics
export const getBusinessMetricsAction = async (
  currentPeriod: { from: Date; to: Date },
  previousPeriod: { from: Date; to: Date },
) => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const [currentMetrics, previousMetrics] = await Promise.all([
      // Current period metrics
      Promise.all([
        prisma.sale.aggregate({
          where: {
            businessId,
            status: { not: SaleStatus.CANCELLED },
            saleDate: { gte: currentPeriod.from, lte: currentPeriod.to },
          },
          _sum: { totalAmount: true },
          _count: { id: true },
        }),
        prisma.purchase.aggregate({
          where: {
            businessId,
            status: { not: PurchaseStatus.CANCELLED },
            purchaseDate: { gte: currentPeriod.from, lte: currentPeriod.to },
          },
          _sum: { totalAmount: true },
        }),
        prisma.expense.aggregate({
          where: {
            businessId,
            date: { gte: currentPeriod.from, lte: currentPeriod.to },
          },
          _sum: { amount: true },
        }),
      ]),

      // Previous period metrics
      Promise.all([
        prisma.sale.aggregate({
          where: {
            businessId,
            status: { not: SaleStatus.CANCELLED },
            saleDate: { gte: previousPeriod.from, lte: previousPeriod.to },
          },
          _sum: { totalAmount: true },
          _count: { id: true },
        }),
        prisma.purchase.aggregate({
          where: {
            businessId,
            status: { not: PurchaseStatus.CANCELLED },
            purchaseDate: { gte: previousPeriod.from, lte: previousPeriod.to },
          },
          _sum: { totalAmount: true },
        }),
        prisma.expense.aggregate({
          where: {
            businessId,
            date: { gte: previousPeriod.from, lte: previousPeriod.to },
          },
          _sum: { amount: true },
        }),
      ]),
    ]);

    const [currentSales, currentPurchases, currentExpenses] = currentMetrics;
    const [previousSales, previousPurchases, previousExpenses] =
      previousMetrics;

    const currentRevenue = currentSales._sum.totalAmount?.toNumber() || 0;
    const previousRevenue = previousSales._sum.totalAmount?.toNumber() || 0;

    const currentCosts =
      (currentPurchases._sum.totalAmount?.toNumber() || 0) +
      (currentExpenses._sum.amount?.toNumber() || 0);
    const previousCosts =
      (previousPurchases._sum.totalAmount?.toNumber() || 0) +
      (previousExpenses._sum.amount?.toNumber() || 0);

    const currentProfit = currentRevenue - currentCosts;
    const previousProfit = previousRevenue - previousCosts;

    // Calculate growth percentages
    const revenueGrowth =
      previousRevenue > 0
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
        : 0;
    const profitGrowth =
      previousProfit > 0
        ? ((currentProfit - previousProfit) / previousProfit) * 100
        : 0;
    const salesCountGrowth =
      previousSales._count.id > 0
        ? ((currentSales._count.id - previousSales._count.id) /
            previousSales._count.id) *
          100
        : 0;

    return {
      data: {
        current: {
          revenue: currentRevenue,
          costs: currentCosts,
          profit: currentProfit,
          profitMargin:
            currentRevenue > 0 ? (currentProfit / currentRevenue) * 100 : 0,
          salesCount: currentSales._count.id,
          averageOrderValue:
            currentSales._count.id > 0
              ? currentRevenue / currentSales._count.id
              : 0,
        },
        previous: {
          revenue: previousRevenue,
          costs: previousCosts,
          profit: previousProfit,
          profitMargin:
            previousRevenue > 0 ? (previousProfit / previousRevenue) * 100 : 0,
          salesCount: previousSales._count.id,
          averageOrderValue:
            previousSales._count.id > 0
              ? previousRevenue / previousSales._count.id
              : 0,
        },
        growth: {
          revenue: revenueGrowth,
          profit: profitGrowth,
          salesCount: salesCountGrowth,
        },
      },
      errorMessage: null,
    };
  } catch (error) {
    console.error("Error fetching business metrics:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};
