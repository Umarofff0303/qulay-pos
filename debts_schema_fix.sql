-- Minimal fix for debtors and debt history tables in Supabase
-- Run this in Supabase SQL Editor for the current project.

CREATE TABLE IF NOT EXISTS public.debtors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  notes text,
  total_debt_amount numeric(10,2) NOT NULL DEFAULT 0,
  paid_amount numeric(10,2) NOT NULL DEFAULT 0,
  remaining_balance numeric(10,2) NOT NULL DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'cleared')),
  due_date date,
  last_transaction_date timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.debtors ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.debt_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  debtor_id uuid NOT NULL REFERENCES public.debtors(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  type text NOT NULL CHECK (type IN ('charge', 'payment')),
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.debt_entries ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_debtors_status ON public.debtors(status);
CREATE INDEX IF NOT EXISTS idx_debtors_balance ON public.debtors(remaining_balance);
CREATE INDEX IF NOT EXISTS idx_debtors_due_date ON public.debtors(due_date);
CREATE INDEX IF NOT EXISTS idx_debt_entries_debtor ON public.debt_entries(debtor_id);

DROP POLICY IF EXISTS "Debtors are viewable by everyone" ON public.debtors;
DROP POLICY IF EXISTS "Debt entries are viewable by everyone" ON public.debt_entries;
DROP POLICY IF EXISTS "Anyone can insert debtors" ON public.debtors;
DROP POLICY IF EXISTS "Anyone can update debtors" ON public.debtors;
DROP POLICY IF EXISTS "Anyone can delete debtors" ON public.debtors;
DROP POLICY IF EXISTS "Anyone can insert debt entries" ON public.debt_entries;

CREATE POLICY "Debtors are viewable by everyone" ON public.debtors
  FOR SELECT USING (true);

CREATE POLICY "Debt entries are viewable by everyone" ON public.debt_entries
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert debtors" ON public.debtors
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update debtors" ON public.debtors
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete debtors" ON public.debtors
  FOR DELETE USING (true);

CREATE POLICY "Anyone can insert debt entries" ON public.debt_entries
  FOR INSERT WITH CHECK (true);
