import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from './supabase';

export type CartItem = {
  productId: string;
  product: Product;
  quantity: number;
  weight?: number;
  unitPrice: number;
  totalPrice: number;
};

interface CartStore {
  items: CartItem[];
  addItem: (product: Product, quantity: number, weight?: number) => void;
  removeItem: (productId: string) => void;
  updateItem: (productId: string, quantity: number, weight?: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getSubtotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  addItem: (product, quantity, weight) => {
    set((state) => {
      const existingItem = state.items.find((item) => item.productId === product.id);
      
      if (existingItem) {
        return {
          items: state.items.map((item) =>
            item.productId === product.id
              ? {
                  ...item,
                  quantity: item.quantity + quantity,
                  weight: weight ?? item.weight,
                  totalPrice: (item.quantity + quantity) * (weight ? item.unitPrice * weight : item.unitPrice),
                }
              : item
          ),
        };
      }

      const unitPrice = product.sell_price;
      const totalPrice = weight ? quantity * unitPrice * weight : quantity * unitPrice;

      return {
        items: [
          ...state.items,
          {
            productId: product.id,
            product,
            quantity,
            weight,
            unitPrice,
            totalPrice,
          },
        ],
      };
    });
  },
  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter((item) => item.productId !== productId),
    }));
  },
  updateItem: (productId, quantity, weight) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity,
              weight,
              totalPrice: weight ? quantity * item.unitPrice * weight : quantity * item.unitPrice,
            }
          : item
      ),
    }));
  },
  clearCart: () => {
    set({ items: [] });
  },
  getTotal: () => {
    return get().items.reduce((sum, item) => sum + item.totalPrice, 0);
  },
  getSubtotal: () => {
    return get().items.reduce((sum, item) => sum + item.totalPrice, 0);
  },
  getItemCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },
}));

interface AuthStore {
  user: any | null;
  loading: boolean;
  setUser: (user: any) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
}));

export type ThemeMode = 'light' | 'dark';

export type AppSettings = {
  themeMode: ThemeMode;
  compactMode: boolean;
  notificationsEnabled: boolean;
  barcodeLookupEnabled: boolean;
  autoPrintReceipt: boolean;
  currencyCode: string;
  storeName: string;
  receiptFooter: string;
  lowStockThreshold: number;
};

interface AppSettingsStore extends AppSettings {
  setThemeMode: (themeMode: ThemeMode) => void;
  toggleThemeMode: () => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

export const defaultAppSettings: AppSettings = {
  themeMode: 'light',
  compactMode: false,
  notificationsEnabled: true,
  barcodeLookupEnabled: true,
  autoPrintReceipt: false,
  currencyCode: 'UZS',
  storeName: 'ShopPOS',
  receiptFooter: 'Xaridingiz uchun rahmat!',
  lowStockThreshold: 10,
};

export const useAppSettingsStore = create<AppSettingsStore>()(
  persist(
    (set) => ({
      ...defaultAppSettings,
      setThemeMode: (themeMode) => set({ themeMode }),
      toggleThemeMode: () =>
        set((state) => ({
          themeMode: state.themeMode === 'dark' ? 'light' : 'dark',
        })),
      updateSettings: (settings) => set((state) => ({ ...state, ...settings })),
      resetSettings: () => set(defaultAppSettings),
    }),
    {
      name: 'shoppos-app-settings',
      partialize: ({
        themeMode,
        compactMode,
        notificationsEnabled,
        barcodeLookupEnabled,
        autoPrintReceipt,
        currencyCode,
        storeName,
        receiptFooter,
        lowStockThreshold,
      }) => ({
        themeMode,
        compactMode,
        notificationsEnabled,
        barcodeLookupEnabled,
        autoPrintReceipt,
        currencyCode,
        storeName,
        receiptFooter,
        lowStockThreshold,
      }),
    }
  )
);
