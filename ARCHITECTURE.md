# ShopPOS Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser / Client                          │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │          Next.js 14 (React App)                         │ │
│  │  ┌──────────────────────────────────────────────────┐   │ │
│  │  │  Pages                                           │   │ │
│  │  │  - Login / Dashboard / POS / Products / etc       │   │ │
│  │  └──────────────────────────────────────────────────┘   │ │
│  │  ┌──────────────────────────────────────────────────┐   │ │
│  │  │  Components                                      │   │ │
│  │  │  - AdminLayout / Forms / Tables / Charts         │   │ │
│  │  └──────────────────────────────────────────────────┘   │ │
│  │  ┌──────────────────────────────────────────────────┐   │ │
│  │  │  State (Zustand)                                 │   │ │
│  │  │  - useCartStore / useAuthStore                   │   │ │
│  │  └──────────────────────────────────────────────────┘   │ │
│  │  ┌──────────────────────────────────────────────────┐   │ │
│  │  │  UI Framework                                    │   │ │
│  │  │  - MUI Components / MUI X Data Grid              │   │ │
│  │  └──────────────────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────┬──────────────────────────────────────────────┘
                  │
                  │ HTTPS API Calls
                  │
┌─────────────────▼──────────────────────────────────────────────┐
│              Supabase (Backend as a Service)                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Authentication (Supabase Auth)                          │  │
│  │  - Email/Password login                                  │  │
│  │  - JWT tokens                                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  PostrgreSQL Database (Tables)                           │  │
│  │                                                          │  │
│  │  Products ──┐                                            │  │
│  │  Categories ├─→ Sales Logic                              │  │
│  │  Sale Items ┘                                            │  │
│  │                                                          │  │
│  │  Customers ──┐                                           │  │
│  │  Debts ──────├─→ Credit/Debt Logic                       │  │
│  │  Debt Entries┘                                           │  │
│  │                                                          │  │
│  │  Sales       ──→ Transaction History                     │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Real-time & APIs (REST)                                 │  │
│  │  - Automatic stock updates                               │  │
│  │  - Instant data sync                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

## Data Flow Architecture

### Sales Transaction Flow

```
Product Search
    ↓
[Add to Cart] → Cart Store (Zustand)
    ↓
[Checkout Button]
    ↓
Payment Dialog
    ↓
[Submit Payment]
    ↓
API: Create Sale
    ├─ Insert: sales table
    ├─ Insert: sale_items table
    ├─ UPDATE: products stock (decrement)
    └─ INSERT: debts table (if credit sale)
    ↓
Success Message
    ↓
Clear Cart / Refresh Stock
```

### Credit Sale & Debt Flow

```
Customer Selects Credit Payment
    ↓
Enter Customer Info
    ↓
Create/Get Customer Record
    ↓
Create Sale + Sale Items
    ↓
Check Existing Debt
    ├─ If exists: UPDATE remaining_balance
    └─ If new: CREATE new debt record
    ↓
INSERT debt_entries (charge)
    ↓
Debt Ledger Updated
    ↓
[Later: Record Payment]
    ↓
INSERT debt_entries (payment)
    ↓
UPDATE debt (remaining_balance, paid_amount)
    ↓
Mark as cleared if balance = 0
```

## Component Hierarchy

```
RootLayout
├─ ThemeProvider (MUI Theme)
├─ AuthCheck (Redirect Logic)
│
├─ LoginPage
│  └─ LoginForm
│
└─ AdminLayout (Authenticated)
   ├─ AppBar (Header + User Menu)
   ├─ Sidebar (Navigation)
   │
   └─ Pages
      ├─ Dashboard
      │  ├─ StatCard (x8)
      │  ├─ LineChart (Sales Trend)
      │  └─ QuickActions
      │
      ├─ POSPage
      │  ├─ BarcodeInput
      │  ├─ ProductSearch (Autocomplete)
      │  ├─ ProductCard
      │  ├─ CartTable
      │  ├─ CartSummary
      │  └─ PaymentDialog
      │
      ├─ ProductsPage
      │  ├─ SearchBar
      │  ├─ DataGrid (Products Table)
      │  ├─ AddProductDialog
      │  └─ EditProductDialog
      │
      ├─ CustomersPage
      │  ├─ SearchBar
      │  ├─ DataGrid (Customers Table)
      │  └─ CustomerFormDialog
      │
      ├─ DebtorsPage
      │  ├─ DebtorCards (List)
      │  ├─ DebtorDetails (Expanded)
      │  └─ PaymentDialog
      │
      ├─ SalesPage
      │  ├─ FilterBar
      │  ├─ DataGrid (Sales Table)
      │  ├─ SaleDetailsDialog
      │  └─ ReceiptPrint
      │
      └─ SettingsPage
         └─ Preference Controls
```

## State Management

### Zustand Stores

#### useCartStore
```typescript
{
  items: CartItem[],
  addItem(product, quantity, weight?)
  removeItem(productId)
  updateItem(productId, quantity, weight?)
  clearCart()
  getTotal()
  getSubtotal()
  getItemCount()
}
```

#### useAuthStore
```typescript
{
  user: User | null,
  loading: boolean,
  setUser(user)
  setLoading(loading)
}
```

## Database Schema

### Core Tables

```
products
├─ id (UUID)
├─ name (text)
├─ barcode (text, unique)
├─ category_id (FK)
├─ buy_price (numeric)
├─ sell_price (numeric)
├─ stock_quantity (numeric)
├─ unit_type (text)
├─ minimum_stock (numeric)
├─ created_at
└─ updated_at

sales
├─ id (UUID)
├─ customer_id (FK, nullable)
├─ total_amount (numeric)
├─ discount_amount (numeric)
├─ payment_method (enum: cash/card/credit)
├─ is_credit (boolean)
├─ status (enum: completed/cancelled)
└─ created_at

sale_items
├─ id (UUID)
├─ sale_id (FK)
├─ product_id (FK)
├─ quantity (numeric)
├─ unit_price (numeric)
├─ total_price (numeric)
└─ created_at

customers
├─ id (UUID)
├─ first_name (text)
├─ last_name (text)
├─ phone (text, nullable)
├─ notes (text, nullable)
└─ created_at

debts
├─ id (UUID)
├─ customer_id (FK)
├─ total_debt_amount (numeric)
├─ paid_amount (numeric)
├─ remaining_balance (numeric)
├─ status (enum: pending/partial/cleared)
├─ last_transaction_date (timestamp)
├─ created_at
└─ updated_at

debt_entries
├─ id (UUID)
├─ debt_id (FK)
├─ amount (numeric)
├─ type (enum: charge/payment)
├─ notes (text, nullable)
└─ created_at
```

## API Layer Architecture

```
supabase.ts
├─ Client initialization
├─ Type definitions
└─ Utility functions

Components/Pages
├─ useEffect() calls
├─ supabase.from().select()
├─ supabase.from().insert()
├─ supabase.from().update()
└─ supabase.from().delete()
```

## Form Validation Architecture

```
useForm (React Hook Form)
├─ Controller wrapper
├─ Zod schema validation
├─ Real-time error display
└─ onSubmit handler
```

## UI Component Layers

```
MUI Theme (Material Design)
│
├─ Layout Components
│  ├─ Container
│  ├─ Box
│  ├─ Grid
│  └─ AppBar
│
├─ Input Components
│  ├─ TextField
│  ├─ Autocomplete
│  ├─ MenuItem
│  └─ Switch
│
├─ Display Components
│  ├─ Card
│  ├─ Chip
│  ├─ Table
│  ├─ DataGrid
│  └─ Dialog
│
├─ Navigation
│  ├─ Sidebar
│  ├─ AppBar
│  ├─ Menu
│  └─ ListItemButton
│
└─ Feedback
   ├─ Alert
   ├─ Snackbar
   ├─ CircularProgress
   └─ Skeleton
```

## Authentication Flow

```
[Login Page]
    ↓
[Enter Credentials]
    ↓
supabase.auth.signInWithPassword()
    ↓
{success} ↘                 ↙ {error}
         [Show Error]
         [Try Again]
    ↓
Store user in useAuthStore
    ↓
setUser(user)
    ↓
Redirect to /dashboard
    ↓
[Dashboard Loads]
    ↓
Check session on app init
├─ If authenticated: Show dashboard
└─ If not: Redirect to login
```

## File Naming Conventions

```
Pages:        /app/[feature]/page.tsx
Components:   /components/[ComponentName].tsx
Types:        Defined in lib/supabase.ts
Styles:       Inline via MUI sx prop
Utilities:    /lib/*.ts
Database:     database.sql
```

## Performance Optimizations

1. **Data Grid Pagination** - Only load 10 rows per page
2. **Lazy Loading** - Components load on demand
3. **Memoization** - useCallback for expensive operations
4. **Database Indexes** - On barcode, customer_id, etc.
5. **SQL Queries** - Filtered and limited
6. **Image Optimization** - Next.js Image component (when needed)

## Security Considerations

1. **Supabase Auth** - Secure JWT token management
2. **Row Level Security** - Database policies (optional)
3. **Environment Variables** - Secrets in .env.local
4. **HTTPS Only** - Production enforces HTTPS
5. **Input Validation** - Zod schema validation

## Scalability Path

```
Current (Single Shop)
  ↓
Multi-user (Add permissions)
  ↓
Multi-store (Add store_id FK)
  ↓
Advanced Analytics (Add reports table)
  ↓
Mobile App (React Native + same backend)
```

---

This architecture supports up to thousands of daily transactions and millions of products.
