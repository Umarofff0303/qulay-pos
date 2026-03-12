'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Typography,
  Chip,
  Grid,
  Dialog,
  TextField,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { AlertCircle, DollarSign, Printer } from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import {
  getDebtorDueDate,
  getDebtorDueLabel,
  getDebtorDueMeta,
  isDueSoonDebtor,
  sortDebtorsByUrgency,
} from '@/lib/debtors';
import { buildReceiptHtml, openPrintWindow } from '@/lib/receipt';
import { formatSupabaseError } from '@/lib/supabase-errors';
import { supabase, Debtor, DebtEntry, SaleHistory, SaleItem, Product } from '@/lib/supabase';
import { useAppSettingsStore } from '@/lib/store';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const paymentSchema = z.object({
  amount: z.coerce.number().min(0.01, 'To`lov summasi kiritilishi shart'),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface DebtorSaleItem extends SaleItem {
  product?: Pick<Product, 'id' | 'name' | 'unit_type'> | null;
}

interface DebtorSaleWithItems extends SaleHistory {
  items?: DebtorSaleItem[];
}

interface DebtSummary {
  totalSales: number;
  totalCreditSales: number;
  totalRecovered: number;
  totalRemaining: number;
}

const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export default function DebtorsPage() {
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [dueSoonDebtors, setDueSoonDebtors] = useState<Debtor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [summary, setSummary] = useState<DebtSummary>({
    totalSales: 0,
    totalCreditSales: 0,
    totalRecovered: 0,
    totalRemaining: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDebtor, setSelectedDebtor] = useState<Debtor | null>(null);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [debtEntries, setDebtEntries] = useState<DebtEntry[]>([]);
  const [debtorSales, setDebtorSales] = useState<DebtorSaleWithItems[]>([]);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [printAfterPayment, setPrintAfterPayment] = useState(false);
  const { autoPrintReceipt, currencyCode, storeName, receiptFooter } = useAppSettingsStore((state) => ({
    autoPrintReceipt: state.autoPrintReceipt,
    currencyCode: state.currencyCode,
    storeName: state.storeName,
    receiptFooter: state.receiptFooter,
  }));

  const { control, handleSubmit, reset: resetForm } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
  });

  useEffect(() => {
    fetchDebtors();
  }, []);

  const fetchDebtors = async () => {
    try {
      setLoading(true);
      setError('');

      const [debtorsResult, salesResult] = await Promise.all([
        supabase
          .from('debtors')
          .select('*')
          .order('last_transaction_date', { ascending: false }),
        supabase.from('sales_history').select('total_amount, is_credit'),
      ]);

      const { data: debtorsData, error: debtorsError } = debtorsResult;
      const { data: salesData, error: salesError } = salesResult;

      if (debtorsError) throw debtorsError;
      if (salesError) throw salesError;

      if (!debtorsData) {
        setDebtors([]);
        setDueSoonDebtors([]);
        return;
      }

      const normalizedDebtors = debtorsData.map((debtor) => ({
        ...debtor,
        total_debt_amount: Number(debtor.total_debt_amount || 0),
        paid_amount: Number(debtor.paid_amount || 0),
        remaining_balance: Number(debtor.remaining_balance || 0),
      }));
      const activeDebtors = normalizedDebtors.filter((debtor) => debtor.remaining_balance > 0);
      const sortedDebtors = sortDebtorsByUrgency(activeDebtors);

      setDebtors(sortedDebtors);
      setDueSoonDebtors(sortedDebtors.filter(isDueSoonDebtor));
      setSummary({
        totalSales:
          (salesData || []).reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0) || 0,
        totalCreditSales:
          (salesData || [])
            .filter((sale) => sale.is_credit)
            .reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0) || 0,
        totalRecovered:
          normalizedDebtors.reduce((sum, debtor) => sum + Number(debtor.paid_amount || 0), 0) || 0,
        totalRemaining:
          normalizedDebtors.reduce((sum, debtor) => sum + Number(debtor.remaining_balance || 0), 0) || 0,
      });
    } catch (err: any) {
      setError(formatSupabaseError(err, 'Qarzdorlarni yuklab bo`lmadi'));
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (debtor: Debtor) => {
    setSelectedDebtor(debtor);

    const [entriesResult, salesResult] = await Promise.all([
      supabase
        .from('debt_entries')
        .select('*')
        .eq('debtor_id', debtor.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('sales_history')
        .select('*')
        .eq('debtor_id', debtor.id)
        .eq('is_credit', true)
        .order('created_at', { ascending: false }),
    ]);

    if (entriesResult.error) {
      setError(formatSupabaseError(entriesResult.error, 'Qarz tarixini yuklab bo`lmadi'));
      return;
    }

    if (salesResult.error) {
      setError(formatSupabaseError(salesResult.error, 'Qarzdor xaridlarini yuklab bo`lmadi'));
      return;
    }

    const salesWithItems = await Promise.all(
      (salesResult.data || []).map(async (sale) => {
        const { data: items } = await supabase
          .from('sale_items')
          .select('*, product:products(id, name, unit_type)')
          .eq('sale_id', sale.id);

        return {
          ...sale,
          items: items || [],
        };
      })
    );

    setDebtEntries(entriesResult.data || []);
    setDebtorSales(salesWithItems);
  };

  const handlePaymentSubmit = async (data: PaymentFormData) => {
    if (!selectedDebtor) return;

    try {
      setPaymentLoading(true);
      setError('');

      const paymentAmount = roundCurrency(data.amount);
      const currentBalance = roundCurrency(Number(selectedDebtor.remaining_balance));

      if (paymentAmount > currentBalance) {
        throw new Error('To`lov qolgan qarzdan oshib ketmasligi kerak');
      }

      const now = new Date().toISOString();
      const newBalance = roundCurrency(currentBalance - paymentAmount);
      const newPaidAmount = roundCurrency(Number(selectedDebtor.paid_amount) + paymentAmount);
      const newStatus = newBalance <= 0 ? 'cleared' : 'partial';

      // Create payment entry
      const { error: paymentEntryError } = await supabase.from('debt_entries').insert([
        {
          debtor_id: selectedDebtor.id,
          amount: paymentAmount,
          type: 'payment',
          notes: data.notes?.trim() || null,
        },
      ]);

      if (paymentEntryError) throw paymentEntryError;

      const { error: updateDebtError } = await supabase
        .from('debtors')
        .update({
          remaining_balance: newBalance,
          paid_amount: newPaidAmount,
          status: newStatus,
          last_transaction_date: now,
          updated_at: now,
        })
        .eq('id', selectedDebtor.id);

      if (updateDebtError) throw updateDebtError;

      if (autoPrintReceipt || printAfterPayment) {
        printPaymentReceipt({
          debtor: selectedDebtor,
          paymentAmount,
          paymentDate: now,
          notes: data.notes?.trim() || null,
          remainingBalance: newBalance,
        });
      }

      await fetchDebtors();
      resetForm();
      setOpenPaymentDialog(false);
      setPrintAfterPayment(false);

      if (newBalance <= 0) {
        setSelectedDebtor(null);
        setDebtEntries([]);
        setDebtorSales([]);
        return;
      }

      const updatedDebtor: Debtor = {
        ...selectedDebtor,
        remaining_balance: newBalance,
        paid_amount: newPaidAmount,
        status: newStatus,
        last_transaction_date: now,
      };

      await handleViewDetails(updatedDebtor);
    } catch (err: any) {
      setPrintAfterPayment(false);
      setError(formatSupabaseError(err, 'To`lovni saqlab bo`lmadi'));
    } finally {
      setPaymentLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: currencyCode === 'UZS' ? 0 : 2,
      maximumFractionDigits: currencyCode === 'UZS' ? 0 : 2,
    }).format(value);
  };

  const formatDueDate = (debtor: Debtor) => {
    const dueDate = getDebtorDueDate(debtor);
    return dueDate ? dueDate.toLocaleDateString('uz-UZ') : 'Belgilanmagan';
  };

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const matchesSearchQuery = (debtor: Debtor) => {
    if (!normalizedSearchQuery) return true;

    const fullName = `${debtor.first_name} ${debtor.last_name}`.toLowerCase();
    return (
      debtor.first_name.toLowerCase().includes(normalizedSearchQuery) ||
      debtor.last_name.toLowerCase().includes(normalizedSearchQuery) ||
      fullName.includes(normalizedSearchQuery) ||
      (debtor.phone || '').toLowerCase().includes(normalizedSearchQuery)
    );
  };

  const filteredDebtors = debtors.filter(matchesSearchQuery);
  const filteredDueSoonDebtors = dueSoonDebtors.filter(matchesSearchQuery);

  const printPaymentReceipt = ({
    debtor,
    paymentAmount,
    paymentDate,
    notes,
    remainingBalance,
  }: {
    debtor: Debtor;
    paymentAmount: number;
    paymentDate: string;
    notes: string | null;
    remainingBalance: number;
  }) => {
    const receiptHTML = buildReceiptHtml({
      documentTitle: `${storeName} Qarz to'lovi cheki`,
      storeName,
      title: 'Qarz to`lovi cheki',
      subtitle: new Date(paymentDate).toLocaleString('uz-UZ'),
      footer: receiptFooter,
      accentColor: '#f97316',
      sections: [
        {
          title: 'Qarzdor',
          fields: [
            { label: 'F.I.Sh.', value: `${debtor.first_name} ${debtor.last_name}` },
            { label: 'Telefon', value: debtor.phone || '-' },
          ],
        },
        {
          title: "To'lov",
          fields: [
            { label: "To'landi", value: formatCurrency(paymentAmount), emphasize: true },
            { label: 'Qoldiq', value: formatCurrency(remainingBalance) },
            { label: 'Izoh', value: notes || '-' },
          ],
        },
      ],
    });

    openPrintWindow(`${storeName} Qarz to'lovi cheki`, receiptHTML);
  };

  const printDebtorSaleReceipt = (sale: DebtorSaleWithItems) => {
    if (!selectedDebtor) return;

    const receiptHTML = buildReceiptHtml({
      documentTitle: `${storeName} Nasiya savdo cheki`,
      storeName,
      title: 'Nasiya savdo cheki',
      subtitle: new Date(sale.created_at).toLocaleString('uz-UZ'),
      footer: receiptFooter,
      accentColor: '#f97316',
      sections: [
        {
          title: 'Qarzdor',
          fields: [
            {
              label: 'F.I.Sh.',
              value: `${selectedDebtor.first_name} ${selectedDebtor.last_name}`,
            },
            { label: 'Telefon', value: selectedDebtor.phone || '-' },
            { label: "To'lov", value: 'Nasiya' },
          ],
        },
        {
          title: 'Mahsulotlar',
          lineItems:
            sale.items?.map((item) => ({
              name: item.product?.name || 'Mahsulot',
              meta: item.product?.unit_type ? `O'lchov: ${item.product.unit_type}` : undefined,
              quantity: `${item.quantity}`,
              total: formatCurrency(item.total_price),
            })) || [],
        },
        {
          title: 'Yakun',
          fields: [
            {
              label: 'Oraliq jami',
              value: formatCurrency(sale.total_amount + sale.discount_amount),
            },
            ...(sale.discount_amount > 0
              ? [{ label: 'Chegirma', value: formatCurrency(sale.discount_amount) }]
              : []),
            { label: 'Jami', value: formatCurrency(sale.total_amount), emphasize: true },
          ],
        },
      ],
    });

    openPrintWindow(`${storeName} Nasiya savdo cheki`, receiptHTML);
  };

  return (
    <AdminLayout>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Qarzdorlar
          </Typography>
          <Typography variant="body2" sx={{ color: '#666' }}>
            Nasiya savdo va qarzlarni boshqarish
          </Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!selectedDebtor && (
        <Card sx={{ mb: 3, p: 2.5, borderRadius: '12px', border: '1px solid #e0e0e0' }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              fullWidth
              label="Qarzdorni qidirish"
              placeholder="Ism, familiya yoki telefon bo`yicha qidiring"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              sx={{ flex: 1, minWidth: 260 }}
            />
            <Chip
              color="primary"
              variant="outlined"
              label={loading ? 'Yuklanmoqda...' : `${filteredDebtors.length} ta natija`}
            />
          </Box>
        </Card>
      )}

      {!selectedDebtor && filteredDueSoonDebtors.length > 0 && (
        <Card
          sx={{
            mb: 3,
            p: 2.5,
            borderRadius: '14px',
            border: '1px solid #fecaca',
            backgroundColor: '#fff1f2',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 2,
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              mb: 2,
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#b91c1c', mb: 0.5 }}>
                Muddatga yaqin qarzdorlar
              </Typography>
              <Typography variant="body2" sx={{ color: '#991b1b' }}>
                Muddati yaqinlashgan yoki o`tib ketgan qarzlar har doim tepada ko`rinadi.
              </Typography>
            </Box>
            <Chip
              label={`${filteredDueSoonDebtors.length} ta ogohlantirish`}
              color="error"
              variant="filled"
            />
          </Box>

          <Grid container spacing={2}>
            {filteredDueSoonDebtors.slice(0, 4).map((debtor) => {
              const dueMeta = getDebtorDueMeta(debtor);

              return (
                <Grid item xs={12} md={6} key={`due-${debtor.id}`}>
                  <Card
                    onClick={() => handleViewDetails(debtor)}
                    sx={{
                      p: 2,
                      borderRadius: '12px',
                      border: '1px solid #fca5a5',
                      backgroundColor: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {debtor.first_name} {debtor.last_name}
                      </Typography>
                      <Chip
                        size="small"
                        color="error"
                        label={dueMeta.status === 'overdue' ? "Muddati o'tgan" : 'Yaqinlashgan'}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ color: '#666', mb: 0.5 }}>
                      Qoldiq: {formatCurrency(debtor.remaining_balance)}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#b91c1c', fontWeight: 700 }}>
                      {getDebtorDueLabel(debtor)} - {formatDueDate(debtor)}
                    </Typography>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Card>
      )}

      {!selectedDebtor && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} lg={3}>
            <Card sx={{ p: 2.5, borderRadius: '12px', border: '1px solid #e0e0e0' }}>
              <Typography variant="body2" sx={{ color: '#666', mb: 0.75 }}>
                Umumiy savdo
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {loading ? '...' : formatCurrency(summary.totalSales)}
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <Card sx={{ p: 2.5, borderRadius: '12px', border: '1px solid #e0e0e0' }}>
              <Typography variant="body2" sx={{ color: '#666', mb: 0.75 }}>
                Jami nasiya savdo
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#f57c00' }}>
                {loading ? '...' : formatCurrency(summary.totalCreditSales)}
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <Card sx={{ p: 2.5, borderRadius: '12px', border: '1px solid #e0e0e0' }}>
              <Typography variant="body2" sx={{ color: '#666', mb: 0.75 }}>
                Qaytgan summa
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#2e7d32' }}>
                {loading ? '...' : formatCurrency(summary.totalRecovered)}
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <Card sx={{ p: 2.5, borderRadius: '12px', border: '1px solid #e0e0e0' }}>
              <Typography variant="body2" sx={{ color: '#666', mb: 0.75 }}>
                Qolgan qarz
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#c62828' }}>
                {loading ? '...' : formatCurrency(summary.totalRemaining)}
              </Typography>
            </Card>
          </Grid>
        </Grid>
      )}

      {!selectedDebtor ? (
        // Debtors List
        <Grid container spacing={3}>
          {loading ? (
            <Grid item xs={12}>
              <Card sx={{ p: 4, textAlign: 'center', borderRadius: '12px', border: '1px solid #e0e0e0' }}>
                <Typography variant="body1" sx={{ color: '#999' }}>
                  Qarzdorlar yuklanmoqda...
                </Typography>
              </Card>
            </Grid>
          ) : debtors.length === 0 ? (
            <Grid item xs={12}>
              <Card sx={{ p: 4, textAlign: 'center', borderRadius: '12px', border: '1px solid #e0e0e0' }}>
                <AlertCircle size={48} style={{ margin: '0 auto 16px', color: '#ccc' }} />
                <Typography variant="body1" sx={{ color: '#999' }}>
                  Faol qarzdor topilmadi
                </Typography>
              </Card>
            </Grid>
          ) : filteredDebtors.length === 0 ? (
            <Grid item xs={12}>
              <Card sx={{ p: 4, textAlign: 'center', borderRadius: '12px', border: '1px solid #e0e0e0' }}>
                <AlertCircle size={48} style={{ margin: '0 auto 16px', color: '#ccc' }} />
                <Typography variant="body1" sx={{ color: '#999', mb: 1 }}>
                  Qidiruv bo`yicha qarzdor topilmadi
                </Typography>
                <Typography variant="body2" sx={{ color: '#999' }}>
                  Boshqa ism yoki familiya bilan qayta urinib ko`ring
                </Typography>
              </Card>
            </Grid>
          ) : (
            filteredDebtors.map((debtor) => {
              const dueMeta = getDebtorDueMeta(debtor);

              return (
                <Grid item xs={12} sm={6} md={4} key={debtor.id}>
                  <Card
                    onClick={() => handleViewDetails(debtor)}
                    sx={{
                      p: 2.5,
                      borderRadius: '12px',
                      border:
                        dueMeta.status === 'overdue' || dueMeta.status === 'due-soon'
                          ? '1px solid #fca5a5'
                          : '1px solid #e0e0e0',
                      backgroundColor:
                        dueMeta.status === 'overdue' || dueMeta.status === 'due-soon' ? '#fff7f7' : '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {debtor.first_name} {debtor.last_name}
                      </Typography>
                      {debtor.phone && (
                        <Typography variant="body2" sx={{ color: '#666' }}>
                          {debtor.phone}
                        </Typography>
                      )}
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                        <Chip
                          size="small"
                          color={
                            dueMeta.status === 'overdue' || dueMeta.status === 'due-soon'
                              ? 'error'
                              : 'default'
                          }
                          label={getDebtorDueLabel(debtor)}
                        />
                        <Chip size="small" variant="outlined" label={`Muddat: ${formatDueDate(debtor)}`} />
                      </Box>
                    </Box>

                    <Box sx={{ mb: 2, pb: 2, borderBottom: '1px solid #e0e0e0' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" sx={{ color: '#666' }}>
                          Jami qarz:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#f44336' }}>
                          {formatCurrency(debtor.total_debt_amount)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" sx={{ color: '#666' }}>
                          To`langan:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#4caf50' }}>
                          {formatCurrency(debtor.paid_amount)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ color: '#666' }}>
                          Qoldiq:
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            color: debtor.remaining_balance > 0 ? '#ff9800' : '#4caf50',
                          }}
                        >
                          {formatCurrency(debtor.remaining_balance)}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Chip
                        label="Tafsilotlar"
                        size="small"
                        color={
                          dueMeta.status === 'overdue' || dueMeta.status === 'due-soon' ? 'error' : 'primary'
                        }
                        variant="outlined"
                      />
                      <Typography variant="caption" sx={{ color: '#999' }}>
                        {new Date(debtor.last_transaction_date).toLocaleDateString('uz-UZ')}
                      </Typography>
                    </Box>
                  </Card>
                </Grid>
              );
            })
          )}
        </Grid>
      ) : (
        // Debtor Details
        <Box>
          {/* Header */}
          <Card sx={{ p: 3, borderRadius: '12px', border: '1px solid #e0e0e0', mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {selectedDebtor.first_name} {selectedDebtor.last_name}
                </Typography>
                <Typography variant="body2" sx={{ color: '#666' }}>
                  {selectedDebtor.phone || 'Telefon yo`q'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                  <Chip
                    size="small"
                    color={
                      getDebtorDueMeta(selectedDebtor).status === 'overdue' ||
                      getDebtorDueMeta(selectedDebtor).status === 'due-soon'
                        ? 'error'
                        : 'default'
                    }
                    label={getDebtorDueLabel(selectedDebtor)}
                  />
                  <Chip size="small" variant="outlined" label={`Muddat: ${formatDueDate(selectedDebtor)}`} />
                </Box>
              </Box>
              <Button
                variant="contained"
                onClick={() => {
                  setOpenPaymentDialog(true);
                  resetForm();
                  setPrintAfterPayment(false);
                }}
                startIcon={<DollarSign size={18} />}
              >
                To`lov kiritish
              </Button>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2 }}>
              <Box>
                <Typography variant="body2" sx={{ color: '#666', mb: 0.5 }}>
                  Jami qarz
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#f44336' }}>
                  {formatCurrency(selectedDebtor.total_debt_amount)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: '#666', mb: 0.5 }}>
                  To`langan summa
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#4caf50' }}>
                  {formatCurrency(selectedDebtor.paid_amount)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: '#666', mb: 0.5 }}>
                  Qoldiq
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    color: selectedDebtor.remaining_balance > 0 ? '#ff9800' : '#4caf50',
                  }}
                >
                  {formatCurrency(selectedDebtor.remaining_balance)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: '#666', mb: 0.5 }}>
                  Qaytarish muddati
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    color:
                      getDebtorDueMeta(selectedDebtor).status === 'overdue' ||
                      getDebtorDueMeta(selectedDebtor).status === 'due-soon'
                        ? '#c62828'
                        : '#1976d2',
                  }}
                >
                  {formatDueDate(selectedDebtor)}
                </Typography>
              </Box>
            </Box>
          </Card>

          <Card sx={{ borderRadius: '12px', border: '1px solid #e0e0e0', mb: 3 }}>
            <Box sx={{ p: 2.5, borderBottom: '1px solid #e0e0e0' }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Qarzdor xaridlari
              </Typography>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Sana</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Mahsulotlar</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Jami</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Chek</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {debtorSales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 3, color: '#999' }}>
                        Qarzdor xaridlari yo`q
                      </TableCell>
                    </TableRow>
                  ) : (
                    debtorSales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>{new Date(sale.created_at).toLocaleString('uz-UZ')}</TableCell>
                        <TableCell>
                          {(sale.items || [])
                            .slice(0, 2)
                            .map((item) => item.product?.name || 'Mahsulot')
                            .join(', ') || '-'}
                          {(sale.items?.length || 0) > 2 ? ` +${(sale.items?.length || 0) - 2}` : ''}
                        </TableCell>
                        <TableCell align="right">
                          <Typography sx={{ fontWeight: 700, color: '#f57c00' }}>
                            {formatCurrency(sale.total_amount)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Button size="small" variant="text" onClick={() => printDebtorSaleReceipt(sale)}>
                            Chop etish
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>

          {/* Debt Entries */}
          <Card sx={{ borderRadius: '12px', border: '1px solid #e0e0e0' }}>
            <Box sx={{ p: 2.5, borderBottom: '1px solid #e0e0e0' }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Operatsiyalar tarixi
              </Typography>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Sana</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Turi</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      Summa
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Izoh</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {debtEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 3, color: '#999' }}>
                        Operatsiyalar yo`q
                      </TableCell>
                    </TableRow>
                  ) : (
                    debtEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          {new Date(entry.created_at).toLocaleDateString('uz-UZ')}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={entry.type === 'charge' ? 'Qarz yozuvi' : "To'lov"}
                            color={entry.type === 'charge' ? 'error' : 'success'}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            sx={{
                              fontWeight: 700,
                              color: entry.type === 'charge' ? '#f44336' : '#4caf50',
                            }}
                          >
                            {entry.type === 'charge' ? '+' : '-'}
                            {formatCurrency(entry.amount)}
                          </Typography>
                        </TableCell>
                        <TableCell>{entry.notes || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>

          {/* Back Button */}
          <Box sx={{ mt: 3 }}>
            <Button variant="outlined" onClick={() => setSelectedDebtor(null)}>
              Qarzdorlar ro`yxatiga qaytish
            </Button>
          </Box>
        </Box>
      )}

      {/* Payment Dialog */}
      <Dialog open={openPaymentDialog} onClose={() => setOpenPaymentDialog(false)} maxWidth="sm" fullWidth>
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            To`lovni qayd etish
          </Typography>

          <Box sx={{ backgroundColor: '#f5f5f5', p: 2, borderRadius: '8px', mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">Joriy qoldiq:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#ff9800' }}>
                {formatCurrency(selectedDebtor?.remaining_balance || 0)}
              </Typography>
            </Box>
          </Box>

          <form onSubmit={handleSubmit(handlePaymentSubmit)}>
            <Controller
              name="amount"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="To`lov summasi"
                  type="number"
                  inputProps={{ step: '0.01', min: '0' }}
                  margin="normal"
                  error={!!error}
                  helperText={error?.message}
                />
              )}
            />

            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Izoh (ixtiyoriy)"
                  margin="normal"
                  multiline
                  rows={2}
                />
              )}
            />

            <Box sx={{ display: 'flex', gap: 1, mt: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setPrintAfterPayment(false);
                  setOpenPaymentDialog(false);
                }}
              >
                Bekor qilish
              </Button>
              <Button
                fullWidth
                variant="outlined"
                type="submit"
                disabled={paymentLoading}
                startIcon={<Printer size={16} />}
                onClick={() => setPrintAfterPayment(true)}
              >
                {paymentLoading ? 'Bajarilmoqda...' : 'Saqlash va chop etish'}
              </Button>
              <Button
                fullWidth
                variant="contained"
                type="submit"
                disabled={paymentLoading}
                onClick={() => setPrintAfterPayment(false)}
              >
                {paymentLoading ? 'Bajarilmoqda...' : 'To`lovni saqlash'}
              </Button>
            </Box>
          </form>
        </Box>
      </Dialog>
    </AdminLayout>
  );
}
