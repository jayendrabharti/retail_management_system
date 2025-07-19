# Retail Management System - Architecture Overview

## 🏗️ **System Architecture**

This is a modern **multi-tenant SaaS retail management system** built with Next.js 15 and designed for scalability, security, and performance.

### **Technology Stack**

#### **Frontend**

- **Next.js 15** - React framework with App Router
- **React 19** - Latest React with concurrent features
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Framer Motion** - Animation library
- **React Hook Form** - Form state management
- **Zod** - Schema validation

#### **Backend**

- **Next.js Server Actions** - Server-side logic
- **Prisma ORM** - Database toolkit
- **PostgreSQL** - Primary database
- **Supabase** - Authentication & file storage

#### **Authentication & Security**

- **Supabase Auth** - Phone/Email OTP authentication
- **HTTP-only cookies** - Secure session management
- **Middleware-based route protection**
- **Multi-tenant access control**

## 🔧 **Core Features**

### **1. Multi-Tenant Business Management**

- Independent business environments
- Business switching capability
- Isolated data per tenant
- Role-based access control

### **2. Authentication System**

- Phone/Email OTP verification
- Supabase Auth integration
- Session management with refresh
- Protected route middleware

### **3. Inventory Management**

- Product catalog with categories
- Stock tracking and movements
- Batch management
- Reorder level alerts
- Multi-unit support

### **4. Sales & Purchase Management**

- Invoice generation
- Quotation system
- Payment tracking
- Return management
- Status workflows

### **5. Financial Accounting**

- Double-entry bookkeeping
- Chart of accounts
- Transaction recording
- Financial reports
- Expense tracking

### **6. Customer & Supplier Management**

- Unified party system
- Contact management
- Credit management
- Transaction history

### **7. Analytics & Reporting**

- Dashboard with KPIs
- Sales analytics
- Inventory insights
- Financial reports
- Trend analysis

## 📁 **Project Structure**

```
retail_management_system/
├── app/                          # Next.js App Router
│   ├── (auth)/                  # Authentication routes
│   │   ├── login/
│   │   ├── signup/
│   │   ├── authorized/
│   │   └── unauthorized/
│   ├── (main)/                  # Main application routes
│   │   ├── dashboard/
│   │   ├── inventory/
│   │   ├── parties/
│   │   ├── analytics/
│   │   └── settings/
│   ├── (home)/                  # Public marketing pages
│   └── api/                     # API routes
├── actions/                      # Server Actions
│   ├── auth.ts                  # Authentication logic
│   ├── businesses.ts            # Business management
│   ├── products.ts              # Product operations
│   ├── sales.ts                 # Sales operations
│   ├── purchases.ts             # Purchase operations
│   ├── parties.ts               # Customer/Supplier management
│   ├── inventory.ts             # Inventory operations
│   ├── accounting.ts            # Financial operations
│   └── dashboard.ts             # Analytics & reporting
├── components/                   # React components
│   ├── ui/                      # Reusable UI components
│   ├── auth/                    # Authentication components
│   ├── dashboard/               # Dashboard components
│   └── inventory/               # Inventory components
├── providers/                    # React Context providers
│   ├── SessionProvider.tsx      # Authentication state
│   ├── BusinessProvider.tsx     # Multi-tenant context
│   ├── ThemeProvider.tsx        # Theme management
│   └── DataProvider.tsx         # UI state management
├── prisma/                       # Database schema & migrations
│   ├── schema.prisma            # Database schema
│   └── migrations/              # Database migrations
├── supabase/                     # Supabase configuration
│   ├── client.ts                # Client-side Supabase
│   ├── server.ts                # Server-side Supabase
│   └── admin.ts                 # Admin Supabase client
├── types/                        # TypeScript type definitions
├── utils/                        # Utility functions
└── middleware.ts                 # Route protection middleware
```

## 🗃️ **Database Design**

### **Core Entities**

#### **User Management**

- `User` - Core user profiles
- `BusinessUser` - Many-to-many relationship
- `AuditLog` - System activity tracking

#### **Business & Multi-tenancy**

- `Business` - Tenant isolation
- `Address` - Location management

#### **Product & Inventory**

- `Category` - Product categorization
- `Product` - Product catalog
- `Inventory` - Stock levels
- `StockMovement` - Inventory transactions
- `ProductBatch` - Batch tracking

#### **Sales & Purchases**

- `Sale` - Sales transactions
- `SaleItem` - Line items
- `Purchase` - Purchase transactions
- `PurchaseItem` - Line items
- `Return` - Return transactions

#### **Financial Management**

- `Account` - Chart of accounts
- `Transaction` - Double-entry transactions
- `Expense` - Expense tracking
- `CashbookEntry` - Cash flow management

#### **Customer & Supplier Management**

- `Party` - Unified customer/supplier entity
- `PaymentTerm` - Credit terms

### **Key Design Patterns**

#### **Multi-tenancy**

- Every business entity includes `businessId`
- Row-level security through business context
- Isolated data per tenant

#### **Audit Trail**

- Comprehensive activity logging
- Change tracking for compliance
- User action attribution

#### **Double-entry Bookkeeping**

- Financial transaction integrity
- Account balance reconciliation
- Standard accounting practices

## 🔐 **Security Architecture**

### **Authentication Flow**

1. User enters phone/email
2. OTP sent via Supabase Auth
3. OTP verification creates session
4. User data synced with local database
5. Business context established

### **Authorization**

- Route-level protection via middleware
- Business-level access control
- Role-based permissions
- Resource ownership validation

### **Data Security**

- HTTP-only cookies for sessions
- Environment variable management
- SQL injection prevention (Prisma)
- XSS protection (React)

## 🚀 **Performance Optimizations**

### **Frontend**

- React Server Components
- Optimistic UI updates
- Image optimization
- Code splitting

### **Backend**

- Database query optimization
- Connection pooling
- Caching strategies
- Efficient pagination

### **Database**

- Strategic indexing
- Query optimization
- Connection management
- Migration versioning

## 🧪 **Development Workflow**

### **Getting Started**

```bash
# Clone repository
git clone <repository-url>

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local

# Setup database
npx prisma migrate dev

# Start development server
npm run dev
```

### **Key Commands**

```bash
# Database operations
npx prisma generate      # Generate Prisma client
npx prisma migrate dev   # Run migrations
npx prisma studio       # Database GUI

# Development
npm run dev             # Start dev server
npm run build          # Production build
npm run lint           # Code linting
```

## 📈 **Scalability Considerations**

### **Horizontal Scaling**

- Multi-tenant architecture
- Stateless server design
- Database read replicas
- CDN integration

### **Performance Monitoring**

- Error tracking
- Performance metrics
- Database query analysis
- User experience monitoring

### **Future Enhancements**

- Microservices migration
- Event-driven architecture
- Advanced analytics
- Mobile applications
- Third-party integrations

## 🛠️ **Development Guidelines**

### **Code Organization**

- Feature-based folder structure
- Consistent naming conventions
- Type-safe development
- Component reusability

### **Best Practices**

- Server Actions for mutations
- React Server Components for data fetching
- Optimistic UI updates
- Error boundary implementation
- Loading state management

### **Testing Strategy**

- Unit tests for utilities
- Integration tests for actions
- Component testing
- E2E testing for critical flows

---

This architecture provides a solid foundation for a scalable, secure, and maintainable retail management system that can grow with business needs.
