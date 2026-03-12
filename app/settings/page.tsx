'use client';

import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
  MenuItem,
  Switch,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { LogOut, Receipt, RefreshCcw, Save, ScanLine, Settings2, Store } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/AdminLayout';
import { defaultAppSettings, useAppSettingsStore, useAuthStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';

export default function SettingsPage() {
  const router = useRouter();
  const theme = useTheme();
  const { user, setUser } = useAuthStore();
  const {
    themeMode,
    compactMode,
    notificationsEnabled,
    barcodeLookupEnabled,
    autoPrintReceipt,
    currencyCode,
    storeName,
    receiptFooter,
    lowStockThreshold,
    updateSettings,
    resetSettings,
  } = useAppSettingsStore((state) => ({
    themeMode: state.themeMode,
    compactMode: state.compactMode,
    notificationsEnabled: state.notificationsEnabled,
    barcodeLookupEnabled: state.barcodeLookupEnabled,
    autoPrintReceipt: state.autoPrintReceipt,
    currencyCode: state.currencyCode,
    storeName: state.storeName,
    receiptFooter: state.receiptFooter,
    lowStockThreshold: state.lowStockThreshold,
    updateSettings: state.updateSettings,
    resetSettings: state.resetSettings,
  }));
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      router.push('/login');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSaveSettings = () => {
    setSuccessMessage("Sozlamalar saqlandi va darhol qo'llandi.");
    setTimeout(() => setSuccessMessage(''), 2500);
  };

  const handleResetDefaults = () => {
    resetSettings();
    setSuccessMessage('Standart sozlamalar tiklandi.');
    setTimeout(() => setSuccessMessage(''), 2500);
  };

  const previewAmount = new Intl.NumberFormat('uz-UZ', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: currencyCode === 'UZS' ? 0 : 2,
  }).format(128.5);

  return (
    <AdminLayout>
      <Card
        sx={{
          mb: 3,
          p: { xs: 2.5, md: 3.5 },
          position: 'relative',
          overflow: 'hidden',
          background:
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(108, 180, 255, 0.22) 0%, rgba(247, 178, 103, 0.14) 100%)'
              : 'linear-gradient(135deg, rgba(21, 112, 239, 0.14) 0%, rgba(249, 115, 22, 0.10) 100%)',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            right: -36,
            top: -36,
            width: 140,
            height: 140,
            borderRadius: '50%',
            backgroundColor: alpha(theme.palette.primary.main, 0.12),
          }}
        />
        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box>
            <Chip label="POS sozlamalari" color="primary" sx={{ mb: 1.5 }} />
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.75 }}>
              Boshqaruv markazi
            </Typography>
            <Typography variant="body1" sx={{ color: theme.palette.text.secondary, maxWidth: 680 }}>
              Interfeys, do`kon nomi, chek matni, barcode qidiruvi va POS jarayoniga oid asosiy sozlamalar shu yerda turadi.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <Button variant="outlined" startIcon={<RefreshCcw size={16} />} onClick={handleResetDefaults}>
              Standartga qaytarish
            </Button>
            <Button variant="contained" startIcon={<Save size={16} />} onClick={handleSaveSettings}>
              O`zgarishlarni saqlash
            </Button>
          </Box>
        </Box>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
                  <Store size={20} />
                  <Typography variant="h6">Do`kon profili</Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Do`kon nomi"
                      value={storeName}
                      onChange={(event) => updateSettings({ storeName: event.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      select
                      label="Valyuta"
                      value={currencyCode}
                      onChange={(event) => updateSettings({ currencyCode: event.target.value })}
                    >
                      <MenuItem value="USD">USD</MenuItem>
                      <MenuItem value="UZS">UZS</MenuItem>
                      <MenuItem value="EUR">EUR</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Chek osti matni"
                      value={receiptFooter}
                      onChange={(event) => updateSettings({ receiptFooter: event.target.value })}
                    />
                  </Grid>
                </Grid>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
                  <Settings2 size={20} />
                  <Typography variant="h6">Ko`rinish va ish maydoni</Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      select
                      label="Mavzu rejimi"
                      value={themeMode}
                      onChange={(event) =>
                        updateSettings({ themeMode: event.target.value as 'light' | 'dark' })
                      }
                    >
                      <MenuItem value="light">Yorug`</MenuItem>
                      <MenuItem value="dark">Qorong`i</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={8}>
                    <Box sx={{ display: 'grid', gap: 1 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={compactMode}
                            onChange={(event) =>
                              updateSettings({ compactMode: event.target.checked })
                            }
                          />
                        }
                        label="Ixcham ko`rinish"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={notificationsEnabled}
                            onChange={(event) =>
                              updateSettings({ notificationsEnabled: event.target.checked })
                            }
                          />
                        }
                        label="Bildirishnoma indikatori"
                      />
                    </Box>
                  </Grid>
                </Grid>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
                  <ScanLine size={20} />
                  <Typography variant="h6">POS ish jarayoni</Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Global minimal qoldiq chegarasi"
                      value={lowStockThreshold}
                      onChange={(event) =>
                        updateSettings({
                          lowStockThreshold: Math.max(1, Number(event.target.value) || 1),
                        })
                      }
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'grid', gap: 1 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={barcodeLookupEnabled}
                            onChange={(event) =>
                              updateSettings({ barcodeLookupEnabled: event.target.checked })
                            }
                          />
                        }
                        label="Onlayn barcode qidiruvi"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={autoPrintReceipt}
                            onChange={(event) =>
                              updateSettings({ autoPrintReceipt: event.target.checked })
                            }
                          />
                        }
                        label="Savdodan keyin chekni avtomatik chop etish"
                      />
                    </Box>
                  </Grid>
                </Grid>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
                  <Receipt size={20} />
                  <Typography variant="h6">Chek ko`rinishi</Typography>
                </Box>

                <Box
                  sx={{
                    p: 2.25,
                    borderRadius: 3,
                    border: `1px dashed ${alpha(theme.palette.primary.main, 0.25)}`,
                    backgroundColor: alpha(theme.palette.background.default, 0.42),
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, textAlign: 'center', mb: 0.5 }}>
                    {storeName || defaultAppSettings.storeName}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ textAlign: 'center', color: theme.palette.text.secondary, mb: 2 }}
                  >
                    Namunaviy chek
                  </Typography>
                  <Divider sx={{ mb: 1.5 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">To`lov</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      KARTA
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Jami</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                      {previewAmount}
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="body2" sx={{ textAlign: 'center', color: theme.palette.text.secondary }}>
                    {receiptFooter || defaultAppSettings.receiptFooter}
                  </Typography>
                </Box>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Hisob
                </Typography>
                <TextField fullWidth label="Email" value={user?.email || ''} disabled sx={{ mb: 1.5 }} />
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 2 }}>
                  Auth email Supabase akkauntidan olinadi va bu sahifada o`zgarmaydi.
                </Typography>
                <Button variant="outlined" color="error" startIcon={<LogOut size={16} />} onClick={handleLogout}>
                  Chiqish
                </Button>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </AdminLayout>
  );
}
