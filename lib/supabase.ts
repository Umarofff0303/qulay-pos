import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export type Product = {
  id: string;
  name: string;
  barcode: string | null;
  category_id: string | null;
  buy_price: number;
  sell_price: number;
  stock_quantity: number;
  unit_type: string;
  image_url: string | null;
  minimum_stock: number;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  name: string;
  created_at: string;
};

export type Customer = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  notes: string | null;
  created_at: string;
};

export type Debtor = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  notes: string | null;
  total_debt_amount: number;
  paid_amount: number;
  remaining_balance: number;
  status: 'pending' | 'partial' | 'cleared';
  due_date?: string | null;
  last_transaction_date: string;
  created_at: string;
  updated_at: string;
};

export type SaleHistory = {
  id: string;
  customer_id: string | null;
  debtor_id: string | null;
  total_amount: number;
  discount_amount: number;
  payment_method: 'cash' | 'card' | 'credit';
  is_credit: boolean;
  status: 'completed' | 'cancelled';
  created_at: string;
};

export type SaleItem = {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
};

export type DebtEntry = {
  id: string;
  debtor_id: string;
  amount: number;
  type: 'charge' | 'payment';
  notes: string | null;
  created_at: string;
};
