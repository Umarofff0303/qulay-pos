# ShopPOS - Quick Start (5 Minutes)

## Installation (1 min)

```bash
npm install
```

## Supabase Setup (3 min)

### Get Credentials
1. Go to [supabase.com](https://supabase.com)
2. Create project and copy URL + Anon Key
3. Paste into `.env.local`

### Create Database
1. In Supabase SQL Editor
2. Copy `database.sql` → Paste → Run

### Create User
1. Supabase → Authentication → Users
2. Add: `test@example.com` / `password`

## Run App (1 min)

```bash
npm run dev
```

Visit: http://localhost:3000

Login: `test@example.com` / `password`

## Test Drive

1. **Dashboard** - See stats and charts
2. **Products** - View 5 sample products
3. **POS** - Scan barcode "001" → Add to cart → Checkout
4. **Sales** - See completed sale
5. **Debtors** - Create credit sale and track debt

## Next Steps

- ✏️ Edit `.env.local` with real credentials
- 📦 Add your products via Products page
- 👥 Import customers
- 🎨 Customize colors in `app/layout.tsx`
- 🚀 Deploy to Vercel when ready

See [SETUP.md](SETUP.md) for detailed guide.

---

**All sample data included. Ready to use immediately!**
