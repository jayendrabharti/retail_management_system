# Retail Management System

A comprehensive **multi-tenant SaaS retail management system** built for modern businesses. This system provides end-to-end business management capabilities with a focus on scalability, security, and user experience.

## ✨ **Key Features**

### **🏢 Multi-Tenant Business Management**

- Independent business environments
- Seamless business switching
- Role-based access control
- Scalable tenant isolation

### **📊 Comprehensive Dashboard**

- Real-time business analytics
- Sales and purchase insights
- Inventory status overview
- Financial performance metrics

### **📦 Advanced Inventory Management**

- Product catalog with categories
- Stock level tracking
- Batch management
- Automated reorder alerts
- Multi-unit support

### **👥 Customer & Supplier Management**

- Unified party management system
- Contact and address management
- Credit limit tracking
- Transaction history

### **💰 Financial Management**

- Double-entry bookkeeping
- Automated accounting entries
- Expense tracking
- Cash flow management
- Financial reporting

### **🧾 Sales & Purchase Operations**

- Invoice generation
- Quotation management
- Payment tracking
- Return processing
- Status workflows

## 🛠️ **Technology Stack**

### **Frontend**

- **Next.js 15** - React framework with App Router
- **React 19** - Latest React with concurrent features
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible components
- **Framer Motion** - Smooth animations

### **Backend**

- **Next.js Server Actions** - Server-side operations
- **Prisma ORM** - Type-safe database access
- **PostgreSQL** - Robust relational database
- **Supabase** - Authentication and storage

### **Authentication & Security**

- **Supabase Auth** - Phone/Email OTP verification
- **HTTP-only cookies** - Secure session management
- **Middleware protection** - Route-level security
- **Multi-tenant access control** - Data isolation

## 🚀 **Quick Start**

### **Prerequisites**

- Node.js 18+
- PostgreSQL database
- Supabase account

### **Installation**

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd retail_management_system
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**

   ```bash
   cp .env.example .env.local
   ```

   Configure your environment variables:

   ```env
   # Database
   DATABASE_URL="postgresql://..."
   DIRECT_URL="postgresql://..."

   # Supabase
   NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
   NEXT_PUBLIC_SUPABASE_SECRET_ROLE_KEY="your-secret-key"

   # Email (for notifications)
   GMAIL_USER="your-gmail@gmail.com"
   GMAIL_PASS="your-app-password"
   ```

4. **Database Setup**

   ```bash
   # Generate Prisma client
   npx prisma generate

   # Run database migrations
   npx prisma migrate dev

   # Optional: Open Prisma Studio
   npx prisma studio
   ```

5. **Start Development Server**

   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000` to access the application.

## 📁 **Project Structure**

```
retail_management_system/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   ├── (main)/            # Main application
│   └── (home)/            # Public pages
├── actions/               # Server Actions
├── components/            # React components
├── providers/             # Context providers
├── prisma/               # Database schema
├── supabase/             # Supabase config
├── types/                # TypeScript types
└── utils/                # Utilities
```

## 🔧 **Available Scripts**

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run ESLint

# Database
npx prisma generate     # Generate Prisma client
npx prisma migrate dev  # Run migrations
npx prisma studio       # Database GUI
npx prisma db push      # Push schema changes
```

## 🗃️ **Database Schema**

The system uses a comprehensive PostgreSQL schema with:

- **User Management** - Authentication and user profiles
- **Business Management** - Multi-tenant business entities
- **Product Catalog** - Products, categories, and inventory
- **Sales & Purchases** - Transaction management
- **Financial Records** - Double-entry accounting
- **Party Management** - Customers and suppliers

See `ARCHITECTURE.md` for detailed schema documentation.

## 🔐 **Security Features**

- **Authentication**: Phone/Email OTP via Supabase
- **Authorization**: Role-based access control
- **Data Isolation**: Multi-tenant architecture
- **Session Security**: HTTP-only cookies
- **Route Protection**: Middleware-based guards
- **Audit Logging**: Comprehensive activity tracking

## 📈 **Performance Features**

- **Server Components** - Optimal rendering strategy
- **Optimistic Updates** - Instant UI feedback
- **Database Indexing** - Query optimization
- **Code Splitting** - Efficient bundle loading
- **Image Optimization** - Automatic image processing

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 **License**

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 **Support**

For support and questions:

- Check the documentation in `ARCHITECTURE.md`
- Review existing issues
- Create a new issue for bugs or feature requests

---

**Built with ❤️ for modern retail businesses**
