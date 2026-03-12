-- Supabase POS System Database Schema
-- Version aligned with separate debtors and sales_history tables.

-- Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Products Table
CREATE TABLE IF NOT EXISTS public.products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  barcode text UNIQUE,
  category_id uuid REFERENCES public.categories(id),
  buy_price numeric(10,2) NOT NULL DEFAULT 0,
  sell_price numeric(10,2) NOT NULL DEFAULT 0,
  stock_quantity numeric(10,2) NOT NULL DEFAULT 0,
  unit_type text NOT NULL DEFAULT 'piece',
  image_url text,
  minimum_stock numeric(10,2) NOT NULL DEFAULT 10,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Debtors Table
CREATE TABLE IF NOT EXISTS public.debtors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  notes text,
  total_debt_amount numeric(10,2) NOT NULL DEFAULT 0,
  paid_amount numeric(10,2) NOT NULL DEFAULT 0,
  remaining_balance numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'cleared')),
  due_date date,
  last_transaction_date timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.debtors ENABLE ROW LEVEL SECURITY;

-- Sales History Table
CREATE TABLE IF NOT EXISTS public.sales_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  debtor_id uuid REFERENCES public.debtors(id) ON DELETE SET NULL,
  total_amount numeric(10,2) NOT NULL,
  discount_amount numeric(10,2) DEFAULT 0,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'card', 'credit')),
  is_credit boolean DEFAULT false,
  status text DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sales_history_credit_requires_debtor CHECK (NOT is_credit OR debtor_id IS NOT NULL)
);

ALTER TABLE public.sales_history ENABLE ROW LEVEL SECURITY;

-- Sale Items Table
CREATE TABLE IF NOT EXISTS public.sale_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id uuid NOT NULL REFERENCES public.sales_history(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity numeric(10,2) NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  total_price numeric(10,2) NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- Debt Entries Table
CREATE TABLE IF NOT EXISTS public.debt_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  debtor_id uuid NOT NULL REFERENCES public.debtors(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  type text NOT NULL CHECK (type IN ('charge', 'payment')),
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.debt_entries ENABLE ROW LEVEL SECURITY;

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_sales_history_customer ON public.sales_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_history_debtor ON public.sales_history(debtor_id);
CREATE INDEX IF NOT EXISTS idx_sales_history_created ON public.sales_history(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_history_payment_method ON public.sales_history(payment_method);
CREATE INDEX IF NOT EXISTS idx_sales_history_credit_created ON public.sales_history(is_credit, created_at);
CREATE INDEX IF NOT EXISTS idx_sales_history_debtor_created ON public.sales_history(debtor_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON public.sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_debtors_status ON public.debtors(status);
CREATE INDEX IF NOT EXISTS idx_debtors_balance ON public.debtors(remaining_balance);
CREATE INDEX IF NOT EXISTS idx_debtors_due_date ON public.debtors(due_date);
CREATE INDEX IF NOT EXISTS idx_debt_entries_debtor ON public.debt_entries(debtor_id);

-- Insert sample categories
INSERT INTO public.categories (name) VALUES
  ('Beverages'),
  ('Groceries'),
  ('Dairy'),
  ('Meat'),
  ('Fruits'),
  ('Vegetables'),
  ('Electronics'),
  ('Clothing')
ON CONFLICT DO NOTHING;

-- Insert sample products
INSERT INTO public.products (name, barcode, category_id, buy_price, sell_price, stock_quantity, unit_type, minimum_stock)
SELECT
  'Rice (1kg)',
  '001',
  (SELECT id FROM categories WHERE name = 'Groceries'),
  1.50,
  3.99,
  50,
  'kg',
  10
WHERE NOT EXISTS (SELECT 1 FROM products WHERE barcode = '001')
UNION ALL
SELECT
  'Water Bottle',
  '002',
  (SELECT id FROM categories WHERE name = 'Beverages'),
  0.50,
  1.50,
  100,
  'piece',
  20
WHERE NOT EXISTS (SELECT 1 FROM products WHERE barcode = '002')
UNION ALL
SELECT
  'Milk (1L)',
  '003',
  (SELECT id FROM categories WHERE name = 'Dairy'),
  1.20,
  2.99,
  30,
  'liter',
  10
WHERE NOT EXISTS (SELECT 1 FROM products WHERE barcode = '003')
UNION ALL
SELECT
  'Chicken Breast (kg)',
  '004',
  (SELECT id FROM categories WHERE name = 'Meat'),
  4.00,
  8.99,
  20,
  'kg',
  5
WHERE NOT EXISTS (SELECT 1 FROM products WHERE barcode = '004')
UNION ALL
SELECT
  'Apples (kg)',
  '005',
  (SELECT id FROM categories WHERE name = 'Fruits'),
  0.80,
  2.50,
  40,
  'kg',
  15
WHERE NOT EXISTS (SELECT 1 FROM products WHERE barcode = '005');

-- Reset policies so the script can be re-run safely
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;
DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;
DROP POLICY IF EXISTS "Customers are viewable by everyone" ON public.customers;
DROP POLICY IF EXISTS "Debtors are viewable by everyone" ON public.debtors;
DROP POLICY IF EXISTS "Sales history is viewable by everyone" ON public.sales_history;
DROP POLICY IF EXISTS "Sale items are viewable by everyone" ON public.sale_items;
DROP POLICY IF EXISTS "Debt entries are viewable by everyone" ON public.debt_entries;

DROP POLICY IF EXISTS "Anyone can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Anyone can insert products" ON public.products;
DROP POLICY IF EXISTS "Anyone can update products" ON public.products;
DROP POLICY IF EXISTS "Anyone can delete products" ON public.products;
DROP POLICY IF EXISTS "Anyone can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can update customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can delete customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can insert debtors" ON public.debtors;
DROP POLICY IF EXISTS "Anyone can update debtors" ON public.debtors;
DROP POLICY IF EXISTS "Anyone can delete debtors" ON public.debtors;
DROP POLICY IF EXISTS "Anyone can insert sales history" ON public.sales_history;
DROP POLICY IF EXISTS "Anyone can insert sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Anyone can insert debt entries" ON public.debt_entries;

-- Read policies
CREATE POLICY "Categories are viewable by everyone" ON public.categories
  FOR SELECT USING (true);

CREATE POLICY "Products are viewable by everyone" ON public.products
  FOR SELECT USING (true);

CREATE POLICY "Customers are viewable by everyone" ON public.customers
  FOR SELECT USING (true);

CREATE POLICY "Debtors are viewable by everyone" ON public.debtors
  FOR SELECT USING (true);

CREATE POLICY "Sales history is viewable by everyone" ON public.sales_history
  FOR SELECT USING (true);

CREATE POLICY "Sale items are viewable by everyone" ON public.sale_items
  FOR SELECT USING (true);

CREATE POLICY "Debt entries are viewable by everyone" ON public.debt_entries
  FOR SELECT USING (true);

-- Write policies for development
CREATE POLICY "Anyone can insert categories" ON public.categories
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert products" ON public.products
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update products" ON public.products
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete products" ON public.products
  FOR DELETE USING (true);

CREATE POLICY "Anyone can insert customers" ON public.customers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update customers" ON public.customers
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete customers" ON public.customers
  FOR DELETE USING (true);

CREATE POLICY "Anyone can insert debtors" ON public.debtors
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update debtors" ON public.debtors
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete debtors" ON public.debtors
  FOR DELETE USING (true);

CREATE POLICY "Anyone can insert sales history" ON public.sales_history
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert sale items" ON public.sale_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert debt entries" ON public.debt_entries
  FOR INSERT WITH CHECK (true);
