'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  Grid,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  AlertCircle,
  ArrowRight,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  Package,
  Phone,
  Printer,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/AdminLayout';
import { getDebtorDueDate, getDebtorDueLabel, isDueSoonDebtor, sortDebtorsByUrgency } from '@/lib/debtors';
import { supabase } from '@/lib/supabase';
import { useAppSettingsStore } from '@/lib/store';

const CHART_COLORS = ['#1570ef', '#f97316', '#16a34a', '#ef4444'];
const DAILY_STOCK_THRESHOLD = 3;

interface DashboardStats {
  todaySales: number;
  totalRevenue: number;
  totalRecovered: number;
  totalProfit: number;
  totalProducts: number;
  totalCustomers: number;
  totalDebt: number;
  debtorsCount: number;
  lowStockItems: number;
  averageSale: number;
  creditSalesCount: number;
}

interface SalesTrendPoint {
  date: string;
  amount: number;
}

interface RecentSale {
  id: string;
  total_amount: number;
  payment_method: 'cash' | 'card' | 'credit';
  is_credit: boolean;
  created_at: string;
}

interface LowStockProduct {
  id: string;
  name: string;
  stock_quantity: number;
  minimum_stock: number;
  unit_type: string;
}

interface PriorityDebtor {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  total_debt_amount?: number;
  remaining_balance: number;
  due_date?: string | null;
  paid_amount?: number;
  last_transaction_date: string;
}

interface PaymentMixPoint {
  name: string;
  value: number;
}

const StatCard = ({
  title,
  value,
  helper,
  color,
  icon: Icon,
  loading,
}: {
  title: string;
  value: string | number;
  helper: string;
  color: string;
  icon: any;
  loading: boolean;
}) => {
  const theme = useTheme();

  return (
    <Card
      sx={{
        p: 2.5,
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          right: -22,
          top: -24,
          width: 92,
          height: 92,
          borderRadius: '50%',
          backgroundColor: alpha(color, 0.12),
        }}
      />
      <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'space-between', gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 0.75 }}>
            {title}
          </Typography>
          {loading ? (
            <Skeleton width="70%" height={36} />
          ) : (
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
              {value}
            </Typography>
          )}
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
            {helper}
          </Typography>
        </Box>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 3,
            backgroundColor: alpha(color, 0.14),
            color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={22} />
        </Box>
      </Box>
    </Card>
  );
};

export default function DashboardPage() {
  const router = useRouter();
  const theme = useTheme();
  const { currencyCode, storeName } = useAppSettingsStore((state) => ({
    currencyCode: state.currencyCode,
    storeName: state.storeName,
  }));
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<SalesTrendPoint[]>([]);
  const [paymentMix, setPaymentMix] = useState<PaymentMixPoint[]>([]);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [priorityDebtors, setPriorityDebtors] = useState<PriorityDebtor[]>([]);
  const [selectedDebtor, setSelectedDebtor] = useState<PriorityDebtor | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: currencyCode === 'UZS' ? 0 : 2,
    }).format(value);

  const formatQuantity = (value: number, unitType: string) => {
    const normalizedValue = Number(value || 0);
    const formattedValue = Number.isInteger(normalizedValue)
      ? String(normalizedValue)
      : normalizedValue.toFixed(2);

    return `${formattedValue} ${unitType}`;
  };

  const downloadTextFile = (filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportLowStockCsv = () => {
    if (lowStockProducts.length === 0) return;

    const todayLabel = new Date().toLocaleDateString('uz-UZ');
    const rows = [
      ['Sana', 'Mahsulot', 'Qoldiq', "O'lchov", 'Holat'],
      ...lowStockProducts.map((product) => [
        todayLabel,
        product.name,
        String(product.stock_quantity),
        product.unit_type,
        product.stock_quantity <= 0 ? 'Tugagan' : 'Kam qolgan',
      ]),
    ];

    const csvContent = `\uFEFF${rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n')}`;

    downloadTextFile(
      `kunlik-qoldiq-${new Date().toISOString().split('T')[0]}.csv`,
      csvContent,
      'text/csv;charset=utf-8;'
    );
  };

  const handleExportLowStockPdf = () => {
    if (lowStockProducts.length === 0) return;

    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const todayLabel = new Date().toLocaleDateString('uz-UZ');
    const tableRows = lowStockProducts
      .map(
        (product) => `
          <tr>
            <td>${escapeHtml(product.name)}</td>
            <td>${escapeHtml(formatQuantity(product.stock_quantity, product.unit_type))}</td>
            <td>${product.stock_quantity <= 0 ? 'Tugagan' : 'Kam qolgan'}</td>
          </tr>
        `
      )
      .join('');

    const printWindow = window.open('', '', 'height=760,width=980');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="uz">
        <head>
          <meta charset="UTF-8" />
          <title>${escapeHtml(storeName)} Kunlik qoldiq ro'yxati</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 32px; color: #111827; }
            h1 { margin: 0 0 8px; font-size: 24px; }
            p { margin: 0 0 20px; color: #4b5563; }
            table { width: 100%; border-collapse: collapse; margin-top: 18px; }
            th, td { border: 1px solid #d1d5db; padding: 10px 12px; text-align: left; }
            th { background: #f3f4f6; }
            .meta { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
            .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #fee2e2; color: #b91c1c; font-size: 12px; font-weight: 700; }
            @media print { body { margin: 18px; } }
          </style>
        </head>
        <body>
          <div class="meta">
            <div>
              <h1>${escapeHtml(storeName)} - Kunlik qoldiq ro'yxati</h1>
              <p>${todayLabel} holatiga ko'ra tugagan yoki ${DAILY_STOCK_THRESHOLD} ta va undan kam qolgan mahsulotlar.</p>
            </div>
            <div class="badge">${lowStockProducts.length} ta mahsulot</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Mahsulot</th>
                <th>Qoldiq</th>
                <th>Holat</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const today = new Date().toISOString().split('T')[0];
      const [
        todaySalesResult,
        allSalesResult,
        productCountResult,
        customerResult,
        debtorsResult,
        productsResult,
        saleItemsResult,
        salesTrendResult,
        recentSalesResult,
      ] = await Promise.all([
        supabase
          .from('sales_history')
          .select('total_amount')
          .gte('created_at', `${today}T00:00:00`)
          .lte('created_at', `${today}T23:59:59`),
        supabase.from('sales_history').select('id, total_amount, discount_amount, payment_method, is_credit'),
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('customers').select('id'),
        supabase
          .from('debtors')
          .select('id, first_name, last_name, phone, total_debt_amount, remaining_balance, paid_amount, due_date, status, last_transaction_date'),
        supabase.from('products').select('id, name, stock_quantity, minimum_stock, unit_type'),
        supabase.from('sale_items').select('quantity, total_price, unit_price'),
        supabase
          .from('sales_history')
          .select('created_at, total_amount')
          .order('created_at', { ascending: true })
          .limit(30),
        supabase
          .from('sales_history')
          .select('id, total_amount, payment_method, is_credit, created_at')
          .order('created_at', { ascending: false })
          .limit(6),
      ]);

      const todaySales =
        todaySalesResult.data?.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0) || 0;
      const allSales = allSalesResult.data || [];
      const totalRevenue =
        allSales.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0) || 0;
      const averageSale = allSales.length > 0 ? totalRevenue / allSales.length : 0;
      const creditSalesCount = allSales.filter((sale) => sale.is_credit).length;
      const customerCount = customerResult.data?.length || 0;

      const activeDebts = (debtorsResult.data || []).filter(
        (debtor) => debtor.status !== 'cleared' && Number(debtor.remaining_balance) > 0
      );
      const totalRecovered =
        (debtorsResult.data || []).reduce((sum, debtor) => sum + Number(debtor.paid_amount || 0), 0) || 0;
      const totalDebt =
        activeDebts.reduce((sum, debtor) => sum + Number(debtor.remaining_balance || 0), 0) || 0;

      const allProducts = (productsResult.data || []).map((product) => ({
        ...product,
        stock_quantity: Number(product.stock_quantity || 0),
        minimum_stock: Number(product.minimum_stock || 0),
      }));

      const lowStock = allProducts
        .filter((product) => product.stock_quantity <= DAILY_STOCK_THRESHOLD)
        .sort((a, b) => a.stock_quantity - b.stock_quantity);

      const profitByItem =
        saleItemsResult.data?.map((item: any) => ({
          revenue: Number(item.total_price || 0),
          cost: Number(item.quantity || 0) * (Number(item.unit_price || 0) * 0.6),
        })) || [];

      const totalProfit =
        profitByItem.reduce((sum, item) => sum + (item.revenue - item.cost), 0) || 0;

      const paymentMixMap = allSales.reduce<Record<string, number>>((acc, sale) => {
        acc[sale.payment_method] = (acc[sale.payment_method] || 0) + Number(sale.total_amount || 0);
        return acc;
      }, {});

      setPaymentMix(
        Object.entries(paymentMixMap).map(([name, value]) => ({
          name: name.toUpperCase(),
          value,
        }))
      );

      setSalesData(groupSalesByDate(salesTrendResult.data || []));
      setRecentSales((recentSalesResult.data || []).map((sale) => ({
        ...sale,
        total_amount: Number(sale.total_amount || 0),
      })));
      setLowStockProducts(lowStock.slice(0, 6));
      setPriorityDebtors(
        sortDebtorsByUrgency(
          activeDebts.map((debtor) => ({
            ...debtor,
            phone: debtor.phone || null,
            total_debt_amount: Number(debtor.total_debt_amount || 0),
            remaining_balance: Number(debtor.remaining_balance || 0),
            paid_amount: Number(debtor.paid_amount || 0),
          }))
        ).slice(0, 5)
      );

      setStats({
        todaySales,
        totalRevenue,
        totalRecovered,
        totalProfit: Math.max(0, totalProfit),
        totalProducts: productCountResult.count || 0,
        totalCustomers: customerCount,
        totalDebt,
        debtorsCount: activeDebts.length,
        lowStockItems: lowStock.length,
        averageSale,
        creditSalesCount,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupSalesByDate = (sales: Array<{ created_at: string; total_amount: number }>) => {
    const grouped: Record<string, number> = {};

    sales.forEach((sale) => {
      const date = new Date(sale.created_at).toLocaleDateString('uz-UZ', {
        month: 'short',
        day: 'numeric',
      });
      grouped[date] = (grouped[date] || 0) + Number(sale.total_amount || 0);
    });

    return Object.entries(grouped).map(([date, amount]) => ({
      date,
      amount: Number(amount.toFixed(2)),
    }));
  };

  return (
    <AdminLayout>
      {priorityDebtors.filter(isDueSoonDebtor).length > 0 && (
        <Card
          sx={{
            mb: 3,
            p: 2.5,
            borderRadius: 4,
            border: '1px solid rgba(239, 68, 68, 0.24)',
            background: 'linear-gradient(135deg, rgba(254, 226, 226, 0.95) 0%, rgba(255, 241, 242, 0.98) 100%)',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 1.5 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#b91c1c', mb: 0.5 }}>
                Shoshilinch qarzdorlar
              </Typography>
              <Typography variant="body2" sx={{ color: '#7f1d1d' }}>
                Muddati yaqinlashgan qarzdorlar darhol kuzatilsin.
              </Typography>
            </Box>
            <Chip
              color="error"
              label={`${priorityDebtors.filter(isDueSoonDebtor).length} ta ogohlantirish`}
            />
          </Box>

          <Box sx={{ display: 'grid', gap: 1.25 }}>
            {priorityDebtors
              .filter(isDueSoonDebtor)
              .slice(0, 3)
              .map((debtor) => (
                <Box
                  key={`dashboard-due-${debtor.id}`}
                  sx={{
                    p: 1.5,
                    borderRadius: 3,
                    backgroundColor: 'rgba(255, 255, 255, 0.88)',
                    border: '1px solid rgba(248, 113, 113, 0.34)',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {debtor.first_name} {debtor.last_name}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: '#b91c1c' }}>
                      {formatCurrency(debtor.remaining_balance)}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: '#991b1b' }}>
                    {getDebtorDueLabel(debtor)} - {getDebtorDueDate(debtor)?.toLocaleDateString('uz-UZ') || '-'}
                  </Typography>
                </Box>
              ))}
          </Box>
        </Card>
      )}

      <Card
        sx={{
          mb: 3,
          p: { xs: 2.5, md: 3.5 },
          position: 'relative',
          overflow: 'hidden',
          background:
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(108, 180, 255, 0.18) 0%, rgba(249, 115, 22, 0.12) 100%)'
              : 'linear-gradient(135deg, rgba(21, 112, 239, 0.12) 0%, rgba(249, 115, 22, 0.08) 100%)',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            right: -40,
            top: -10,
            width: 180,
            height: 180,
            borderRadius: '50%',
            backgroundColor: alpha(theme.palette.primary.main, 0.12),
          }}
        />
        <Grid container spacing={3} alignItems="center" sx={{ position: 'relative' }}>
          <Grid item xs={12} md={8}>
            <Chip label="Jonli panel" color="primary" sx={{ mb: 1.5 }} />
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
              {storeName} holat ko`rinishi
            </Typography>
            <Typography variant="body1" sx={{ color: theme.palette.text.secondary, maxWidth: 720 }}>
              Sotuvlar, qarzdorlar, stock va checkout oqimi bo`yicha asosiy signal shu yerda jamlangan.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
              <Chip
                icon={<DollarSign size={14} />}
                label={loading ? "O'rtacha savdo yuklanmoqda..." : `O'rtacha savdo ${formatCurrency(stats?.averageSale || 0)}`}
                variant="outlined"
              />
              <Chip
                icon={<CreditCard size={14} />}
                label={loading ? 'Nasiya savdo yuklanmoqda...' : `${stats?.creditSalesCount || 0} ta nasiya savdo`}
                variant="outlined"
              />
              <Chip
                icon={<AlertCircle size={14} />}
                label={loading ? 'Kunlik qoldiq yuklanmoqda...' : `Kunlik qoldiq: ${stats?.lowStockItems || 0} ta`}
                variant="outlined"
              />
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'grid', gap: 1.25 }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<ShoppingCart size={18} />}
                endIcon={<ArrowRight size={16} />}
                onClick={() => router.push('/pos')}
                sx={{ justifyContent: 'space-between' }}
              >
                Yangi savdoni boshlash
              </Button>
              <Button
                variant="outlined"
                startIcon={<Package size={18} />}
                endIcon={<ArrowRight size={16} />}
                onClick={() => router.push('/products')}
                sx={{ justifyContent: 'space-between' }}
              >
                Omborni yangilash
              </Button>
              <Button
                variant="outlined"
                color="warning"
                startIcon={<Users size={18} />}
                endIcon={<ArrowRight size={16} />}
                onClick={() => router.push('/settings')}
                sx={{ justifyContent: 'space-between' }}
              >
                Sozlamalarni ochish
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Card>

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Bugungi savdo"
            value={loading ? '...' : formatCurrency(stats?.todaySales || 0)}
            helper="Bugungi umumiy savdo summasi"
            color="#16a34a"
            icon={DollarSign}
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Umumiy savdo"
            value={loading ? '...' : formatCurrency(stats?.totalRevenue || 0)}
            helper="Yakunlangan barcha savdolar"
            color="#1570ef"
            icon={TrendingUp}
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Qarzdan qaytgan"
            value={loading ? '...' : formatCurrency(stats?.totalRecovered || 0)}
            helper="Qarzdorlar qaytargan jami summa"
            color="#16a34a"
            icon={CreditCard}
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Qoldiq qarz"
            value={loading ? '...' : formatCurrency(stats?.totalDebt || 0)}
            helper="Qarzdorlar bo`yicha qolgan balans"
            color="#ef4444"
            icon={CreditCard}
            loading={loading}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} xl={8}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6">Savdo dinamikasi</Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                  So`nggi 30 kun natijasi
                </Typography>
              </Box>
              <Chip label={loading ? 'Yuklanmoqda...' : `${salesData.length} nuqta`} variant="outlined" />
            </Box>

            {loading ? (
              <Skeleton height={320} />
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.7)} />
                  <XAxis dataKey="date" stroke={theme.palette.text.secondary} />
                  <YAxis stroke={theme.palette.text.secondary} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: alpha(theme.palette.background.paper, 0.96),
                      border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                      borderRadius: '16px',
                      color: theme.palette.text.primary,
                    }}
                    formatter={(value) => formatCurrency(value as number)}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke={theme.palette.primary.main}
                    strokeWidth={3}
                    dot={{ fill: theme.palette.primary.main, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Grid>

        <Grid item xs={12} xl={4}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6">To`lov taqsimoti</Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                  Tushumning to`lov turlari bo`yicha taqsimoti
                </Typography>
              </Box>
              <Chip label={loading ? '...' : `${paymentMix.length} tur`} variant="outlined" />
            </Box>

            {loading ? (
              <Skeleton height={320} />
            ) : (
              <Box sx={{ display: 'grid', gap: 1.5 }}>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={paymentMix}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={52}
                      outerRadius={86}
                      paddingAngle={3}
                    >
                      {paymentMix.map((entry, index) => (
                        <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(value as number)}
                      contentStyle={{
                        backgroundColor: alpha(theme.palette.background.paper, 0.96),
                        border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                        borderRadius: '16px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {paymentMix.map((entry, index) => (
                  <Box
                    key={entry.name}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1.25,
                      borderRadius: 3,
                      backgroundColor: alpha(theme.palette.background.default, 0.4),
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                        }}
                      />
                      <Typography variant="body2">{entry.name}</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {formatCurrency(entry.value)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={4}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 1.5,
                alignItems: 'flex-start',
                mb: 2,
                flexWrap: 'wrap',
              }}
            >
              <Box>
                <Typography variant="h6" sx={{ mb: 0.5 }}>
                  Kunlik qoldiq ro`yxati
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                  Tugagan yoki {DAILY_STOCK_THRESHOLD} ta va undan kam qolgan mahsulotlar
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Download size={16} />}
                  onClick={handleExportLowStockCsv}
                  disabled={loading || lowStockProducts.length === 0}
                >
                  CSV
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Printer size={16} />}
                  onClick={handleExportLowStockPdf}
                  disabled={loading || lowStockProducts.length === 0}
                >
                  PDF
                </Button>
              </Box>
            </Box>
            {loading ? (
              <Skeleton height={260} />
            ) : lowStockProducts.length === 0 ? (
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                Hozircha tugagan yoki kritik qoldiqdagi mahsulot yo`q.
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Mahsulot</TableCell>
                      <TableCell>Holat</TableCell>
                      <TableCell align="right">Qoldiq</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lowStockProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {product.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                            O`lchov: {product.unit_type}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            color={product.stock_quantity <= 0 ? 'error' : 'warning'}
                            label={product.stock_quantity <= 0 ? 'Tugagan' : 'Kam qolgan'}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            color={product.stock_quantity <= 0 ? 'error' : 'warning'}
                            label={formatQuantity(product.stock_quantity, product.unit_type)}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              Muhim qarzdorlar
            </Typography>
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 2 }}>
              Ism, telefon va qarz tafsiloti shu yerda
            </Typography>
            {loading ? (
              <Skeleton height={260} />
            ) : priorityDebtors.length === 0 ? (
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                Faol qarzdor topilmadi.
              </Typography>
            ) : (
              <Box sx={{ display: 'grid', gap: 1.25 }}>
                {priorityDebtors.map((debtor) => (
                  <Box
                    key={debtor.id}
                    onClick={() => setSelectedDebtor(debtor)}
                    sx={{
                      p: 1.5,
                      borderRadius: 3,
                      border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                      backgroundColor: alpha(theme.palette.background.default, 0.4),
                      cursor: 'pointer',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {debtor.first_name} {debtor.last_name}
                        </Typography>
                        {debtor.phone ? (
                          <Typography
                            component="a"
                            href={`tel:${debtor.phone}`}
                            onClick={(event) => event.stopPropagation()}
                            variant="caption"
                            sx={{
                              color: theme.palette.primary.main,
                              textDecoration: 'none',
                            }}
                          >
                            {debtor.phone}
                          </Typography>
                        ) : (
                          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                            Telefon yo`q
                          </Typography>
                        )}
                      </Box>
                      <Chip
                        size="small"
                        variant="outlined"
                        color="error"
                        label={formatCurrency(debtor.remaining_balance)}
                      />
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        color: isDueSoonDebtor(debtor) ? theme.palette.error.main : theme.palette.text.secondary,
                        fontWeight: isDueSoonDebtor(debtor) ? 700 : 400,
                      }}
                    >
                      {getDebtorDueLabel(debtor)} - {getDebtorDueDate(debtor)?.toLocaleDateString('uz-UZ') || '-'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1.25, flexWrap: 'wrap' }}>
                      <Chip size="small" icon={<Eye size={12} />} label="Tafsilotni ochish" variant="outlined" />
                      {debtor.phone && (
                        <Chip size="small" icon={<Phone size={12} />} label="Qo`ng`iroq qilish" color="success" variant="outlined" />
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              So`nggi savdolar
            </Typography>
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 2 }}>
              Oxirgi checkout faoliyati
            </Typography>
            {loading ? (
              <Skeleton height={260} />
            ) : recentSales.length === 0 ? (
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                So`nggi savdolar topilmadi.
              </Typography>
            ) : (
              <Box sx={{ display: 'grid', gap: 1.25 }}>
                {recentSales.map((sale) => (
                  <Box
                    key={sale.id}
                    sx={{
                      p: 1.5,
                      borderRadius: 3,
                      border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                      backgroundColor: alpha(theme.palette.background.default, 0.4),
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {formatCurrency(sale.total_amount)}
                      </Typography>
                      <Chip
                        label={
                          sale.payment_method === 'cash'
                            ? 'Naqd'
                            : sale.payment_method === 'card'
                              ? 'Karta'
                              : 'Nasiya'
                        }
                        size="small"
                        color={sale.is_credit ? 'warning' : 'primary'}
                        variant="outlined"
                      />
                    </Box>
                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                      {new Date(sale.created_at).toLocaleString('uz-UZ')}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Card>
        </Grid>
      </Grid>

      <Dialog open={Boolean(selectedDebtor)} onClose={() => setSelectedDebtor(null)} maxWidth="xs" fullWidth>
        {selectedDebtor && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
              {selectedDebtor.first_name} {selectedDebtor.last_name}
            </Typography>
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 2 }}>
              {selectedDebtor.phone ? (
                <Box
                  component="a"
                  href={`tel:${selectedDebtor.phone}`}
                  sx={{
                    color: theme.palette.primary.main,
                    textDecoration: 'none',
                  }}
                >
                  {selectedDebtor.phone}
                </Box>
              ) : (
                'Telefon raqami kiritilmagan'
              )}
            </Typography>

            <Box sx={{ display: 'grid', gap: 1.25, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                  Jami qarz
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {formatCurrency(selectedDebtor.total_debt_amount || selectedDebtor.remaining_balance)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                  To`langan
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: theme.palette.success.main }}>
                  {formatCurrency(selectedDebtor.paid_amount || 0)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                  Qoldiq
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, color: theme.palette.error.main }}>
                  {formatCurrency(selectedDebtor.remaining_balance)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                  Muddat
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {getDebtorDueDate(selectedDebtor)?.toLocaleDateString('uz-UZ') || '-'}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => setSelectedDebtor(null)}
              >
                Yopish
              </Button>
              <Button
                fullWidth
                variant="contained"
                color="success"
                startIcon={<Phone size={16} />}
                component={selectedDebtor.phone ? 'a' : 'button'}
                href={selectedDebtor.phone ? `tel:${selectedDebtor.phone}` : undefined}
                disabled={!selectedDebtor.phone}
              >
                Qo`ng`iroq qilish
              </Button>
            </Box>
          </Box>
        )}
      </Dialog>
    </AdminLayout>
  );
}
