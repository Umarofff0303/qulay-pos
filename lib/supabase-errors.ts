export const DEBT_SCHEMA_MISSING_MESSAGE =
  'Supabase projectda `debtors`, `debt_entries` yoki `sales_history` jadvallari yoq. `database.sql` yoki `debts_schema_fix.sql` ni SQL Editor da ishga tushiring va sahifani yangilang.';

export const formatSupabaseError = (error: unknown, fallback: string) => {
  const message = error instanceof Error ? error.message : String(error || '');

  if (
    message.includes("Could not find the table 'public.debtors'") ||
    message.includes("Could not find the table 'public.debt_entries'") ||
    message.includes("Could not find the table 'public.sales_history'") ||
    (message.includes('schema cache') &&
      (
        message.includes('public.debtors') ||
        message.includes('public.debt_entries') ||
        message.includes('public.sales_history')
      ))
  ) {
    return DEBT_SCHEMA_MISSING_MESSAGE;
  }

  return message || fallback;
};
