'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  TextField,
  Typography,
  Card,
  Alert,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Edit, Trash2, Plus, Phone, User } from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { uzDataGridLocaleText } from '@/lib/data-grid-locale';
import { supabase, Customer } from '@/lib/supabase';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const customerSchema = z.object({
  first_name: z.string().min(1, 'Ism kiritilishi shart'),
  last_name: z.string().min(1, 'Familiya kiritilishi shart'),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  const { control, handleSubmit, reset } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (err) throw err;
      setCustomers(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: CustomerFormData) => {
    try {
      setError('');
      const payload = {
        ...data,
        phone: data.phone?.trim() || null,
        notes: data.notes?.trim() || null,
      };

      if (editingCustomer) {
        const { error: err } = await supabase
          .from('customers')
          .update(payload)
          .eq('id', editingCustomer.id);

        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('customers').insert([payload]);

        if (err) throw err;
      }

      await fetchCustomers();
      handleCloseDialog();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleOpenDialog = (customer?: Customer) => {
    setEditingCustomer(customer || null);
    if (customer) {
      reset({
        first_name: customer.first_name,
        last_name: customer.last_name,
        phone: customer.phone || '',
        notes: customer.notes || '',
      });
    } else {
      reset({
        first_name: '',
        last_name: '',
        phone: '',
        notes: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCustomer(null);
    reset();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Mijozni o'chirishni tasdiqlaysizmi?")) return;

    try {
      const { error: err } = await supabase.from('customers').delete().eq('id', id);

      if (err) throw err;
      await fetchCustomers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns: GridColDef[] = [
    {
      field: 'first_name',
      headerName: 'Ism',
      flex: 1,
      minWidth: 120,
    },
    {
      field: 'last_name',
      headerName: 'Familiya',
      flex: 1,
      minWidth: 120,
    },
    {
      field: 'phone',
      headerName: 'Telefon',
      flex: 1,
      minWidth: 120,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {params.value ? (
            <>
              <Phone size={16} />
              {params.value}
            </>
          ) : (
            '-'
          )}
        </Box>
      ),
    },
    {
      field: 'notes',
      headerName: 'Izoh',
      flex: 1.5,
      minWidth: 150,
    },
    {
      field: 'created_at',
      headerName: 'Yaratilgan sana',
      flex: 1,
      minWidth: 120,
      renderCell: (params) => new Date(params.value).toLocaleDateString('uz-UZ'),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Amallar',
      width: 100,
      getActions: (params) => [
        <Typography
          key={`edit-${params.id}`}
          onClick={() => handleOpenDialog(params.row)}
          sx={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            color: '#1976d2',
            fontSize: '14px',
          }}
        >
          <Edit size={16} />
          Tahrirlash
        </Typography>,
        <Typography
          key={`delete-${params.id}`}
          onClick={() => handleDelete(params.id as string)}
          sx={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            color: '#f44336',
            fontSize: '14px',
          }}
        >
          <Trash2 size={16} />
          O'chirish
        </Typography>,
      ],
    },
  ];

  return (
    <AdminLayout>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Mijozlar
          </Typography>
          <Typography variant="body2" sx={{ color: '#666' }}>
            Mijoz ma`lumotlarini boshqaring
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Plus size={18} />}
          onClick={() => handleOpenDialog()}
          sx={{ py: 1.2, px: 3 }}
        >
          Mijoz qo`shish
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Ism, familiya yoki telefon bo`yicha qidiring..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          variant="outlined"
          size="small"
        />
      </Box>

      <Box sx={{ height: 500, backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0' }}>
        <DataGrid
          rows={filteredCustomers}
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

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            {editingCustomer ? 'Mijozni tahrirlash' : 'Yangi mijoz qo`shish'}
          </Typography>

          <form onSubmit={handleSubmit(onSubmit)}>
            <Controller
              name="first_name"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Ism"
                  margin="normal"
                  error={!!error}
                  helperText={error?.message}
                />
              )}
            />

            <Controller
              name="last_name"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Familiya"
                  margin="normal"
                  error={!!error}
                  helperText={error?.message}
                />
              )}
            />

            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Telefon raqami"
                  margin="normal"
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
                  rows={3}
                />
              )}
            />

            <Box sx={{ display: 'flex', gap: 1, mt: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
              <Button fullWidth variant="outlined" onClick={handleCloseDialog}>
                Bekor qilish
              </Button>
              <Button fullWidth variant="contained" type="submit">
                {editingCustomer ? 'Saqlash' : 'Yaratish'}
              </Button>
            </Box>
          </form>
        </Box>
      </Dialog>
    </AdminLayout>
  );
}
