'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  TextField,
  Typography,
  Chip,
  Button,
  Dialog,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  MenuItem,
  Grid,
} from '@mui/material';
import { ArrowRight, CreditCard, Eye, Printer } from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { buildReceiptHtml, openPrintWindow } from '@/lib/receipt';
import { uzDataGridLocaleText } from '@/lib/data-grid-locale';
import { supabase, SaleHistory, SaleItem, Product, Customer, Debtor } from '@/lib/supabase';
import { useAppSettingsStore } from '@/lib/store';
import { GridColDef, DataGrid } from '@mui/x-data-grid';
import { useRouter } from 'next/navigation';

interface SaleItemWithProduct extends SaleItem {
  product?: Pick<Product, 'id' | 'name' | 'unit_type'> | null;
}

interface SaleWithDetails extends SaleHistory {
  customer?: Customer | null;
  debtor?: Debtor | null;
  items?: SaleItemWithProduct[];
}

export default function SalesPage() {
  const router = useRouter();
  const [sales, setSales] = useState<SaleWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<SaleWithDetails | null>(null);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const { currencyCode, storeName, receiptFooter } = useAppSettingsStore((state) => ({
    currencyCode: state.currencyCode,
    storeName: state.storeName,
    receiptFooter: state.receiptFooter,
  }));

  useEffect(() => {
    fetchSales();
  }, [filterPaymentMethod, filterDateFrom, filterDateTo]);

  const getSalePartyName = (sale: SaleWithDetails) => {
    if (sale.debtor) {
      return `${sale.debtor.first_name} ${sale.debtor.last_name}`;
    }

    if (sale.customer) {
      return `${sale.customer.first_name} ${sale.customer.last_name}`;
    }

    return 'Oddiy mijoz';
  };

  const formatQuantity = (quantity: number, unitType?: string | null) => {
    const formatted = Number.isInteger(quantity) ? quantity.toString() : quantity.toFixed(2);
    const unitLabels: Record<string, string> = {
      piece: 'dona',
      kg: 'kg',
      liter: 'litr',
      pack: 'paket',
      box: 'quti',
      dozen: "o'nlik",
    };
    return unitType && unitType !== 'piece' ? `${formatted} ${unitLabels[unitType] || unitType}` : formatted;
  };

  const fetchSales = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('sales_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterDateFrom) {
        query = query.gte('created_at', `${filterDateFrom}T00:00:00`);
      }

      if (filterDateTo) {
        query = query.lte('created_at', `${filterDateTo}T23:59:59`);
      }

      const { data: salesData } = await query;

      if (!salesData) {
        setSales([]);
        return;
      }

      // Fetch related data
      const salesWithDetails = await Promise.all(
        salesData.map(async (sale) => {
          let customer = null;
          let debtor = null;

          if (sale.customer_id) {
            const { data: cust } = await supabase
              .from('customers')
              .select('*')
              .eq('id', sale.customer_id)
              .single();
            customer = cust;
          }

          if (sale.debtor_id) {
            const { data: debtorData } = await supabase
              .from('debtors')
              .select('*')
              .eq('id', sale.debtor_id)
              .single();
            debtor = debtorData;
          }

          const { data: items } = await supabase
            .from('sale_items')
            .select('*, product:products(id, name, unit_type)')
            .eq('sale_id', sale.id);

          return {
            ...sale,
            customer,
            debtor,
            items: items || [],
          };
        })
      );

      setSales(salesWithDetails);
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (sale: SaleWithDetails) => {
    setSelectedSale(sale);
    setOpenDetailsDialog(true);
  };

  const handlePrint = (sale: SaleWithDetails) => {
    const receiptHTML = buildReceiptHtml({
      documentTitle: `${storeName} Chek`,
      storeName,
      title: sale.is_credit ? 'Nasiya savdo cheki' : 'Savdo cheki',
      subtitle: new Date(sale.created_at).toLocaleString('uz-UZ'),
      footer: receiptFooter,
      accentColor: sale.is_credit ? '#f97316' : sale.payment_method === 'card' ? '#1570ef' : '#16a34a',
      sections: [
        {
          title: 'Operatsiya',
          fields: [
            { label: 'Mijoz', value: getSalePartyName(sale) },
            {
              label: "To'lov",
              value:
                sale.payment_method === 'cash'
                  ? 'Naqd'
                  : sale.payment_method === 'card'
                    ? 'Karta'
                    : 'Nasiya',
            },
            { label: 'Turi', value: sale.is_credit ? 'Nasiya' : 'Oddiy savdo' },
          ],
        },
        {
          title: 'Mahsulotlar',
          lineItems:
            sale.items?.map((item) => ({
              name: item.product?.name || 'Mahsulot',
              meta: item.product?.unit_type ? `O'lchov: ${item.product.unit_type}` : undefined,
              quantity: formatQuantity(item.quantity, item.product?.unit_type),
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

    openPrintWindow(`${storeName} Chek`, receiptHTML);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: currencyCode === 'UZS' ? 0 : 2,
      maximumFractionDigits: currencyCode === 'UZS' ? 0 : 2,
    }).format(value);
  };

  const standardSales = sales.filter((sale) => {
    if (sale.is_credit || sale.payment_method === 'credit') {
      return false;
    }

    if (!filterPaymentMethod) {
      return true;
    }

    return sale.payment_method === filterPaymentMethod;
  });

  const creditSales = sales.filter(
    (sale) => sale.is_credit || sale.payment_method === 'credit'
  );

  const standardSalesTotal = standardSales.reduce(
    (sum, sale) => sum + Number(sale.total_amount || 0),
    0
  );
  const creditSalesTotal = creditSales.reduce(
    (sum, sale) => sum + Number(sale.total_amount || 0),
    0
  );

  const columns: GridColDef[] = [
    {
      field: 'created_at',
      headerName: 'Sana',
      flex: 1,
      minWidth: 150,
      renderCell: (params) => new Date(params.value).toLocaleString('uz-UZ'),
    },
    {
      field: 'party',
      headerName: 'Mijoz',
      flex: 1,
      minWidth: 150,
      renderCell: (params) => {
        const sale = standardSales.find((s) => s.id === params.row.id);
        return sale ? getSalePartyName(sale) : 'Oddiy mijoz';
      },
    },
    {
      field: 'total_amount',
      headerName: 'Summa',
      flex: 1,
      minWidth: 120,
      renderCell: (params) => (
        <Typography sx={{ fontWeight: 700, color: '#1976d2' }}>
          {formatCurrency(params.value)}
        </Typography>
      ),
    },
    {
      field: 'payment_method',
      headerName: "To'lov",
      flex: 1,
      minWidth: 100,
      renderCell: (params) => (
        <Chip
          label={
            params.value === 'cash'
              ? 'Naqd'
              : params.value === 'card'
                ? 'Karta'
                : 'Nasiya'
          }
          size="small"
          color={params.value === 'cash' ? 'success' : 'primary'}
          variant="outlined"
        />
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Amallar',
      width: 100,
      getActions: (params) => {
        const sale = standardSales.find((s) => s.id === params.row.id);
        return [
          <Typography
            key={`view-${params.id}`}
            onClick={() => sale && handleViewDetails(sale)}
            sx={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              color: '#1976d2',
              fontSize: '14px',
            }}
          >
            <Eye size={16} />
            Ko`rish
          </Typography>,
          <Typography
            key={`print-${params.id}`}
            onClick={() => sale && handlePrint(sale)}
            sx={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              color: '#666',
              fontSize: '14px',
            }}
          >
            <Printer size={16} />
            Chop etish
          </Typography>,
        ];
      },
    },
  ];

  return (
    <AdminLayout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Savdo tarixi
        </Typography>
        <Typography variant="body2" sx={{ color: '#666' }}>
          Naqd va karta savdolari asosiy jadvalda. Nasiya savdolar yuqorida alohida ko`rsatiladi.
        </Typography>
      </Box>

      <Card sx={{ p: 2.5, borderRadius: '12px', border: '1px solid #e0e0e0', mb: 3 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 2,
            alignItems: 'flex-start',
            mb: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
              <CreditCard size={18} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Nasiya savdolar
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: '#666' }}>
              Nasiya savdolar alohida ko`rsatiladi va qarzdorlarga bog`lanadi.
            </Typography>
          </Box>

          <Button
            variant="outlined"
            onClick={() => router.push('/debtors')}
            endIcon={<ArrowRight size={16} />}
          >
            Qarzdorlarni ochish
          </Button>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <Chip label={`Nasiya savdo: ${creditSales.length}`} color="warning" variant="outlined" />
          <Chip label={`Jami nasiya: ${formatCurrency(creditSalesTotal)}`} color="error" variant="outlined" />
        </Box>

        {loading ? (
          <Typography variant="body2" sx={{ color: '#666' }}>
            Nasiya savdolar yuklanmoqda...
          </Typography>
        ) : creditSales.length === 0 ? (
          <Typography variant="body2" sx={{ color: '#666' }}>
            Tanlangan sana oralig`ida nasiya savdo topilmadi.
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Sana</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Qarzdor</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>To`lov</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Summa</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Amallar</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {creditSales.slice(0, 6).map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>{new Date(sale.created_at).toLocaleString('uz-UZ')}</TableCell>
                    <TableCell>{getSalePartyName(sale)}</TableCell>
                    <TableCell>
                      <Chip
                        label={
                          sale.payment_method === 'cash'
                            ? 'Naqd'
                            : sale.payment_method === 'card'
                              ? 'Karta'
                              : 'Nasiya'
                        }
                        size="small"
                        color="warning"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography sx={{ fontWeight: 700, color: '#f57c00' }}>
                        {formatCurrency(sale.total_amount)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'inline-flex', gap: 1 }}>
                        <Button size="small" variant="text" onClick={() => handleViewDetails(sale)}>
                          Ko`rish
                        </Button>
                        <Button size="small" variant="text" onClick={() => handlePrint(sale)}>
                          Chop etish
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Filters */}
      <Card sx={{ p: 2.5, borderRadius: '12px', border: '1px solid #e0e0e0', mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Boshlanish sanasi"
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Tugash sanasi"
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              select
              label="Asosiy savdo to`lovi"
              value={filterPaymentMethod}
              onChange={(e) => setFilterPaymentMethod(e.target.value)}
              size="small"
            >
              <MenuItem value="">Naqd + karta</MenuItem>
              <MenuItem value="cash">Naqd</MenuItem>
              <MenuItem value="card">Karta</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex', alignItems: 'flex-end' }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => {
                setFilterDateFrom('');
                setFilterDateTo('');
                setFilterPaymentMethod('');
              }}
            >
              Filtrlarni tozalash
            </Button>
          </Grid>
        </Grid>
      </Card>

      <Card sx={{ p: 2.5, borderRadius: '12px', border: '1px solid #e0e0e0', mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Asosiy savdolar
            </Typography>
            <Typography variant="body2" sx={{ color: '#666' }}>
              Faqat naqd va karta savdolari
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip label={`Savdo: ${standardSales.length}`} color="primary" variant="outlined" />
            <Chip label={`Jami: ${formatCurrency(standardSalesTotal)}`} color="success" variant="outlined" />
          </Box>
        </Box>
      </Card>

      {/* Sales Table */}
      <Box
        sx={{
          height: 600,
          backgroundColor: '#fff',
          borderRadius: '12px',
          border: '1px solid #e0e0e0',
        }}
      >
        <DataGrid
          rows={standardSales}
          columns={columns}
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
          disableRowSelectionOnClick
          loading={loading}
          localeText={uzDataGridLocaleText}
        />
      </Box>

      {/* Details Dialog */}
      <Dialog
        open={openDetailsDialog}
        onClose={() => setOpenDetailsDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        {selectedSale && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Savdo tafsilotlari
            </Typography>

            <Box
              sx={{
                backgroundColor: '#f5f5f5',
                p: 2,
                borderRadius: '8px',
                mb: 2,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  mb: 1,
                }}
              >
                <Typography variant="body2">Sana:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {new Date(selectedSale.created_at).toLocaleString('uz-UZ')}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  mb: 1,
                }}
              >
                <Typography variant="body2">Mijoz:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {getSalePartyName(selectedSale)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">To`lov turi:</Typography>
                <Chip
                  label={
                    selectedSale.payment_method === 'cash'
                      ? 'Naqd'
                      : selectedSale.payment_method === 'card'
                        ? 'Karta'
                        : 'Nasiya'
                  }
                  size="small"
                />
              </Box>
            </Box>

            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Mahsulotlar
            </Typography>

            <TableContainer sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Mahsulot</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      Soni
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      Narx
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedSale.items?.map((item, index) => (
                      <TableRow key={index}>
                      <TableCell>{item.product?.name || `Mahsulot #${index + 1}`}</TableCell>
                      <TableCell align="right">
                        {formatQuantity(item.quantity, item.product?.unit_type)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(item.total_price)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ backgroundColor: '#f5f5f5', p: 2, borderRadius: '8px', mb: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  mb: 1,
                }}
              >
                <Typography variant="body2">Oraliq jami:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {formatCurrency(
                    selectedSale.total_amount + selectedSale.discount_amount
                  )}
                </Typography>
              </Box>
              {selectedSale.discount_amount > 0 && (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mb: 1,
                  }}
                >
                  <Typography variant="body2">Chegirma:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#4caf50' }}>
                    -{formatCurrency(selectedSale.discount_amount)}
                  </Typography>
                </Box>
              )}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  pt: 1,
                  borderTop: '1px solid #e0e0e0',
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Jami:
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700, color: '#1976d2', fontSize: '16px' }}
                >
                  {formatCurrency(selectedSale.total_amount)}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  selectedSale && handlePrint(selectedSale);
                  setOpenDetailsDialog(false);
                }}
                startIcon={<Printer size={18} />}
              >
                Chekni chop etish
              </Button>
              <Button
                fullWidth
                variant="contained"
                onClick={() => setOpenDetailsDialog(false)}
              >
                Yopish
              </Button>
            </Box>
          </Box>
        )}
      </Dialog>
    </AdminLayout>
  );
}
