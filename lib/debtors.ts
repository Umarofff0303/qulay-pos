import type { Debtor } from '@/lib/supabase';

export const DEFAULT_DEBT_TERM_DAYS = 7;
export const DUE_SOON_THRESHOLD_DAYS = 3;

type DebtorDueShape = Pick<Debtor, 'due_date' | 'last_transaction_date' | 'remaining_balance'>;

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const isDateOnlyValue = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const parseDateValue = (value?: string | null) => {
  if (!value) return null;

  if (isDateOnlyValue(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const parsed = new Date(year, month - 1, day);
    parsed.setHours(0, 0, 0, 0);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeToStartOfDay = (date: Date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

export const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

export const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getDefaultDebtDueDateInput = (referenceDate = new Date()) =>
  toDateInputValue(addDays(referenceDate, DEFAULT_DEBT_TERM_DAYS));

export const getDebtorDueDate = (debtor: Partial<DebtorDueShape> | null | undefined) => {
  if (!debtor) return null;

  const explicitDueDate = parseDateValue(debtor.due_date);
  if (explicitDueDate) {
    return normalizeToStartOfDay(explicitDueDate);
  }

  const lastTransactionDate = parseDateValue(debtor.last_transaction_date);
  if (!lastTransactionDate) return null;

  return normalizeToStartOfDay(addDays(lastTransactionDate, DEFAULT_DEBT_TERM_DAYS));
};

export const getDebtorDueDateInput = (debtor: Partial<DebtorDueShape> | null | undefined) => {
  const dueDate = getDebtorDueDate(debtor);
  return dueDate ? toDateInputValue(dueDate) : getDefaultDebtDueDateInput();
};

export const resolveDueDateForSave = (dueDate: string | null | undefined, referenceDate = new Date()) => {
  if (dueDate?.trim()) {
    return dueDate;
  }

  return getDefaultDebtDueDateInput(referenceDate);
};

export const getDebtorDueMeta = (
  debtor: Partial<DebtorDueShape> | null | undefined,
  referenceDate = new Date()
) => {
  const dueDate = getDebtorDueDate(debtor);
  if (!dueDate) {
    return {
      dueDate: null,
      daysUntilDue: null,
      status: 'unknown' as const,
    };
  }

  const reference = normalizeToStartOfDay(referenceDate);
  const diffInDays = Math.round((dueDate.getTime() - reference.getTime()) / DAY_IN_MS);

  if (diffInDays < 0) {
    return {
      dueDate,
      daysUntilDue: diffInDays,
      status: 'overdue' as const,
    };
  }

  if (diffInDays <= DUE_SOON_THRESHOLD_DAYS) {
    return {
      dueDate,
      daysUntilDue: diffInDays,
      status: 'due-soon' as const,
    };
  }

  return {
    dueDate,
    daysUntilDue: diffInDays,
    status: 'ok' as const,
  };
};

export const getDebtorDueLabel = (debtor: Partial<DebtorDueShape> | null | undefined) => {
  const { dueDate, daysUntilDue, status } = getDebtorDueMeta(debtor);

  if (!dueDate || daysUntilDue === null) {
    return "Muddat aniqlanmagan";
  }

  if (status === 'overdue') {
    return `${Math.abs(daysUntilDue)} kun o'tib ketgan`;
  }

  if (daysUntilDue === 0) {
    return 'Bugun muddati tugaydi';
  }

  if (status === 'due-soon') {
    return `${daysUntilDue} kun qoldi`;
  }

  return `${daysUntilDue} kun qoldi`;
};

const getDebtorSortRank = (debtor: Partial<DebtorDueShape>) => {
  const dueStatus = getDebtorDueMeta(debtor).status;

  if (dueStatus === 'overdue') return 0;
  if (dueStatus === 'due-soon') return 1;
  return 2;
};

export const sortDebtorsByUrgency = <T extends DebtorDueShape>(debtors: T[]) =>
  [...debtors].sort((left, right) => {
    const leftRank = getDebtorSortRank(left);
    const rightRank = getDebtorSortRank(right);

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    const leftDueDate = getDebtorDueDate(left);
    const rightDueDate = getDebtorDueDate(right);

    if (leftDueDate && rightDueDate && leftDueDate.getTime() !== rightDueDate.getTime()) {
      return leftDueDate.getTime() - rightDueDate.getTime();
    }

    return Number(right.remaining_balance || 0) - Number(left.remaining_balance || 0);
  });

export const isDueSoonDebtor = (debtor: Partial<DebtorDueShape>) => {
  const dueStatus = getDebtorDueMeta(debtor).status;
  return dueStatus === 'overdue' || dueStatus === 'due-soon';
};

export const isMissingDueDateColumnError = (error: any) => {
  const errorMessage = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
  return errorMessage.includes('due_date') && (errorMessage.includes('column') || error?.code === 'PGRST204');
};
