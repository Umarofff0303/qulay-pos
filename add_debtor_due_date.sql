ALTER TABLE public.debtors
  ADD COLUMN IF NOT EXISTS due_date date;

UPDATE public.debtors
SET due_date = COALESCE(
  due_date,
  (COALESCE(last_transaction_date, created_at, now())::date + 7)
)
WHERE due_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_debtors_due_date ON public.debtors(due_date);
