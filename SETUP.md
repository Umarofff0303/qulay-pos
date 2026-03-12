# ShopPOS - Complete Setup Guide

This guide walks you through setting up ShopPOS from scratch.

## Prerequisites

- **Node.js 18+** - [Download](https://nodejs.org)
- **npm** (comes with Node.js)
- **Supabase Account** - [Sign Up Free](https://supabase.com)
- **Code Editor** - VS Code recommended

## Step-by-Step Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up
2. Click "New Project"
3. Choose organization and fill in:
   - Project name: `pos-app`
   - Database password: (remember this!)
   - Region: Choose closest to you
4. Click "Create new project" and wait for initialization (2-3 minutes)

### 2. Get Supabase Credentials

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy:
   - **Project URL** (under "Project URL")
   - **Anon Key** (under "public" in "Project API keys")

### 3. Setup Project on Your Computer

```bash
# Navigate to project folder
cd pos-app

# Install dependencies
npm install
```

### 4. Configure Environment Variables

1. Rename `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and replace with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   ```

### 5. Setup Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy ALL content from `database.sql` file in your project
4. Paste into the SQL editor
5. Click **Run** button

Wait for execution to complete. You should see "Success" message.

### 6. Create Test User

1. In Supabase dashboard, go to **Authentication** → **Users**
2. Click **Add User**
3. Fill in:
   - Email: `test@example.com`
   - Password: `password`
   - Auto generate password: OFF
4. Click **Save**

### 7. Start Development Server

```bash
npm run dev
```

You should see:
```
> Local:        http://localhost:3000
```

### 8. Open Application

1. Open browser: `http://localhost:3000`
2. Login with:
   - Email: `test@example.com`
   - Password: `password`
3. You should see the Dashboard

## Testing the Application

### Test POS Flow

1. Click **Point of Sale** menu
2. Search for "Rice" product
3. Click on it
4. Set quantity to 2
5. Click **Add to Cart**
6. Click **Checkout**
7. Select **Cash** as payment
8. Click **Complete Sale**
9. You should see success message

### Test Product Management

1. Click **Products** menu
2. Click **Add Product**
3. Fill in:
   - Name: "Test Product"
   - Sell Price: 10.99
   - Stock: 50
   - Unit: piece
4. Click **Create Product**
5. Product appears in list

### Test Credit Sale

1. Go to **Point of Sale**
2. Add product to cart
3. Click **Checkout**
4. Select **Credit (Debt)**
5. Enter customer name: "John Doe"
6. Click **Complete Sale**
7. Go to **Debtors** to see the debt

### Test Debt Payment

1. Click **Debtors**
2. Click on the debtor card
3. Click **Record Payment**
4. Enter payment amount
5. Click **Record Payment**
6. Balance should decrease

## Verify Installation

Check these items to ensure everything works:

- [ ] Login page loads and accepts credentials
- [ ] Dashboard shows charts and stats
- [ ] Products page displays sample products
- [ ] Can scan/search products on POS
- [ ] Cart functionality works
- [ ] Checkout completes successfully
- [ ] Sales History shows completed sale
- [ ] Debtors list shows credit sales

## Database Verification

To verify database was created correctly:

1. In Supabase, go to **SQL Editor**
2. Click **New Query**
3. Paste:
   ```sql
   SELECT * FROM products LIMIT 5;
   ```
4. Click **Run**
5. You should see 5 sample products

## Troubleshooting

### "Cannot find module '@mui/material'"
```bash
npm install
npm run dev
```

### "NEXT_PUBLIC_SUPABASE_URL is undefined"
- Check `.env.local` file exists
- Verify you pasted correct URLs
- Restart dev server: Ctrl+C then `npm run dev`

### "Invalid login credentials"
- Verify test user exists in Supabase
- Try creating new user with same steps
- Check email and password exactly match

### Products not showing
```bash
# Run SQL query in Supabase to check:
SELECT COUNT(*) FROM products;
```

### "Port 3000 already in use"
```bash
npm run dev -- -p 3001
```

### Database tables don't exist
1. Go back to Step 5
2. Re-run the entire database.sql script
3. Check for errors in execution

## Next Steps

### Customize

1. **Change colors**: Edit theme in `app/layout.tsx`
2. **Add more products**: Use Products page UI
3. **Create customers**: Use Customers page UI
4. **Modify database**: Edit `database.sql` and run in Supabase

### Deploy to Production

When ready to go live:

1. **Create Vercel account** - [vercel.com](https://vercel.com)
2. **Connect GitHub** - Push this repo to GitHub
3. **Deploy** - Import repo in Vercel
4. **Set environment variables** in Vercel settings
5. **Update Supabase** - Add Vercel domain to allowed URLs

### Add More Features

Look for `TODO` comments in code files for suggested enhancements.

## File Structure

```
pos-app/
├── app/               # Next.js pages
├── components/        # React components
├── lib/              # Utilities and stores
├── database.sql      # Database schema
├── package.json      # Dependencies
└── README.md         # Documentation
```

## Support

- **Supabase Docs**: https://supabase.com/docs
- **MUI Docs**: https://mui.com
- **Next.js Docs**: https://nextjs.org/docs

## Common Commands

```bash
# Start development
npm run dev

# Build for production
npm build

# Start production build
npm start

# Run linter
npm run lint
```

## Success Checklist

✅ Node.js installed
✅ Supabase project created
✅ Environment variables set
✅ Database schema imported
✅ Test user created
✅ Application running
✅ Can login and see dashboard
✅ Can create and view products
✅ Can process sales
✅ Can track debts

Once all items are checked, you're ready to use ShopPOS!

---

For detailed information, see [README.md](README.md)
