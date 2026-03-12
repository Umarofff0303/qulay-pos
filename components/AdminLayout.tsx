'use client';

import React, { useState } from 'react';
import {
  AppBar,
  Avatar,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  Bell,
  CreditCard,
  LogOut,
  Menu as MenuIcon,
  MoonStar,
  Package,
  Settings,
  ShoppingCart,
  Sparkles,
  SunMedium,
  Users,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppSettingsStore, useAuthStore } from '@/lib/store';

const menuItems = [
  { label: 'Boshqaruv paneli', href: '/dashboard', icon: BarChart3 },
  { label: 'Kassa', href: '/pos', icon: ShoppingCart },
  { label: 'Mahsulotlar', href: '/products', icon: Package },
  { label: 'Mijozlar', href: '/customers', icon: Users },
  { label: 'Qarzdorlar', href: '/debtors', icon: CreditCard },
  { label: 'Savdo tarixi', href: '/sales', icon: BarChart3 },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user, setUser } = useAuthStore();
  const { storeName, notificationsEnabled, themeMode, compactMode, toggleThemeMode } =
    useAppSettingsStore((state) => ({
      storeName: state.storeName,
      notificationsEnabled: state.notificationsEnabled,
      themeMode: state.themeMode,
      compactMode: state.compactMode,
      toggleThemeMode: state.toggleThemeMode,
    }));

  const drawerWidth = compactMode ? 248 : 284;
  const isDark = theme.palette.mode === 'dark';

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/login');
  };

  const drawerContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        px: 1.5,
        py: 2,
        gap: 2,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          p: compactMode ? 2 : 2.5,
          borderRadius: 4,
          background: isDark
            ? 'linear-gradient(135deg, rgba(108, 180, 255, 0.20) 0%, rgba(247, 178, 103, 0.16) 100%)'
            : 'linear-gradient(135deg, rgba(21, 112, 239, 0.14) 0%, rgba(249, 115, 22, 0.10) 100%)',
          border: `1px solid ${alpha(theme.palette.primary.main, isDark ? 0.22 : 0.12)}`,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 'auto -12px -18px auto',
            width: 72,
            height: 72,
            borderRadius: '50%',
            backgroundColor: alpha(theme.palette.secondary.main, 0.16),
            filter: 'blur(2px)',
          }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative' }}>
          <Box
            sx={{
              width: compactMode ? 42 : 48,
              height: compactMode ? 42 : 48,
              borderRadius: 3,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: isDark
                ? '0 18px 32px rgba(0, 0, 0, 0.34)'
                : '0 18px 28px rgba(21, 112, 239, 0.2)',
            }}
          >
            <Sparkles size={compactMode ? 18 : 20} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ color: theme.palette.text.secondary }}>
              Savdo boshqaruvi
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {storeName}
            </Typography>
          </Box>
        </Box>
      </Box>

      <List sx={{ flex: 1, py: 0.5 }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <ListItem key={item.href} disablePadding sx={{ mb: 0.75 }}>
              <ListItemButton
                onClick={() => {
                  router.push(item.href);
                  setMobileOpen(false);
                }}
                sx={{
                  borderRadius: 3,
                  px: compactMode ? 1.5 : 1.75,
                  py: compactMode ? 1.1 : 1.25,
                  backgroundColor: isActive
                    ? alpha(theme.palette.primary.main, isDark ? 0.16 : 0.1)
                    : 'transparent',
                  border: `1px solid ${
                    isActive
                      ? alpha(theme.palette.primary.main, isDark ? 0.26 : 0.16)
                      : 'transparent'
                  }`,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, isDark ? 0.12 : 0.08),
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
                  }}
                >
                  <Icon size={19} />
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: compactMode ? '13px' : '14px',
                    fontWeight: isActive ? 700 : 600,
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Box
        sx={{
          p: compactMode ? 1.5 : 1.75,
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
          backgroundColor: alpha(theme.palette.background.paper, isDark ? 0.66 : 0.72),
        }}
      >
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 0.75 }}>
          Interfeys holati
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Chip
            icon={themeMode === 'dark' ? <MoonStar size={14} /> : <SunMedium size={14} />}
            label={themeMode === 'dark' ? "Qorong'i" : "Yorug'"}
            color="primary"
            variant={themeMode === 'dark' ? 'filled' : 'outlined'}
          />
          <Tooltip title="Sozlamalarni ochish">
            <IconButton
              onClick={() => {
                router.push('/settings');
                setMobileOpen(false);
              }}
            >
              <Settings size={18} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: 'transparent' }}>
      {!isMobile ? (
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              borderRight: `1px solid ${alpha(theme.palette.divider, 0.85)}`,
              backgroundColor: alpha(theme.palette.background.paper, isDark ? 0.84 : 0.88),
              backdropFilter: 'blur(18px)',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer
          anchor="left"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          sx={{
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              borderRight: `1px solid ${alpha(theme.palette.divider, 0.85)}`,
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AppBar
          position="sticky"
          color="transparent"
          elevation={0}
          sx={{
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.72)}`,
          }}
        >
          <Toolbar
            sx={{
              minHeight: compactMode ? 68 : 78,
              display: 'flex',
              gap: 1.5,
            }}
          >
            {isMobile && (
              <IconButton color="inherit" onClick={() => setMobileOpen(!mobileOpen)}>
                {mobileOpen ? <X size={22} /> : <MenuIcon size={22} />}
              </IconButton>
            )}

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                POS boshqaruvi
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {storeName}
              </Typography>
            </Box>

            <Chip
              label={compactMode ? 'Ixcham UI' : 'Qulay UI'}
              variant="outlined"
              sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
            />

            <Tooltip title={notificationsEnabled ? 'Bildirishnomalar yoqilgan' : 'Bildirishnomalar o`chiq'}>
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 2.5,
                  border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                  backgroundColor: alpha(theme.palette.background.paper, 0.82),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: notificationsEnabled ? theme.palette.primary.main : theme.palette.text.secondary,
                }}
              >
                <Bell size={17} />
              </Box>
            </Tooltip>

            <Tooltip title={themeMode === 'dark' ? "Yorug' rejimga o'tish" : "Qorong'i rejimga o'tish"}>
              <IconButton
                color="inherit"
                onClick={toggleThemeMode}
                sx={{
                  border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                  backgroundColor: alpha(theme.palette.background.paper, 0.82),
                }}
              >
                {themeMode === 'dark' ? <SunMedium size={18} /> : <MoonStar size={18} />}
              </IconButton>
            </Tooltip>

            <Tooltip title={user?.email || 'Foydalanuvchi'}>
              <IconButton
                onClick={handleMenuOpen}
                sx={{
                  p: 0.25,
                  borderRadius: 3,
                  border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                  backgroundColor: alpha(theme.palette.background.paper, 0.82),
                }}
              >
                <Avatar
                  sx={{
                    width: 38,
                    height: 38,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                    fontSize: '14px',
                    fontWeight: 800,
                  }}
                >
                  {(user?.email?.[0] || storeName?.[0] || 'S').toUpperCase()}
                </Avatar>
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              PaperProps={{
                sx: {
                  minWidth: 220,
                  mt: 1.5,
                  borderRadius: 3,
                  border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                  backgroundColor: alpha(theme.palette.background.paper, 0.98),
                  backdropFilter: 'blur(18px)',
                },
              }}
            >
              <MenuItem disabled sx={{ opacity: 1 }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {storeName}
                  </Typography>
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                    {user?.email}
                  </Typography>
                </Box>
              </MenuItem>
              <Divider />
              <MenuItem
                onClick={() => {
                  handleMenuClose();
                  router.push('/settings');
                }}
              >
                <Settings size={16} style={{ marginRight: 8 }} />
                Sozlamalar
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleMenuClose();
                  handleLogout();
                }}
              >
                <LogOut size={16} style={{ marginRight: 8 }} />
                Chiqish
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            px: { xs: 2, sm: 3 },
            py: { xs: 2, sm: 3 },
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
