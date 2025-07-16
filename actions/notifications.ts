"use server";

import prisma from "@/prisma/client";
import { Notification, NotificationType, Priority } from "@prisma/client";
import { createSupabaseClient } from "@/supabase/server";
import { getErrorMessage } from "@/utils/utils";
import { revalidatePath } from "next/cache";
import { getCurrentBusinessId } from "./businesses";

// Types
interface CreateNotificationData {
  title: string;
  message: string;
  type: NotificationType;
  priority: Priority;
  data?: any;
}

interface NotificationResult {
  data: Notification | null;
  errorMessage: string | null;
}

interface NotificationsResult {
  data: Notification[] | null;
  errorMessage: string | null;
}

interface NotificationStatsResult {
  data: {
    total: number;
    unread: number;
    byType: Record<NotificationType, number>;
    byPriority: Record<Priority, number>;
  } | null;
  errorMessage: string | null;
}

// Get notifications for current business
export const getNotificationsAction = async (
  limit: number = 50,
  type?: NotificationType,
  unreadOnly: boolean = false,
): Promise<NotificationsResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const whereClause: any = {
      businessId,
    };

    if (type) {
      whereClause.type = type;
    }

    if (unreadOnly) {
      whereClause.isRead = false;
    }

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: limit,
    });

    return { data: notifications, errorMessage: null };
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Get notification stats
export const getNotificationStatsAction =
  async (): Promise<NotificationStatsResult> => {
    try {
      const businessId = await getCurrentBusinessId();
      if (!businessId) {
        throw new Error("No business selected");
      }

      const whereClause = {
        businessId,
      };

      // Get total count
      const total = await prisma.notification.count({
        where: whereClause,
      });

      // Get unread count
      const unread = await prisma.notification.count({
        where: {
          ...whereClause,
          isRead: false,
        },
      });

      // Get counts by type
      const typeStats = await prisma.notification.groupBy({
        by: ["type"],
        where: whereClause,
        _count: {
          id: true,
        },
      });

      // Get counts by priority
      const priorityStats = await prisma.notification.groupBy({
        by: ["priority"],
        where: whereClause,
        _count: {
          id: true,
        },
      });

      const byType: Record<NotificationType, number> = {
        LOW_STOCK: 0,
        PAYMENT_DUE: 0,
        EXPENSE_REMINDER: 0,
        SYSTEM_ALERT: 0,
        SALE_MILESTONE: 0,
        INVENTORY_ALERT: 0,
      };

      const byPriority: Record<Priority, number> = {
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0,
      };

      typeStats.forEach((stat) => {
        byType[stat.type] = stat._count.id;
      });

      priorityStats.forEach((stat) => {
        byPriority[stat.priority] = stat._count.id;
      });

      return {
        data: {
          total,
          unread,
          byType,
          byPriority,
        },
        errorMessage: null,
      };
    } catch (error) {
      console.error("Error fetching notification stats:", error);
      return { data: null, errorMessage: getErrorMessage(error) };
    }
  };

// Create notification
export const createNotificationAction = async (
  data: CreateNotificationData,
): Promise<NotificationResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const notification = await prisma.notification.create({
      data: {
        title: data.title,
        message: data.message,
        type: data.type,
        priority: data.priority,
        data: data.data,
        businessId,
      },
    });

    revalidatePath("/notifications");
    revalidatePath("/dashboard");

    return { data: notification, errorMessage: null };
  } catch (error) {
    console.error("Error creating notification:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Mark notification as read
export const markNotificationAsReadAction = async (
  notificationId: string,
): Promise<NotificationResult> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    // Verify notification belongs to business
    const existingNotification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        businessId,
      },
    });

    if (!existingNotification) {
      throw new Error("Notification not found");
    }

    const notification = await prisma.notification.update({
      where: {
        id: notificationId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    revalidatePath("/notifications");

    return { data: notification, errorMessage: null };
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Mark all notifications as read
export const markAllNotificationsAsReadAction = async (): Promise<{
  count: number;
  errorMessage: string | null;
}> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const result = await prisma.notification.updateMany({
      where: {
        businessId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    revalidatePath("/notifications");

    return { count: result.count, errorMessage: null };
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return { count: 0, errorMessage: getErrorMessage(error) };
  }
};

// Delete notification
export const deleteNotificationAction = async (
  notificationId: string,
): Promise<{ success: boolean; errorMessage: string | null }> => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    // Verify notification belongs to business
    const existingNotification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        businessId,
      },
    });

    if (!existingNotification) {
      throw new Error("Notification not found");
    }

    await prisma.notification.delete({
      where: {
        id: notificationId,
      },
    });

    revalidatePath("/notifications");

    return { success: true, errorMessage: null };
  } catch (error) {
    console.error("Error deleting notification:", error);
    return { success: false, errorMessage: getErrorMessage(error) };
  }
};

// Create inventory notifications (low stock, out of stock)
export const createInventoryNotificationsAction = async () => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    // Get products with low or zero stock
    const allInventory = await prisma.inventory.findMany({
      where: {
        businessId,
        product: {
          trackInventory: true,
        },
      },
      include: {
        product: true,
      },
    });

    // Filter for low stock and out of stock products
    const lowStockProducts = allInventory.filter((inventory) => {
      const isOutOfStock = inventory.quantity <= 0;
      const isLowStock =
        inventory.product.reorderLevel &&
        inventory.quantity <= inventory.product.reorderLevel;
      return isOutOfStock || isLowStock;
    });

    const notifications = [];

    for (const inventory of lowStockProducts) {
      const isOutOfStock = inventory.quantity === 0;
      const title = isOutOfStock ? "Product Out of Stock" : "Low Stock Alert";
      const message = isOutOfStock
        ? `${inventory.product.name} is out of stock`
        : `${inventory.product.name} is running low (${inventory.quantity} units remaining)`;

      const notification = await prisma.notification.create({
        data: {
          title,
          message,
          type: isOutOfStock
            ? NotificationType.INVENTORY_ALERT
            : NotificationType.LOW_STOCK,
          priority: isOutOfStock ? Priority.HIGH : Priority.MEDIUM,
          businessId,
          data: {
            productId: inventory.productId,
            currentStock: inventory.quantity,
            reorderLevel: inventory.product.reorderLevel,
          },
        },
      });

      notifications.push(notification);
    }

    if (notifications.length > 0) {
      revalidatePath("/notifications");
      revalidatePath("/dashboard");
    }

    return {
      data: notifications,
      errorMessage: null,
    };
  } catch (error) {
    console.error("Error creating inventory notifications:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Create payment reminder notifications
export const createPaymentReminderNotificationsAction = async () => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const now = new Date();
    const reminderDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    // Get unpaid sales with due dates approaching
    const upcomingSales = await prisma.sale.findMany({
      where: {
        businessId,
        status: "PENDING",
        dueDate: {
          lte: reminderDate,
          gte: now,
        },
      },
      include: {
        party: true,
      },
    });

    // Get overdue sales
    const overdueSales = await prisma.sale.findMany({
      where: {
        businessId,
        status: "PENDING",
        dueDate: {
          lt: now,
        },
      },
      include: {
        party: true,
      },
    });

    const notifications = [];

    // Create notifications for upcoming due dates
    for (const sale of upcomingSales) {
      const daysUntilDue = Math.ceil(
        (sale.dueDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      const partyName = sale.party?.name || "Unknown Customer";

      const notification = await prisma.notification.create({
        data: {
          title: "Payment Due Soon",
          message: `Payment for sale #${sale.saleNumber} to ${partyName} is due in ${daysUntilDue} day(s)`,
          type: NotificationType.PAYMENT_DUE,
          priority: Priority.MEDIUM,
          businessId,
          data: {
            saleId: sale.id,
            partyId: sale.partyId,
            amount: sale.totalAmount,
            dueDate: sale.dueDate,
          },
        },
      });

      notifications.push(notification);
    }

    // Create notifications for overdue payments
    for (const sale of overdueSales) {
      const daysOverdue = Math.ceil(
        (now.getTime() - sale.dueDate!.getTime()) / (1000 * 60 * 60 * 24),
      );

      const partyName = sale.party?.name || "Unknown Customer";

      const notification = await prisma.notification.create({
        data: {
          title: "Overdue Payment",
          message: `Payment for sale #${sale.saleNumber} to ${partyName} is ${daysOverdue} day(s) overdue`,
          type: NotificationType.PAYMENT_DUE,
          priority: Priority.HIGH,
          businessId,
          data: {
            saleId: sale.id,
            partyId: sale.partyId,
            amount: sale.totalAmount,
            dueDate: sale.dueDate,
            daysOverdue,
          },
        },
      });

      notifications.push(notification);
    }

    if (notifications.length > 0) {
      revalidatePath("/notifications");
      revalidatePath("/dashboard");
    }

    return {
      data: notifications,
      errorMessage: null,
    };
  } catch (error) {
    console.error("Error creating payment reminder notifications:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Create expense reminder notifications
export const createExpenseReminderNotificationsAction = async () => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    // Get recurring expenses that need reminders
    const recurringExpenses = await prisma.expense.findMany({
      where: {
        businessId,
        isRecurring: true,
      },
    });

    const notifications = [];
    const now = new Date();

    for (const expense of recurringExpenses) {
      // Simple logic - if expense was created more than 30 days ago, create reminder
      const daysSinceCreated = Math.ceil(
        (now.getTime() - expense.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysSinceCreated >= 30) {
        const notification = await prisma.notification.create({
          data: {
            title: "Recurring Expense Reminder",
            message: `Reminder: ${expense.description} (${expense.category}) - ₹${expense.amount}`,
            type: NotificationType.EXPENSE_REMINDER,
            priority: Priority.MEDIUM,
            businessId,
            data: {
              expenseId: expense.id,
              category: expense.category,
              amount: expense.amount,
            },
          },
        });

        notifications.push(notification);
      }
    }

    if (notifications.length > 0) {
      revalidatePath("/notifications");
      revalidatePath("/dashboard");
    }

    return {
      data: notifications,
      errorMessage: null,
    };
  } catch (error) {
    console.error("Error creating expense reminder notifications:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};

// Create sale milestone notifications
export const createSaleMilestoneNotificationsAction = async () => {
  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      throw new Error("No business selected");
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get total sales for current month
    const monthlySales = await prisma.sale.aggregate({
      where: {
        businessId,
        saleDate: {
          gte: startOfMonth,
        },
        status: "COMPLETED",
      },
      _sum: {
        totalAmount: true,
      },
    });

    const totalSales = monthlySales._sum.totalAmount?.toNumber() || 0;

    // Create milestone notifications based on sales amount
    const milestones = [
      {
        amount: 100000,
        message: "Congratulations! You've reached ₹1 Lakh in sales this month!",
      },
      {
        amount: 500000,
        message: "Amazing! You've crossed ₹5 Lakh in monthly sales!",
      },
      {
        amount: 1000000,
        message: "Outstanding! You've achieved ₹10 Lakh in sales this month!",
      },
    ];

    const notifications = [];

    for (const milestone of milestones) {
      if (totalSales >= milestone.amount) {
        // Check if we've already created this milestone notification this month
        const existingNotification = await prisma.notification.findFirst({
          where: {
            businessId,
            type: NotificationType.SALE_MILESTONE,
            createdAt: {
              gte: startOfMonth,
            },
            data: {
              path: ["milestone"],
              equals: milestone.amount,
            },
          },
        });

        if (!existingNotification) {
          const notification = await prisma.notification.create({
            data: {
              title: "Sales Milestone Achieved!",
              message: milestone.message,
              type: NotificationType.SALE_MILESTONE,
              priority: Priority.HIGH,
              businessId,
              data: {
                milestone: milestone.amount,
                actualSales: totalSales,
                month: now.getMonth() + 1,
                year: now.getFullYear(),
              },
            },
          });

          notifications.push(notification);
        }
      }
    }

    if (notifications.length > 0) {
      revalidatePath("/notifications");
      revalidatePath("/dashboard");
    }

    return {
      data: notifications,
      errorMessage: null,
    };
  } catch (error) {
    console.error("Error creating sale milestone notifications:", error);
    return { data: null, errorMessage: getErrorMessage(error) };
  }
};
