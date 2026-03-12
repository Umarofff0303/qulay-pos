'use client';

import React, { useState } from 'react';
import {
  Box,
  Card,
  TextField,
  Button,
  Typography,
  Container,
  CircularProgress,
  Alert,
  Stack,
  Link,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store';

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setLoading } = useAuthStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setIsLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const resetMessages = () => {
    setError('');
    setSuccess('');
  };

  const getAuthErrorMessage = (message: string) => {
    const normalized = message.toLowerCase();

    if (normalized.includes('invalid login credentials')) {
      return 'Email yoki parol noto`g`ri.';
    }

    if (normalized.includes('email not confirmed')) {
      return 'Email hali tasdiqlanmagan. Pochtani tekshirib, keyin qayta kiring.';
    }

    if (normalized.includes('user already registered')) {
      return 'Bu email allaqachon ro`yxatdan o`tgan. Kirish rejimiga o`ting.';
    }

    if (normalized.includes('signup is disabled')) {
      return "Bu loyiha uchun Supabase email ro'yxatdan o'tishi o'chirilgan. Uni Supabase Auth sozlamalarida yoqing.";
    }

    return message;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setIsLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail) {
        throw new Error('Email kiritilishi shart');
      }

      if (mode === 'register') {
        if (password.trim().length === 0 || confirmPassword.trim().length === 0) {
          throw new Error('Parol va parol tasdig`i kiritilishi shart');
        }

        if (password !== confirmPassword) {
          throw new Error('Parollar mos emas');
        }

        if (password.length < 6) {
          throw new Error('Parol kamida 6 ta belgidan iborat bo`lishi kerak');
        }

        const { data, error: authError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
        });

        if (authError) {
          throw new Error(getAuthErrorMessage(authError.message));
        }

        if (data.session && data.user) {
          setUser(data.user);
          setLoading(false);
          router.push('/dashboard');
          return;
        }

        setSuccess("Akkaunt yaratildi. Agar Supabase'da email tasdiqlash yoqilgan bo'lsa, avval emailingizni tasdiqlang.");
        setMode('login');
        setConfirmPassword('');
      } else {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (authError) {
          throw new Error(getAuthErrorMessage(authError.message));
        }

        setUser(data.user);
        setLoading(false);
        router.push('/dashboard');
        return;
      }
    } catch (err: any) {
      setError(err.message || 'Kirish amalga oshmadi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    resetMessages();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('Avval emailni kiriting, keyin tasdiqlash xatini qayta yuboring.');
      return;
    }

    setResending(true);

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: normalizedEmail,
      });

      if (resendError) {
        throw new Error(getAuthErrorMessage(resendError.message));
      }

      setSuccess('Tasdiqlash xati yuborildi. Kirishdan oldin emailingizni tasdiqlang.');
    } catch (err: any) {
      setError(err.message || 'Tasdiqlash xatini qayta yuborib bo`lmadi');
    } finally {
      setResending(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        <Card
          sx={{
            p: 4,
            borderRadius: '16px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
          }}
        >
          {/* Logo */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: '28px',
                margin: '0 auto',
                mb: 2,
              }}
            >
              P
            </Box>
            <Typography
              variant="h4"
              sx={{ fontWeight: 700, mb: 1 }}
            >
              ShopPOS
            </Typography>
            <Typography variant="body2" sx={{ color: '#666' }}>
              Do`kon uchun POS tizimi
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              disabled={loading}
              required
            />

            <TextField
              fullWidth
              label="Parol"
              type="password"
              value={password}
                onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              disabled={loading}
              required
            />

            {mode === 'register' && (
              <TextField
                fullWidth
                label="Parolni tasdiqlang"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                margin="normal"
                disabled={loading}
                required
                error={confirmPassword.length > 0 && password !== confirmPassword}
                helperText={
                  confirmPassword.length > 0 && password !== confirmPassword
                    ? 'Parollar bir xil bo`lishi kerak'
                    : ' '
                }
              />
            )}

            <Button
              fullWidth
              variant="contained"
              size="large"
              type="submit"
              disabled={loading}
              sx={{
                mt: 3,
                mb: 1.5,
                py: 1.5,
                background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                mode === 'login' ? 'Kirish' : 'Akkaunt yaratish'
              )}
            </Button>

            <Stack direction="row" justifyContent="center">
              <Button
                type="button"
                disabled={loading}
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                  resetMessages();
                  setConfirmPassword('');
                }}
              >
                {mode === 'login' ? 'Akkaunt yo`qmi? Ro`yxatdan o`ting' : 'Akkauntingiz bormi? Kiring'}
              </Button>
            </Stack>
          </form>

          <Typography
            variant="body2"
            sx={{
              textAlign: 'center',
              color: '#999',
              mt: 2,
            }}
          >
            {mode === 'login'
              ? 'Demo: test@example.com va password dan foydalaning'
              : 'Email va parol bilan yangi akkaunt yarating'}
          </Typography>

          <Typography
            variant="body2"
            sx={{
              textAlign: 'center',
              color: '#666',
              mt: 1,
            }}
          >
            Agar "email is not confirmed yet" xabari chiqsa, akkaunt yaratilgan bo`ladi, lekin avval emailni tasdiqlash kerak.
          </Typography>

          <Stack direction="row" justifyContent="center" sx={{ mt: 1 }}>
            <Button
              type="button"
              size="small"
              disabled={loading || resending}
              onClick={handleResendConfirmation}
            >
              {resending ? 'Yuborilmoqda...' : 'Tasdiqlash xatini qayta yuborish'}
            </Button>
          </Stack>

          <Typography
            variant="caption"
            sx={{
              display: 'block',
              textAlign: 'center',
              color: '#888',
              mt: 1,
            }}
          >
            Yoki Supabase ichida email tasdiqlashni o`chiring: Authentication {'>'} Providers {'>'} Email.
          </Typography>
        </Card>
      </Container>
    </Box>
  );
}
