'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  Grid,
  IconButton,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Camera, DollarSign, Minus, Plus, ShoppingCart, Trash2, X } from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { BarcodeScannerDialog } from '@/components/BarcodeScannerDialog';
import { findByBarcode } from '@/lib/barcode';
import {
  getDebtorDueDateInput,
  getDefaultDebtDueDateInput,
  isMissingDueDateColumnError,
  resolveDueDateForSave,
} from '@/lib/debtors';
import { buildReceiptHtml, openPrintWindow } from '@/lib/receipt';
import { formatSupabaseError } from '@/lib/supabase-errors';
import { supabase, Debtor, Product } from '@/lib/supabase';
import { useAppSettingsStore, useCartStore } from '@/lib/store';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

type OnlineProductCandidate = {
  name: string;
  barcode: string;
  imageUrl: string | null;
  brand: string | null;
};

const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const isWeightedUnit = (unitType: string) => unitType === 'kg' || unitType === 'liter';
const unitLabels: Record<string, string> = {
  piece: 'dona',
  kg: 'kg',
  liter: 'litr',
  pack: 'paket',
  box: 'quti',
  dozen: "o'nlik",
};
const paymentMethodLabels: Record<'cash' | 'card' | 'credit', string> = {
  cash: 'Naqd',
  card: 'Karta',
  credit: 'Nasiya',
};

const paymentSchema = z
  .object({
    paymentMethod: z.enum(['cash', 'card', 'credit']),
    debtorId: z.string().optional(),
    debtorFirstName: z.string().optional(),
    debtorLastName: z.string().optional(),
    debtorPhone: z.string().optional(),
    dueDate: z.string().optional(),
    discount: z.coerce.number().min(0).default(0),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.paymentMethod === 'credit') {
      if (!data.debtorId && !data.debtorFirstName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Ism kiritilishi shart',
          path: ['debtorFirstName'],
        });
      }

      if (!data.debtorId && !data.debtorLastName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Familiya kiritilishi shart',
          path: ['debtorLastName'],
        });
      }

      if (!data.debtorId && !data.debtorPhone?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Telefon raqami kiritilishi shart',
          path: ['debtorPhone'],
        });
      }

      if (!data.dueDate?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Qaytarish muddati kiritilishi shart',
          path: ['dueDate'],
        });
      }
    }
  });

type PaymentFormData = z.infer<typeof paymentSchema>;

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [openScannerDialog, setOpenScannerDialog] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [printAfterCheckout, setPrintAfterCheckout] = useState(false);
  const [weight, setWeight] = useState<number | null>(null);
  const [onlineLookupLoading, setOnlineLookupLoading] = useState(false);
  const [onlineProduct, setOnlineProduct] = useState<OnlineProductCandidate | null>(null);
  const [importingOnlineProduct, setImportingOnlineProduct] = useState(false);

  const barcodeRef = useRef<HTMLInputElement>(null);

  const { items, addItem, removeItem, clearCart, getTotal, getItemCount } = useCartStore();
  const {
    barcodeLookupEnabled,
    autoPrintReceipt,
    storeName,
    receiptFooter,
    currencyCode,
  } = useAppSettingsStore((state) => ({
    barcodeLookupEnabled: state.barcodeLookupEnabled,
    autoPrintReceipt: state.autoPrintReceipt,
    storeName: state.storeName,
    receiptFooter: state.receiptFooter,
    currencyCode: state.currencyCode,
  }));

  const {
    control,
    handleSubmit,
    reset: resetForm,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentMethod: 'cash',
      debtorId: '',
      debtorFirstName: '',
      debtorLastName: '',
      debtorPhone: '',
      dueDate: getDefaultDebtDueDateInput(),
      discount: 0,
      notes: '',
    },
  });

  const paymentMethod = watch('paymentMethod');
  const selectedDebtorId = watch('debtorId');
  const dueDate = watch('dueDate');
  const selectedDebtor =
    debtors.find((debtor) => debtor.id === selectedDebtorId) || null;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: currencyCode === 'UZS' ? 0 : 2,
    }).format(value);
  const formatUnitType = (value: string) => unitLabels[value] || value;
  const formatPaymentMethod = (value: PaymentFormData['paymentMethod']) => paymentMethodLabels[value];

  useEffect(() => {
    fetchProducts();
    fetchDebtors();
    barcodeRef.current?.focus();
  }, []);

  useEffect(() => {
    if (paymentMethod === 'credit' && !dueDate) {
      setValue('dueDate', getDefaultDebtDueDateInput());
    }
  }, [dueDate, paymentMethod, setValue]);

  const fetchProducts = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const fetchDebtors = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('debtors')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setDebtors(data || []);
    } catch (err) {
      console.error('Error fetching debtors:', err);
    }
  };

  const handleProductFound = (product: Product) => {
    setError('');
    setOnlineProduct(null);
    setSelectedProduct(product);
    setBarcodeInput('');
    setQuantity(1);
    setWeight(null);
  };

  const printReceipt = ({
    saleDate,
    paymentMethod,
    totalAmount,
    discountAmount,
    customerLabel,
    cartLines,
  }: {
    saleDate: string;
    paymentMethod: PaymentFormData['paymentMethod'];
    totalAmount: number;
    discountAmount: number;
    customerLabel: string;
    cartLines: Array<{
      product: Product;
      soldQuantity: number;
      totalPrice: number;
    }>;
  }) => {
    const receiptHTML = buildReceiptHtml({
      documentTitle: `${storeName} Chek`,
      storeName,
      title: paymentMethod === 'credit' ? 'Nasiya savdo cheki' : 'Savdo cheki',
      subtitle: new Date(saleDate).toLocaleString('uz-UZ'),
      footer: receiptFooter,
      accentColor: paymentMethod === 'credit' ? '#f97316' : paymentMethod === 'card' ? '#1570ef' : '#16a34a',
      sections: [
        {
          title: 'Operatsiya',
          fields: [
            { label: 'Mijoz', value: customerLabel },
            { label: "To'lov", value: formatPaymentMethod(paymentMethod) },
          ],
        },
        {
          title: 'Mahsulotlar',
          lineItems: cartLines.map((item) => ({
            name: item.product.name,
            meta:
              item.product.unit_type !== 'piece'
                ? `O'lchov: ${formatUnitType(item.product.unit_type)}`
                : undefined,
            quantity: String(item.soldQuantity),
            total: formatCurrency(item.totalPrice),
          })),
        },
        {
          title: 'Yakun',
          fields: [
            { label: 'Chegirma', value: formatCurrency(discountAmount) },
            { label: 'Jami', value: formatCurrency(totalAmount), emphasize: true },
          ],
        },
      ],
    });

    openPrintWindow(`${storeName} Chek`, receiptHTML);
  };

  const lookupProductByBarcode = async (barcode: string) => {
    const trimmedBarcode = barcode.trim();
    if (!trimmedBarcode) return;

    const localProduct = findByBarcode(products, trimmedBarcode);
    if (localProduct) {
      handleProductFound(localProduct);
      return;
    }

    if (!barcodeLookupEnabled) {
      setError(`"${trimmedBarcode}" barcode bo'yicha lokal mahsulot topilmadi`);
      setBarcodeInput('');
      return;
    }

    setSelectedProduct(null);
    setOnlineProduct(null);
    setOnlineLookupLoading(true);
    setError('');

    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(trimmedBarcode)}.json`
      );

      if (!response.ok) {
        throw new Error('Onlayn barcode qidiruvi ishlamadi');
      }

      const payload = await response.json();
      const productData = payload?.product;
      const productName = productData?.product_name?.trim();

      if (payload?.status === 1 && productName) {
        setOnlineProduct({
          name: productName,
          barcode: trimmedBarcode,
          imageUrl: productData?.image_url || null,
          brand: productData?.brands || null,
        });
        setError(
          `Mahsulot lokal bazada topilmadi. Istasangiz, onlayn topilgan mahsulotni bazaga qo'shishingiz mumkin.`
        );
      } else {
        setError(`"${trimmedBarcode}" barcode bo'yicha mahsulot topilmadi`);
      }
    } catch (err: any) {
      setError(err?.message || 'Barcode qidiruvi ishlamadi');
    } finally {
      setOnlineLookupLoading(false);
      setBarcodeInput('');
    }
  };

  const handleBarcodeInput = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      await lookupProductByBarcode(barcodeInput);
    }
  };

  const handleImportOnlineProduct = async () => {
    if (!onlineProduct) return;

    try {
      setImportingOnlineProduct(true);
      setError('');

      const payload = {
        name: onlineProduct.brand
          ? `${onlineProduct.name} (${onlineProduct.brand})`
          : onlineProduct.name,
        barcode: onlineProduct.barcode,
        category_id: null,
        buy_price: 0,
        sell_price: 0,
        stock_quantity: 0,
        unit_type: 'piece',
        image_url: onlineProduct.imageUrl,
        minimum_stock: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error: insertError } = await supabase
        .from('products')
        .insert([payload])
        .select('*')
        .single();

      if (insertError) throw insertError;

      setProducts((current) => [data, ...current]);
      setSelectedProduct(data);
      setOnlineProduct(null);
      setSuccessMessage("Mahsulot barcode orqali qo'shildi. Sotishdan oldin narx va qoldiqni kiriting.");
    } catch (err: any) {
      setError(err?.message || "Mahsulotni qo'shib bo'lmadi");
    } finally {
      setImportingOnlineProduct(false);
    }
  };

  const handleScannerDetected = async (code: string) => {
    await lookupProductByBarcode(code);
  };

  const ensureCheckoutTablesAvailable = async (isCreditSale: boolean) => {
    const { error: salesHistoryTableError } = await supabase
      .from('sales_history')
      .select('id')
      .limit(1);
    if (salesHistoryTableError) throw salesHistoryTableError;

    const { error: saleItemsTableError } = await supabase.from('sale_items').select('id').limit(1);
    if (saleItemsTableError) throw saleItemsTableError;

    if (!isCreditSale) {
      return;
    }

    const { error: debtorsTableError } = await supabase.from('debtors').select('id').limit(1);
    if (debtorsTableError) throw debtorsTableError;

    const { error: debtEntriesTableError } = await supabase
      .from('debt_entries')
      .select('id')
      .limit(1);

    if (debtEntriesTableError) throw debtEntriesTableError;
  };

  const createDebtorRecord = async (payload: Record<string, unknown>) => {
    let result = await supabase.from('debtors').insert([payload]).select().single();

    if (result.error && isMissingDueDateColumnError(result.error)) {
      const { due_date, ...fallbackPayload } = payload;
      result = await supabase.from('debtors').insert([fallbackPayload]).select().single();
    }

    return result;
  };

  const updateDebtorRecord = async (debtorId: string, payload: Record<string, unknown>) => {
    let result = await supabase.from('debtors').update(payload).eq('id', debtorId);

    if (result.error && isMissingDueDateColumnError(result.error)) {
      const { due_date, ...fallbackPayload } = payload;
      result = await supabase.from('debtors').update(fallbackPayload).eq('id', debtorId);
    }

    return result;
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;

    if (selectedProduct.sell_price <= 0) {
      setError("Mahsulotni savatga qo'shishdan oldin sotuv narxini kiriting");
      return;
    }

    if (isWeightedUnit(selectedProduct.unit_type) && weight === null) {
      setError(
        `${selectedProduct.unit_type === 'liter' ? 'Hajmni' : "Og'irlikni"} kiriting`
      );
      return;
    }

    const soldQuantity = roundCurrency(quantity * (weight ?? 1));
    if (soldQuantity > Number(selectedProduct.stock_quantity)) {
      setError(
        `Omborda faqat ${selectedProduct.stock_quantity} ${formatUnitType(selectedProduct.unit_type)} mavjud`
      );
      return;
    }

    addItem(selectedProduct, quantity, weight ?? undefined);
    setSelectedProduct(null);
    setQuantity(1);
    setWeight(null);
    setError('');
  };

  const handleCheckout = async (data: PaymentFormData) => {
    if (items.length === 0) {
      setError('Savat bo`sh');
      return;
    }

    let createdDebtorId: string | null = null;
    let saleCreated = false;
    let salePartyName = 'Oddiy mijoz';

    try {
      setLoading(true);
      setError('');

      const cartLines = items.map((item) => ({
        ...item,
        soldQuantity: roundCurrency(item.quantity * (item.weight ?? 1)),
        totalPrice: roundCurrency(item.totalPrice),
      }));

      const { data: latestProducts, error: latestProductsError } = await supabase
        .from('products')
        .select('id, name, stock_quantity, updated_at')
        .in(
          'id',
          cartLines.map((item) => item.productId)
        );

      if (latestProductsError) throw latestProductsError;

      const latestProductMap = new Map((latestProducts || []).map((product) => [product.id, product]));

      for (const line of cartLines) {
        const latestProduct = latestProductMap.get(line.productId);

        if (!latestProduct) {
          throw new Error(`"${line.product.name}" mahsuloti topilmadi`);
        }
        if (line.soldQuantity > Number(latestProduct.stock_quantity)) {
          throw new Error(
            `"${line.product.name}" uchun omborda faqat ${latestProduct.stock_quantity} ${formatUnitType(line.product.unit_type)} qoldi`
          );
        }
      }

      let debtorId: string | null = data.debtorId || null;
      const subtotal = getTotal();
      const discountAmount = data.discount || 0;
      const totalAmount = roundCurrency(Math.max(0, subtotal - discountAmount));
      const now = new Date().toISOString();
      const resolvedDueDate = resolveDueDateForSave(data.dueDate, new Date(now));

      await ensureCheckoutTablesAvailable(data.paymentMethod === 'credit');

      if (data.paymentMethod === 'credit' && !debtorId) {
        const { data: newDebtor, error: debtorError } = await createDebtorRecord({
          first_name: data.debtorFirstName?.trim(),
          last_name: data.debtorLastName?.trim(),
          phone: data.debtorPhone?.trim() || null,
          notes: data.notes?.trim() || null,
          total_debt_amount: totalAmount,
          paid_amount: 0,
          remaining_balance: totalAmount,
          status: 'pending',
          due_date: resolvedDueDate,
          last_transaction_date: now,
          created_at: now,
          updated_at: now,
        });

        if (debtorError) throw debtorError;
        debtorId = newDebtor.id;
        createdDebtorId = newDebtor.id;
        salePartyName = `${newDebtor.first_name} ${newDebtor.last_name}`;

        const { error: debtEntryError } = await supabase.from('debt_entries').insert([
          {
            debtor_id: newDebtor.id,
            amount: totalAmount,
            type: 'charge',
            notes: data.notes?.trim() || null,
          },
        ]);

        if (debtEntryError) throw debtEntryError;
      }

      if (data.paymentMethod === 'credit' && debtorId && !createdDebtorId) {
        const { data: existingDebtor, error: debtorFetchError } = await supabase
          .from('debtors')
          .select('*')
          .eq('id', debtorId)
          .single();

        if (debtorFetchError) throw debtorFetchError;
        salePartyName = `${existingDebtor.first_name} ${existingDebtor.last_name}`;

        const currentTotalDebtAmount = roundCurrency(Number(existingDebtor.total_debt_amount));
        const currentPaidAmount = roundCurrency(Number(existingDebtor.paid_amount));
        const newBalance = roundCurrency(Number(existingDebtor.remaining_balance) + totalAmount);
        const newTotalDebtAmount = roundCurrency(currentTotalDebtAmount + totalAmount);
        const nextStatus = currentPaidAmount > 0 ? 'partial' : 'pending';

        const { error: updateDebtError } = await updateDebtorRecord(existingDebtor.id, {
          total_debt_amount: newTotalDebtAmount,
          paid_amount: currentPaidAmount,
          remaining_balance: newBalance,
          status: nextStatus,
          due_date: resolvedDueDate,
          last_transaction_date: now,
          updated_at: now,
        });

        if (updateDebtError) throw updateDebtError;

        const { error: debtEntryError } = await supabase.from('debt_entries').insert([
          {
            debtor_id: existingDebtor.id,
            amount: totalAmount,
            type: 'charge',
            notes: data.notes?.trim() || null,
          },
        ]);

        if (debtEntryError) throw debtEntryError;
      }

      const { data: sale, error: saleError } = await supabase
        .from('sales_history')
        .insert([
          {
            customer_id: null,
            debtor_id: data.paymentMethod === 'credit' ? debtorId : null,
            total_amount: totalAmount,
            discount_amount: discountAmount,
            payment_method: data.paymentMethod,
            is_credit: data.paymentMethod === 'credit',
            status: 'completed',
          },
        ])
        .select()
        .single();

      if (saleError) throw saleError;
      saleCreated = true;

      const { error: saleItemsError } = await supabase.from('sale_items').insert(
        cartLines.map((item) => ({
          sale_id: sale.id,
          product_id: item.productId,
          quantity: item.soldQuantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
        }))
      );

      if (saleItemsError) throw saleItemsError;

      if (data.paymentMethod !== 'credit') {
        salePartyName = 'Oddiy mijoz';
      }

      for (const item of cartLines) {
        const latestProduct = latestProductMap.get(item.productId);
        if (!latestProduct) continue;

        const newStock = roundCurrency(Number(latestProduct.stock_quantity) - item.soldQuantity);
        const { error: stockError } = await supabase
          .from('products')
          .update({
            stock_quantity: newStock,
            updated_at: now,
          })
          .eq('id', item.productId);

        if (stockError) throw stockError;
      }

      if (autoPrintReceipt || printAfterCheckout) {
        printReceipt({
          saleDate: now,
          paymentMethod: data.paymentMethod,
          totalAmount,
          discountAmount,
          customerLabel: salePartyName,
          cartLines,
        });
      }

      setSuccessMessage(`Savdo yakunlandi. Jami: ${formatCurrency(totalAmount)}`);
      clearCart();
      resetForm();
      setPrintAfterCheckout(false);
      setTimeout(() => {
        setOpenPaymentDialog(false);
        setSuccessMessage('');
      }, 2000);

      fetchProducts();
      fetchDebtors();
    } catch (err: any) {
      if (data.paymentMethod === 'credit' && !data.debtorId && createdDebtorId && !saleCreated) {
        await supabase.from('debtors').delete().eq('id', createdDebtorId);
      }

      setPrintAfterCheckout(false);
      setError(formatSupabaseError(err, 'Hisob-kitobni yakunlab bo`lmadi'));
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const subtotal = getTotal();
  const total = subtotal;

  return (
    <AdminLayout>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
            Kassa
          </Typography>
          <Typography variant="body2" sx={{ color: '#666' }}>
            Tezkor savdo va hisob-kitob
          </Typography>
        </Box>
        <Chip
          label={`Mahsulotlar: ${getItemCount()}`}
          color="primary"
          sx={{ py: 2.8, px: 2, fontSize: '14px', fontWeight: 600 }}
        />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 3, borderRadius: '12px', border: '1px solid #e0e0e0', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Mahsulotni skaner qiling yoki qidiring
            </Typography>

            <TextField
              fullWidth
              placeholder="Barcode ni shu yerga kiriting yoki skaner qiling..."
              value={barcodeInput}
              onChange={(event) => setBarcodeInput(event.target.value)}
              onKeyDown={handleBarcodeInput}
              inputRef={barcodeRef}
              variant="outlined"
              sx={{ mb: 2 }}
              autoFocus
            />

            <Button
              variant="outlined"
              startIcon={<Camera size={18} />}
              onClick={() => setOpenScannerDialog(true)}
              sx={{ mb: 2 }}
            >
              Kamera bilan skaner qilish
            </Button>

            <Autocomplete
              fullWidth
              options={filteredProducts}
              getOptionLabel={(option) => `${option.name} (${option.barcode || 'Barcode yo`q'})`}
              value={selectedProduct}
              onChange={(_, newValue) => {
                setSelectedProduct(newValue);
                setOnlineProduct(null);
                setWeight(null);
                setQuantity(1);
              }}
              onInputChange={(_, newInputValue) => setSearchQuery(newInputValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Yoki mahsulot nomi bo`yicha qidiring..."
                  variant="outlined"
                  sx={{ mb: 2 }}
                />
              )}
              sx={{ mb: 2 }}
            />

            {selectedProduct && (
              <Card
                sx={{
                  p: 2,
                  backgroundColor: '#f5f5f5',
                  borderRadius: '8px',
                  border: '2px solid #1976d2',
                  mb: 2,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {selectedProduct.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#666' }}>
                      Barcode: {selectedProduct.barcode || 'Yo`q'}
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setSelectedProduct(null)}
                    startIcon={<X size={16} />}
                  >
                    Tozalash
                  </Button>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                  <Box>
                    <Typography variant="body2" sx={{ color: '#666', mb: 0.5 }}>
                      Narx
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {formatCurrency(selectedProduct.sell_price)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ color: '#666', mb: 0.5 }}>
                      Qoldiq
                    </Typography>
                    <Chip
                      label={selectedProduct.stock_quantity}
                      color={selectedProduct.stock_quantity > 0 ? 'success' : 'error'}
                    />
                  </Box>
                </Box>

                {isWeightedUnit(selectedProduct.unit_type) && (
                  <TextField
                    fullWidth
                    label={selectedProduct.unit_type === 'liter' ? 'Hajm (litr)' : "Og'irlik (kg)"}
                    type="number"
                    inputProps={{ step: '0.1', min: '0' }}
                    value={weight || ''}
                    onChange={(event) => setWeight(parseFloat(event.target.value) || null)}
                    sx={{ mb: 2 }}
                  />
                )}

                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
                  <Typography variant="body2">Soni:</Typography>
                  <IconButton size="small" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                    <Minus size={16} />
                  </IconButton>
                  <TextField
                    type="number"
                    value={quantity}
                    onChange={(event) => setQuantity(parseInt(event.target.value, 10) || 1)}
                    inputProps={{ min: '1', style: { textAlign: 'center' } }}
                    sx={{ width: 60 }}
                  />
                  <IconButton size="small" onClick={() => setQuantity(quantity + 1)}>
                    <Plus size={16} />
                  </IconButton>
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={handleAddToCart}
                  startIcon={<ShoppingCart size={18} />}
                  disabled={selectedProduct.sell_price <= 0}
                >
                  {selectedProduct.sell_price <= 0 ? 'Avval narx kiriting' : "Savatga qo'shish"}
                </Button>
              </Card>
            )}

            {onlineLookupLoading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
                <CircularProgress size={18} />
                <Typography variant="body2" sx={{ color: '#666' }}>
                  Onlayn barcode bazasida qidirilmoqda...
                </Typography>
              </Box>
            )}

            {onlineProduct && (
              <Card
                sx={{
                  p: 2,
                  borderRadius: '8px',
                  border: '1px dashed #1976d2',
                  backgroundColor: '#f8fbff',
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Mahsulot onlayn topildi
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  {onlineProduct.brand
                    ? `${onlineProduct.name} (${onlineProduct.brand})`
                    : onlineProduct.name}
                </Typography>
                <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
                  Barcode: {onlineProduct.barcode}
                </Typography>
                <Button
                  variant="contained"
                  onClick={handleImportOnlineProduct}
                  disabled={importingOnlineProduct}
                >
                  {importingOnlineProduct ? 'Saqlanmoqda...' : "Bazaga qo'shish"}
                </Button>
              </Card>
            )}
          </Card>

          {!selectedProduct && products.length > 0 && (
            <Card sx={{ p: 2, borderRadius: '12px', border: '1px solid #e0e0e0' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                Tez tanlanadigan mahsulotlar
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 1 }}>
                {products.slice(0, 8).map((product) => (
                  <Button
                    key={product.id}
                    variant="outlined"
                    onClick={() => {
                      setSelectedProduct(product);
                      setQuantity(1);
                      setWeight(null);
                      setOnlineProduct(null);
                    }}
                    sx={{
                      flexDirection: 'column',
                      alignItems: 'center',
                      py: 1.5,
                      textAlign: 'center',
                      fontSize: '12px',
                    }}
                  >
                    <Box sx={{ fontWeight: 600, mb: 0.5 }}>{product.name}</Box>
                    <Box sx={{ color: '#1976d2', fontWeight: 700 }}>
                      {formatCurrency(product.sell_price)}
                    </Box>
                  </Button>
                ))}
              </Box>
            </Card>
          )}
        </Grid>
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              p: 3,
              borderRadius: '12px',
              border: '2px solid #1976d2',
              position: 'sticky',
              top: 16,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Buyurtma xulosasi
            </Typography>

            <Box
              sx={{
                maxHeight: '300px',
                overflowY: 'auto',
                mb: 2,
                pb: 2,
                borderBottom: '1px solid #e0e0e0',
              }}
            >
              {items.length === 0 ? (
                <Typography variant="body2" sx={{ color: '#999', textAlign: 'center', py: 4 }}>
                  Savat bo`sh
                </Typography>
              ) : (
                <Table size="small">
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.productId}>
                        <TableCell sx={{ py: 1, px: 1, flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                            {item.product.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#666' }}>
                            {item.weight
                              ? `${item.quantity} x ${item.weight} ${formatUnitType(item.product.unit_type)}`
                              : `Soni: ${item.quantity}`}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1, px: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {formatCurrency(item.totalPrice)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1, px: 0.5 }}>
                          <IconButton
                            size="small"
                            onClick={() => removeItem(item.productId)}
                            color="error"
                          >
                            <Trash2 size={14} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>

            <Box sx={{ mb: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  mb: 1,
                  pb: 1,
                  borderBottom: '1px solid #e0e0e0',
                }}
              >
                <Typography variant="body2">Oraliq jami:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {formatCurrency(subtotal)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1976d2' }}>
                  Jami:
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1976d2', fontSize: '20px' }}>
                  {formatCurrency(total)}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={() => setOpenPaymentDialog(true)}
                disabled={items.length === 0}
                startIcon={<DollarSign size={18} />}
                sx={{ py: 1.5, fontWeight: 600 }}
              >
                Hisob-kitob
              </Button>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  if (confirm("Savatni tozalashni tasdiqlaysizmi?")) {
                    clearCart();
                  }
                }}
                startIcon={<X size={18} />}
              >
                Savatni tozalash
              </Button>
            </Box>
          </Card>
        </Grid>
      </Grid>

      <Dialog
        open={openPaymentDialog}
        onClose={() => setOpenPaymentDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            To`lovni yakunlash
          </Typography>

          <Box sx={{ backgroundColor: '#f5f5f5', p: 2, borderRadius: '8px', mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">Jami summa:</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1976d2' }}>
                {formatCurrency(total)}
              </Typography>
            </Box>
          </Box>

          <form onSubmit={handleSubmit(handleCheckout)}>
            <Controller
              name="paymentMethod"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  select
                  label="To`lov turi"
                  margin="normal"
                  error={!!errors.paymentMethod}
                >
                  <MenuItem value="cash">Naqd</MenuItem>
                  <MenuItem value="card">Karta</MenuItem>
                  <MenuItem value="credit">Nasiya</MenuItem>
                </TextField>
              )}
            />

            <Controller
              name="discount"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Chegirma"
                  type="number"
                  margin="normal"
                  inputProps={{ step: '0.01', min: '0' }}
                  error={!!errors.discount}
                />
              )}
            />

            {paymentMethod === 'credit' && (
              <>
                <Controller
                  name="debtorId"
                  control={control}
                  render={({ field }) => (
                    <Autocomplete
                      options={debtors}
                      value={selectedDebtor}
                      onChange={(_, newValue) => {
                        field.onChange(newValue?.id || '');
                        setValue(
                          'dueDate',
                          newValue ? getDebtorDueDateInput(newValue) : getDefaultDebtDueDateInput()
                        );
                      }}
                      getOptionLabel={(option) =>
                        `${option.first_name} ${option.last_name}${option.phone ? ` - ${option.phone}` : ''}`
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Mavjud qarzdor"
                          margin="normal"
                          helperText="Mavjud qarzdorni tanlang yoki pastda yangi ma`lumot kiriting"
                        />
                      )}
                    />
                  )}
                />

                {!selectedDebtor && (
                  <>
                    <Controller
                      name="debtorFirstName"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Ism"
                          margin="normal"
                          error={!!errors.debtorFirstName}
                          helperText={errors.debtorFirstName?.message}
                        />
                      )}
                    />

                    <Controller
                      name="debtorLastName"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Familiya"
                          margin="normal"
                          error={!!errors.debtorLastName}
                          helperText={errors.debtorLastName?.message}
                        />
                      )}
                    />

                    <Controller
                      name="debtorPhone"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Telefon raqami"
                          margin="normal"
                          error={!!errors.debtorPhone}
                          helperText={errors.debtorPhone?.message}
                        />
                      )}
                    />
                  </>
                )}

                <Controller
                  name="dueDate"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Qaytarish muddati"
                      type="date"
                      margin="normal"
                      InputLabelProps={{ shrink: true }}
                      error={!!errors.dueDate}
                      helperText={
                        errors.dueDate?.message ||
                        (selectedDebtor
                          ? 'Kerak bo`lsa mavjud qarzdor uchun yangi muddat qo`ying'
                          : 'Qarzning qaytarish sanasini belgilang')
                      }
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
                      label="Izoh"
                      margin="normal"
                      multiline
                      rows={2}
                    />
                  )}
                />
              </>
            )}

            <Box sx={{ display: 'flex', gap: 1, mt: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
              <Button fullWidth variant="outlined" onClick={() => setOpenPaymentDialog(false)}>
                Bekor qilish
              </Button>
              <Button
                fullWidth
                variant="outlined"
                type="submit"
                disabled={loading}
                onClick={() => setPrintAfterCheckout(true)}
              >
                {loading ? 'Bajarilmoqda...' : 'Yakunlash va chop etish'}
              </Button>
              <Button
                fullWidth
                variant="contained"
                type="submit"
                disabled={loading}
                onClick={() => setPrintAfterCheckout(false)}
              >
                {loading ? 'Bajarilmoqda...' : 'Savdoni yakunlash'}
              </Button>
            </Box>
          </form>
        </Box>
      </Dialog>

      <BarcodeScannerDialog
        open={openScannerDialog}
        onClose={() => setOpenScannerDialog(false)}
        onDetected={handleScannerDetected}
      />
    </AdminLayout>
  );
}
