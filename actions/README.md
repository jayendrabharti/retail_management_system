# Server Actions Documentation

This directory contains all server actions for the Retail Management System. Each file provides specific functionality for different aspects of the business operations.

## 📁 File Structure Overview

```
actions/
├── accounting.ts          # Double-entry bookkeeping & financial accounts
├── accounts.ts           # Chart of accounts management
├── addresses.ts          # Address management for all entities
├── auth.ts              # Authentication & authorization
├── businesses.ts        # Business/company management
├── cashbook.ts         # Cash flow tracking & management
├── categories.ts       # Product category management
├── dashboard.ts        # Dashboard analytics & KPIs
├── drafts.ts          # Auto-save & draft management
├── expenses.ts        # Expense tracking & management
├── inventory.ts       # Stock level management
├── logs.ts           # Audit logs & activity tracking
├── notifications.ts  # System notifications & alerts
├── parties.ts       # Customer & supplier management
├── payment-terms.ts # Payment terms configuration
├── price-history.ts # Product price change tracking
├── products.ts     # Product catalog management
├── purchases.ts   # Purchase order management
├── quotations.ts  # Quote/estimate management
├── reports.ts    # Business intelligence & reporting
├── returns.ts   # Return/refund management
├── sales.ts    # Sales order management
├── staff.ts   # Employee management
├── stock-movements.ts # Inventory movement tracking
├── tax-discount.ts   # Tax rates & discount schemes
└── users.ts         # User profile management
```

## 🔐 Authentication & User Management

### `auth.ts`

Handles user authentication and session management.

**Key Functions:**

- User login/logout
- Session validation
- Permission checks

### `users.ts`

Manages user profiles and account settings.

**Key Functions:**

```typescript
getCurrentUserAction(): Promise<UserResult>
createUserAction(userData: CreateUserData): Promise<UserResult>
updateUserAction(userData: UpdateUserData): Promise<UserResult>
getUserByIdAction(id: string): Promise<UserResult>
getUsersByBusinessAction(businessId: string): Promise<UsersResult>
updateUserLastLoginAction(userId: string): Promise<UserResult>
toggleUserStatusAction(id: string): Promise<UserResult>
updatePremiumStatusAction(id: string, isPremium: boolean, premiumTier?: string, premiumExpiresAt?: Date): Promise<UserResult>
```

## 🏢 Business Management

### `businesses.ts`

Core business entity management and multi-tenancy support.

**Key Functions:**

- Business creation and configuration
- Business switching for multi-business users
- Business settings management

### `staff.ts`

Employee management and HR functions.

**Key Functions:**

```typescript
getStaffAction(): Promise<StaffsResult>
createStaffAction(staffData: CreateStaffData): Promise<StaffResult>
updateStaffAction(staffData: UpdateStaffData): Promise<StaffResult>
getStaffByIdAction(id: string): Promise<StaffResult>
terminateStaffAction(id: string, terminationDate: Date): Promise<StaffResult>
reactivateStaffAction(id: string): Promise<StaffResult>
getStaffByDepartmentAction(department: string): Promise<StaffsResult>
searchStaffAction(searchTerm: string): Promise<StaffsResult>
```

## 📦 Product & Inventory Management

### `products.ts`

Product catalog and product information management.

**Key Functions:**

- Product CRUD operations
- SKU and barcode management
- Product categorization
- Pricing management

### `categories.ts`

Product category hierarchy management.

**Key Functions:**

- Category creation and organization
- Hierarchical category structure
- Category-based product filtering

### `inventory.ts`

Stock level monitoring and inventory control.

**Key Functions:**

- Real-time inventory tracking
- Stock level alerts
- Inventory valuation

### `stock-movements.ts`

Detailed inventory movement tracking.

**Key Functions:**

```typescript
getStockMovementsAction(limit?: number, offset?: number, productId?: string, movementType?: MovementType, startDate?: Date, endDate?: Date): Promise<StockMovementsResult>
createStockMovementAction(movementData: CreateStockMovementData): Promise<StockMovementResult>
getStockMovementsByProductAction(productId: string): Promise<StockMovementsResult>
getStockSummaryAction(productId: string, startDate?: Date, endDate?: Date): Promise<StockSummaryResult>
bulkStockAdjustmentAction(adjustments: AdjustmentData[]): Promise<BulkStockResult>
```

### `price-history.ts`

Product pricing history and trend analysis.

**Key Functions:**

```typescript
getPriceHistoryAction(productId: string, limit?: number, offset?: number): Promise<PriceHistoriesResult>
createPriceHistoryAction(priceData: CreatePriceHistoryData): Promise<PriceHistoryResult>
updateProductPricesAction(priceChangeData: PriceChangeData): Promise<PriceHistoryUpdateResult>
getPriceTrendsAction(productId: string, startDate?: Date, endDate?: Date): Promise<PriceTrendsResult>
getAllPriceChangesAction(startDate?: Date, endDate?: Date, limit?: number, offset?: number): Promise<PriceHistoriesResult>
bulkPriceUpdateAction(updates: PriceUpdateData[], reason: string): Promise<BulkPriceResult>
```

## 🤝 Customer & Supplier Management

### `parties.ts`

Customer and supplier relationship management.

**Key Functions:**

- Contact information management
- Credit limits and payment terms
- Customer/supplier categorization

### `payment-terms.ts`

Payment terms and conditions configuration.

**Key Functions:**

```typescript
getPaymentTermsAction(): Promise<PaymentTermsResult>
createPaymentTermAction(paymentTermData: CreatePaymentTermData): Promise<PaymentTermResult>
updatePaymentTermAction(paymentTermData: UpdatePaymentTermData): Promise<PaymentTermResult>
getPaymentTermByIdAction(id: string): Promise<PaymentTermResult>
deletePaymentTermAction(id: string): Promise<PaymentTermResult>
togglePaymentTermStatusAction(id: string): Promise<PaymentTermResult>
```

### `addresses.ts`

Address management for all entities (customers, suppliers, staff, business).

**Key Functions:**

```typescript
getAddressesAction(entityType?: 'staff' | 'party' | 'business', entityId?: string, addressType?: AddressType): Promise<AddressesResult>
createAddressAction(addressData: CreateAddressData): Promise<AddressResult>
updateAddressAction(addressData: UpdateAddressData): Promise<AddressResult>
getAddressByIdAction(id: string): Promise<AddressResult>
deleteAddressAction(id: string): Promise<AddressResult>
setDefaultAddressAction(id: string): Promise<AddressResult>
```

## 💰 Sales Management

### `quotations.ts`

Quote and estimate management.

**Key Functions:**

- Quote creation and management
- Quote to order conversion
- Quote tracking and follow-up

### `sales.ts`

Sales order processing and management.

**Key Functions:**

- Sales order creation
- Order fulfillment tracking
- Payment processing
- Invoice generation

### `returns.ts`

Product return and refund management.

**Key Functions:**

```typescript
getReturnsAction(limit?: number, offset?: number, status?: ReturnStatus, startDate?: Date, endDate?: Date): Promise<ReturnsResult>
createReturnAction(returnData: CreateReturnData): Promise<ReturnResult>
updateReturnAction(returnData: UpdateReturnData): Promise<ReturnResult>
getReturnByIdAction(id: string): Promise<ReturnResult>
approveReturnAction(id: string): Promise<ReturnResult>
rejectReturnAction(id: string): Promise<ReturnResult>
completeReturnAction(id: string): Promise<ReturnResult>
getReturnsBySaleAction(saleId: string): Promise<ReturnsResult>
```

## 🛒 Purchase Management

### `purchases.ts`

Purchase order and procurement management.

**Key Functions:**

- Purchase order creation
- Supplier management
- Goods receipt processing
- Purchase analytics

## 💼 Financial Management

### `accounting.ts`

Double-entry bookkeeping and financial account management.

**Key Functions:**

```typescript
// Account Management
getAccountsAction(): Promise<AccountsResult>
createAccountAction(accountData: CreateAccountData): Promise<AccountResult>
updateAccountAction(accountData: UpdateAccountData): Promise<AccountResult>
getAccountByIdAction(id: string): Promise<AccountResult>
getAccountsByTypeAction(accountType: AccountType): Promise<AccountsResult>
deleteAccountAction(id: string): Promise<AccountResult>

// Transaction Management
getTransactionsAction(limit?: number, offset?: number, accountId?: string, transactionType?: TransactionType, startDate?: Date, endDate?: Date): Promise<TransactionsResult>
createTransactionAction(transactionData: CreateTransactionData): Promise<TransactionResult>
getTransactionByIdAction(id: string): Promise<TransactionResult>
getAccountBalanceAction(accountId: string): Promise<AccountBalanceResult>
```

### `cashbook.ts`

Cash flow tracking and management.

**Key Functions:**

```typescript
getCashbookEntriesAction(limit?: number, offset?: number, type?: CashflowType, category?: string, paymentMethod?: PaymentMethod, startDate?: Date, endDate?: Date): Promise<CashbookEntriesResult>
createCashbookEntryAction(entryData: CreateCashbookEntryData): Promise<CashbookEntryResult>
updateCashbookEntryAction(entryData: UpdateCashbookEntryData): Promise<CashbookEntryResult>
getCashbookEntryByIdAction(id: string): Promise<CashbookEntryResult>
deleteCashbookEntryAction(id: string): Promise<CashbookEntryResult>
getCashbookSummaryAction(startDate?: Date, endDate?: Date): Promise<CashbookSummaryResult>
```

### `expenses.ts`

Business expense tracking and management.

**Key Functions:**

- Expense categorization
- Receipt management
- Recurring expense tracking
- Expense reporting

### `tax-discount.ts`

Tax configuration and discount scheme management.

**Key Functions:**

```typescript
// Tax Rate Management
getTaxRatesAction(): Promise<TaxRatesResult>
createTaxRateAction(taxRateData: CreateTaxRateData): Promise<TaxRateResult>
updateTaxRateAction(taxRateData: UpdateTaxRateData): Promise<TaxRateResult>
deleteTaxRateAction(id: string): Promise<TaxRateResult>

// Discount Scheme Management
getDiscountSchemesAction(): Promise<DiscountSchemesResult>
getActiveDiscountSchemesAction(): Promise<DiscountSchemesResult>
createDiscountSchemeAction(discountSchemeData: CreateDiscountSchemeData): Promise<DiscountSchemeResult>
updateDiscountSchemeAction(discountSchemeData: UpdateDiscountSchemeData): Promise<DiscountSchemeResult>
deleteDiscountSchemeAction(id: string): Promise<DiscountSchemeResult>
calculateDiscountAction(orderAmount: number, quantity: number): Promise<DiscountCalculationResult>
```

## 📊 Analytics & Reporting

### `dashboard.ts`

Dashboard KPIs and summary analytics.

**Key Functions:**

- Revenue analytics
- Inventory summaries
- Key performance indicators
- Quick insights

### `reports.ts`

Comprehensive business intelligence and reporting.

**Key Functions:**

```typescript
getReportsAction(reportType?: ReportType, limit?: number, offset?: number): Promise<ReportsResult>
createReportAction(reportData: CreateReportData): Promise<ReportResult>
updateReportAction(reportData: UpdateReportData): Promise<ReportResult>
deleteReportAction(id: string): Promise<ReportResult>

// Specialized Reports
generateSalesReportAction(startDate: Date, endDate: Date): Promise<SalesReportResult>
generatePurchaseReportAction(startDate: Date, endDate: Date): Promise<PurchaseReportResult>
generateInventoryReportAction(): Promise<InventoryReportResult>
```

## 🔔 Notifications & Alerts

### `notifications.ts`

System notifications and automated alerts.

**Key Functions:**

```typescript
getNotificationsAction(limit?: number, type?: NotificationType, unreadOnly?: boolean): Promise<NotificationsResult>
getNotificationStatsAction(): Promise<NotificationStatsResult>
createNotificationAction(data: CreateNotificationData): Promise<NotificationResult>
markNotificationAsReadAction(notificationId: string): Promise<NotificationResult>
markAllNotificationsAsReadAction(): Promise<MarkAllReadResult>
deleteNotificationAction(notificationId: string): Promise<DeleteResult>

// Automated Notifications
createInventoryNotificationsAction(): Promise<NotificationsResult>
createPaymentReminderNotificationsAction(): Promise<NotificationsResult>
createExpenseReminderNotificationsAction(): Promise<NotificationsResult>
createSaleMilestoneNotificationsAction(): Promise<NotificationsResult>
```

## 🔍 System Management

### `logs.ts`

Audit logging and activity tracking.

**Key Functions:**

```typescript
// Audit Log Management
getAuditLogsAction(tableName?: string, recordId?: string, userId?: string, action?: string, startDate?: Date, endDate?: Date, limit?: number, offset?: number): Promise<AuditLogsResult>
createAuditLogAction(auditData: CreateAuditLogData): Promise<AuditLogResult>
getRecordAuditLogsAction(tableName: string, recordId: string): Promise<AuditLogsResult>
getUserAuditLogsAction(userId: string, limit?: number, offset?: number): Promise<AuditLogsResult>

// Business Log Management
getBusinessLogsAction(action?: string, tableName?: string, userId?: string, startDate?: Date, endDate?: Date, limit?: number, offset?: number): Promise<BusinessLogsResult>
createBusinessLogAction(logData: CreateBusinessLogData): Promise<BusinessLogResult>
logUserActionAction(action: string, note?: string, tableName?: string, recordId?: string, oldValues?: any, newValues?: any, request?: Request): Promise<BusinessLogResult>
getRecentActivityAction(limit?: number): Promise<BusinessLogsResult>
getActivitySummaryAction(startDate?: Date, endDate?: Date): Promise<ActivitySummaryResult>
```

### `drafts.ts`

Auto-save functionality and draft management.

**Key Functions:**

```typescript
getDraftsAction(type?: string, limit?: number, offset?: number): Promise<DraftsResult>
createDraftAction(draftData: CreateDraftData): Promise<DraftResult>
updateDraftAction(draftData: UpdateDraftData): Promise<DraftResult>
getDraftByIdAction(id: string): Promise<DraftResult>
deleteDraftAction(id: string): Promise<DraftResult>

// Specialized Draft Operations
saveSaleDraftAction(saleData: any): Promise<DraftResult>
savePurchaseDraftAction(purchaseData: any): Promise<DraftResult>
saveQuotationDraftAction(quotationData: any): Promise<DraftResult>
autoSaveDraftAction(type: string, data: any, tempId?: string): Promise<DraftResult>
cleanExpiredDraftsAction(): Promise<CleanupResult>
```

## 🔧 Common Patterns & Best Practices

### Error Handling

All server actions follow a consistent error handling pattern:

```typescript
export const exampleAction = async (
  data: ExampleData,
): Promise<ExampleResult> => {
  try {
    // Business logic here
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
```

### Business Context

Most actions automatically get the current business context:

```typescript
const businessId = await getCurrentBusinessId();
if (!businessId) {
  throw new Error("No business selected");
}
```

### Cache Revalidation

Actions that modify data include cache revalidation:

```typescript
revalidatePath("/relevant-page");
revalidatePath("/dashboard"); // For actions affecting dashboard
```

### Transaction Safety

Critical operations use database transactions:

```typescript
const result = await prisma.$transaction(async (tx) => {
  // Multiple related operations
  const record1 = await tx.model1.create({...});
  const record2 = await tx.model2.update({...});
  return { record1, record2 };
});
```

## 📋 Type Definitions

### Common Result Types

```typescript
interface BaseResult<T> {
  data: T | null;
  errorMessage: string | null;
}

interface ListResult<T> {
  data: T[] | null;
  errorMessage: string | null;
}

interface CountResult {
  count: number;
  errorMessage: string | null;
}

interface SuccessResult {
  success: boolean;
  errorMessage: string | null;
}
```

### Pagination Parameters

```typescript
interface PaginationParams {
  limit?: number;
  offset?: number;
}

interface DateRangeParams {
  startDate?: Date;
  endDate?: Date;
}
```

## 🚀 Usage Examples

### Creating a Product

```typescript
import { createProductAction } from "@/actions/products";

const result = await createProductAction({
  name: "Sample Product",
  sku: "SP001",
  categoryId: "cat123",
  costPrice: 100,
  sellingPrice: 150,
  taxRate: 18,
  discountRate: 0,
});

if (result.errorMessage) {
  console.error("Error:", result.errorMessage);
} else {
  console.log("Product created:", result.data);
}
```

### Recording a Sale

```typescript
import { createSaleAction } from "@/actions/sales";

const saleData = {
  partyId: "customer123",
  items: [
    {
      productId: "prod123",
      quantity: 2,
      unitPrice: 150,
      totalPrice: 300,
    },
  ],
  paymentMethod: "CASH",
};

const result = await createSaleAction(saleData);
```

### Generating Reports

```typescript
import { generateSalesReportAction } from "@/actions/reports";

const startDate = new Date("2024-01-01");
const endDate = new Date("2024-12-31");

const reportResult = await generateSalesReportAction(startDate, endDate);
```

## 🔒 Security Considerations

1. **Business Isolation**: All actions verify business context
2. **User Authentication**: Actions check user permissions
3. **Data Validation**: Input validation on all create/update operations
4. **Audit Trail**: All significant actions are logged
5. **Transaction Safety**: Critical operations use database transactions

## 📚 Additional Resources

- [Prisma Schema Documentation](../prisma/schema.prisma)
- [Next.js Server Actions Guide](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions)
- [TypeScript Best Practices](https://typescript-eslint.io/docs/)

---

_Last Updated: July 16, 2025_
