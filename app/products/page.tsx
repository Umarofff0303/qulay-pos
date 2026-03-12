'use client';

import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid, GridActionsCellItem, GridColDef } from '@mui/x-data-grid';
import { AlertTriangle, Camera, Edit, Plus, Trash2 } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AdminLayout } from '@/components/AdminLayout';
import { BarcodeScannerDialog } from '@/components/BarcodeScannerDialog';
import { uzDataGridLocaleText } from '@/lib/data-grid-locale';
import { Category, Product, supabase } from '@/lib/supabase';

const productSchema = z.object({
  name: z.string().min(1, 'Mahsulot nomi kiritilishi shart'),
  barcode: z.string().optional(),
  category_id: z.string().optional(),
  buy_price: z.coerce.number().min(0, 'Tannarx 0 dan kichik bo`lmasligi kerak'),
  sell_price: z.coerce.number().min(0, 'Sotuv narxi 0 dan kichik bo`lmasligi kerak'),
  stock_quantity: z.coerce.number().min(0, 'Qoldiq 0 dan kichik bo`lmasligi kerak'),
  unit_type: z.string().min(1, 'O`lchov birligi tanlanishi shart'),
  minimum_stock: z.coerce.number().min(0, 'Minimal qoldiq 0 dan kichik bo`lmasligi kerak'),
});

type ProductFormData = z.infer<typeof productSchema>;

const emptyProductForm: ProductFormData = {
  name: '',
  barcode: '',
  category_id: '',
  buy_price: 0,
  sell_price: 0,
  stock_quantity: 0,
  unit_type: 'piece',
  minimum_stock: 10,
};

const dedupeCategories = (items: Category[]) => {
  const uniqueByName = new Map<string, Category>();

  [...items]
    .sort(
      (left, right) =>
        new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime()
    )
    .forEach((item) => {
      const key = item.name.trim().toLowerCase();
      if (!uniqueByName.has(key)) {
        uniqueByName.set(key, item);
      }
    });

  return Array.from(uniqueByName.values()).sort((left, right) =>
    left.name.localeCompare(right.name, 'uz')
  );
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openScannerDialog, setOpenScannerDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: emptyProductForm,
  });

  useEffect(() => {
    void fetchProducts();
    void fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setProducts(data || []);
    } catch (err: any) {
      setError(err.message || 'Mahsulotlarni yuklab bo`lmadi');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      setCategories(dedupeCategories(data || []));
    } catch (err: any) {
      console.error('Error fetching categories:', err);
      setError(err.message || 'Kategoriyalarni yuklab bo`lmadi');
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    try {
      setError('');
      const payload = {
        ...data,
        barcode: data.barcode?.trim() ? data.barcode.trim() : null,
        category_id: data.category_id?.trim() ? data.category_id.trim() : null,
      };

      if (editingProduct) {
        const { error: updateError } = await supabase
          .from('products')
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingProduct.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('products').insert([
          {
            ...payload,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);

        if (insertError) throw insertError;
      }

      await fetchProducts();
      handleCloseDialog();
    } catch (err: any) {
      setError(err.message || 'Mahsulotni saqlab bo`lmadi');
    }
  };

  const handleOpenDialog = (product?: Product) => {
    setEditingProduct(product || null);

    if (product) {
      reset({
        name: product.name,
        barcode: product.barcode || '',
        category_id: product.category_id || '',
        buy_price: product.buy_price,
        sell_price: product.sell_price,
        stock_quantity: product.stock_quantity,
        unit_type: product.unit_type,
        minimum_stock: product.minimum_stock,
      });
    } else {
      reset(emptyProductForm);
    }

    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setOpenScannerDialog(false);
    setEditingProduct(null);
    reset(emptyProductForm);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Mahsulotni o'chirishni tasdiqlaysizmi?")) return;

    try {
      const { error: deleteError } = await supabase.from('products').delete().eq('id', id);
      if (deleteError) throw deleteError;
      await fetchProducts();
    } catch (err: any) {
      setError(err.message || 'Mahsulotni o`chirib bo`lmadi');
    }
  };

  const handleBarcodeDetected = (barcode: string) => {
    setValue('barcode', barcode, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    clearErrors('barcode');
  };

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Mahsulot nomi',
      flex: 1.5,
      minWidth: 160,
    },
    {
      field: 'barcode',
      headerName: 'Barcode',
      flex: 1,
      minWidth: 120,
    },
    {
      field: 'category_id',
      headerName: 'Kategoriya',
      flex: 1,
      minWidth: 120,
      renderCell: (params) => {
        const category = categories.find((item) => item.id === params.value);
        return category?.name || '-';
      },
    },
    {
      field: 'unit_type',
      headerName: "O'lchov",
      flex: 0.8,
      minWidth: 100,
      renderCell: (params) => {
        const unitLabels: Record<string, string> = {
          piece: 'dona',
          kg: 'kg',
          liter: 'litr',
          pack: 'paket',
          box: 'quti',
          dozen: "o'nlik",
        };

        return unitLabels[params.value] || params.value;
      },
    },
    {
      field: 'buy_price',
      headerName: 'Tannarx',
      flex: 1,
      minWidth: 120,
      renderCell: (params) => `${Number(params.value || 0).toFixed(2)}`,
    },
    {
      field: 'sell_price',
      headerName: 'Sotuv narxi',
      flex: 1,
      minWidth: 120,
      renderCell: (params) => `${Number(params.value || 0).toFixed(2)}`,
    },
    {
      field: 'stock_quantity',
      headerName: 'Qoldiq',
      flex: 1,
      minWidth: 90,
      renderCell: (params) => {
        const stock = Number(params.value || 0);
        const minStock = Number(params.row.minimum_stock || 0);
        const isLow = stock < minStock;

        return (
          <Chip
            label={stock.toString()}
            size="small"
            color={isLow ? 'error' : 'success'}
            variant={isLow ? 'filled' : 'outlined'}
            icon={isLow ? <AlertTriangle size={16} /> : undefined}
          />
        );
      },
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Amallar',
      width: 110,
      getActions: (params) => [
        <GridActionsCellItem
          key={`edit-${params.id}`}
          icon={<Edit size={18} />}
          label="Tahrirlash"
          onClick={() => handleOpenDialog(params.row)}
        />,
        <GridActionsCellItem
          key={`delete-${params.id}`}
          icon={<Trash2 size={18} />}
          label="O'chirish"
          onClick={() => handleDelete(params.id as string)}
        />,
      ],
    },
  ];

  return (
    <AdminLayout>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Mahsulotlar
          </Typography>
          <Typography variant="body2" sx={{ color: '#666' }}>
            Ombordagi mahsulotlarni boshqaring
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Plus size={18} />}
          onClick={() => handleOpenDialog()}
          sx={{ py: 1.2, px: 3 }}
        >
          Mahsulot qo`shish
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Mahsulot nomi yoki barcode bo`yicha qidiring..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          variant="outlined"
          size="small"
        />
      </Box>

      <Box sx={{ height: 600, backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0' }}>
        <DataGrid
          rows={filteredProducts}
          columns={columns}
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
          disableRowSelectionOnClick
          localeText={uzDataGridLocaleText}
          loading={loading}
          sx={{
            '& .MuiDataGrid-root': { border: 'none' },
            '& .MuiDataGrid-cell': { borderBottom: '1px solid #e0e0e0' },
          }}
        />
      </Box>

      {!loading && !error && products.length === 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Supabase'dan hali mahsulot kelmadi. Yangi loyiha bo`lsa, avval `database.sql` ni Supabase SQL Editor'da ishga tushiring.
        </Alert>
      )}

      {!error && categories.length === 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Kategoriyalar faqat ma`lumotlar bazasidan olinadi. Agar kerak bo`lsa, `categories` jadvaliga yozuv qo`shing.
        </Alert>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            {editingProduct ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot qo`shish'}
          </Typography>

          <form onSubmit={handleSubmit(onSubmit)}>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Mahsulot nomi"
                  margin="normal"
                  error={!!errors.name}
                  helperText={errors.name?.message}
                />
              )}
            />

            <Controller
              name="barcode"
              control={control}
              render={({ field }) => (
                <Box
                  sx={{
                    mt: 2,
                    display: 'flex',
                    gap: 1,
                    alignItems: { xs: 'stretch', sm: 'flex-start' },
                    flexDirection: { xs: 'column', sm: 'row' },
                  }}
                >
                  <TextField
                    {...field}
                    fullWidth
                    label="Barcode"
                    margin="normal"
                    error={!!errors.barcode}
                    helperText={
                      errors.barcode?.message ||
                      'Kamera bilan skaner qiling yoki barcode ni qo`lda kiriting'
                    }
                  />
                  <Button
                    type="button"
                    variant="outlined"
                    startIcon={<Camera size={18} />}
                    onClick={() => setOpenScannerDialog(true)}
                    sx={{
                      alignSelf: { xs: 'stretch', sm: 'center' },
                      minWidth: { sm: 170 },
                      mt: { xs: 0, sm: 1 },
                    }}
                  >
                    Barcode skaner qilish
                  </Button>
                </Box>
              )}
            />

            <Controller
              name="category_id"
              control={control}
              render={({ field }) => (
                <Box sx={{ mt: 2 }}>
                  <TextField
                    {...field}
                    fullWidth
                    select
                    label="Kategoriya"
                    margin="normal"
                    error={!!errors.category_id}
                    helperText={errors.category_id?.message || 'Kategoriya bazadagi ro`yxatdan tanlanadi'}
                  >
                    <MenuItem value="">Tanlanmagan</MenuItem>
                    {categories.map((category) => (
                      <MenuItem key={category.id} value={category.id}>
                        {category.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
              )}
            />

            <Controller
              name="unit_type"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  select
                  label="O`lchov birligi"
                  margin="normal"
                  error={!!errors.unit_type}
                  helperText={errors.unit_type?.message}
                >
                  <MenuItem value="piece">Dona</MenuItem>
                  <MenuItem value="kg">Kilogram</MenuItem>
                  <MenuItem value="liter">Litr</MenuItem>
                  <MenuItem value="pack">Paket</MenuItem>
                  <MenuItem value="box">Quti</MenuItem>
                  <MenuItem value="dozen">O`nlik</MenuItem>
                </TextField>
              )}
            />

            <Controller
              name="buy_price"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Tannarx"
                  type="number"
                  margin="normal"
                  inputProps={{ step: '0.01', min: '0' }}
                  error={!!errors.buy_price}
                  helperText={errors.buy_price?.message}
                />
              )}
            />

            <Controller
              name="sell_price"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Sotuv narxi"
                  type="number"
                  margin="normal"
                  inputProps={{ step: '0.01', min: '0' }}
                  error={!!errors.sell_price}
                  helperText={errors.sell_price?.message}
                />
              )}
            />

            <Controller
              name="stock_quantity"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Qoldiq miqdori"
                  type="number"
                  margin="normal"
                  inputProps={{ step: '1', min: '0' }}
                  error={!!errors.stock_quantity}
                  helperText={errors.stock_quantity?.message}
                />
              )}
            />

            <Controller
              name="minimum_stock"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Minimal qoldiq chegarasi"
                  type="number"
                  margin="normal"
                  inputProps={{ step: '1', min: '0' }}
                  error={!!errors.minimum_stock}
                  helperText={errors.minimum_stock?.message}
                />
              )}
            />

            <Box sx={{ display: 'flex', gap: 1, mt: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
              <Button fullWidth variant="outlined" onClick={handleCloseDialog}>
                Bekor qilish
              </Button>
              <Button fullWidth variant="contained" type="submit">
                {editingProduct ? 'Saqlash' : 'Yaratish'}
              </Button>
            </Box>
          </form>
        </Box>
      </Dialog>

      <BarcodeScannerDialog
        open={openScannerDialog}
        onClose={() => setOpenScannerDialog(false)}
        onDetected={handleBarcodeDetected}
        title="Mahsulot barcode'ini skaner qilish"
        description="Kamera ruxsatini bering va barcode'ni ramka ichida ushlab turing. Barcode maydoni avtomatik to`ldiriladi."
      />
    </AdminLayout>
  );
}
