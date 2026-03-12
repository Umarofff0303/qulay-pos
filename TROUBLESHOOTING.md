# ShopPOS - Troubleshooting Guide

## Common Issues & Solutions

### Installation Issues

#### "npm ERR! code ERESOLVE"
**Problem:** Dependency resolution conflict

**Solution:**
```bash
npm install --legacy-peer-deps
```

Or use a newer Node.js version (18.x or 20.x):
```bash
node --version  # Check current
npm install     # Try again
```

---

#### "Cannot find module '@mui/material'"
**Problem:** Dependencies not fully installed

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

---

### Environment & Configuration

#### "NEXT_PUBLIC_SUPABASE_URL is undefined"
**Problem:** Missing or incorrect environment variables

**Solution:**
1. Check `.env.local` file exists in project root
2. Verify variables are correct:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   ```
3. Restart dev server:
   ```bash
   Ctrl+C (to stop)
   npm run dev
   ```

**If still not working:**
- Go to Supabase dashboard
- Check Settings → API
- Copy fresh credentials
- Paste into `.env.local`
- Restart server again

---

#### ".env.local file missing"
**Solution:**
```bash
cp .env.example .env.local
```

Then fill in your Supabase credentials.

---

### Authentication Issues

#### "Invalid login credentials" / Login fails
**Problem:** User doesn't exist or wrong password

**Solution 1: User doesn't exist**
1. Open Supabase dashboard
2. Go to Authentication → Users
3. Click "Add user"
4. Enter email: `test@example.com`
5. Enter password: `password`
6. Toggle "Auto generate password" OFF
7. Click "Save"
8. Try login again

**Solution 2: Wrong email/password**
- Double-check credentials are exactly correct
- No spaces before/after email
- Password is case-sensitive

**Solution 3: User exists but can't login**
1. Delete and recreate user
2. Make sure Supabase Auth is enabled
3. Check email confirmation isn't required (Settings → Auth)

---

#### "Stuck on loading screen"
**Problem:** Auth check is hanging

**Solution:**
1. Check browser console (F12)
2. Look for error messages
3. Clear browser cache:
   - Chrome: Settings → Privacy → Clear browsing data
   - Firefox: Settings → Privacy → Clear data
4. Try incognito/private window
5. If still issues:
   ```bash
   # Restart dev server
   Ctrl+C
   npm run dev
   ```

---

#### "Token expired" / "Session invalid"
**Problem:** JWT token expired or invalid

**Solution:**
1. Logout by clicking user menu → Logout
2. Log back in
3. Token will be refreshed

---

### Database Issues

#### "Database connection failed"
**Problem:** Can't connect to Supabase

**Solution:**
1. Check internet connection
2. Verify Supabase URL in `.env.local`
3. Check Supabase project is active (not paused)
4. Go to Supabase dashboard and verify project status
5. In SQL Editor, run test query:
   ```sql
   SELECT COUNT(*) FROM products;
   ```
6. If SQL fails: database schema not created yet

---

#### "Products table doesn't exist"
**Problem:** Database schema not imported

**Solution:**
1. Open Supabase dashboard
2. Go to SQL Editor
3. Click "New Query"
4. Copy entire contents of `database.sql` file
5. Paste into SQL editor
6. Click "Run" button
7. Wait for completion
8. Verify with:
   ```sql
   SELECT TABLE_NAME FROM information_schema.TABLES 
   WHERE TABLE_SCHEMA = 'public';
   ```

---

#### "No products showing on POS"
**Problem:** Database is empty or not connected

**Solutions:**

**Check 1: Database has data**
```sql
SELECT COUNT(*) as total_products FROM products;
```
Should return: `5` (sample products)

**Check 2: Connection working**
Try adding product via Products page UI:
1. Go to Products
2. Click "Add Product"
3. Fill form
4. Click "Create Product"
5. Should appear in list immediately

**Check 3: Query permissions**
Verify RLS (Row Level Security) policies:
1. Go to Supabase → Authentication → Policies
2. Should see policies allowing SELECT
3. If missing, re-run `database.sql`

---

#### "Insert product fails"
**Problem:** Insert permissions issue or validation error

**Solutions:**

**Check 1: Validation errors**
- All required fields filled?
- Prices are valid numbers?
- Product name not empty?
- Barcode unique (no duplicates)?

**Check 2: Database permissions**
Run in Supabase SQL Editor:
```sql
INSERT INTO products (name, sell_price, unit_type, stock_quantity) 
VALUES ('Test', 9.99, 'piece', 10);
```

If this fails: Permission issue, need to enable insert policy

**Check 3: Re-run schema**
```bash
# Copy database.sql
# Go to Supabase SQL Editor
# Paste entire file
# Click Run
```

---

### POS / Cashier Issues

#### "Barcode scan not working"
**Problem:** Barcode scanner input not registering

**Solutions:**

**Check 1: Barcode input focused**
- Click in barcode input field
- Input field should be blue/highlighted
- If not: Click on it

**Check 2: Barcode not in system**
- Check if product actually exists
- Search manually: Products page
- If missing: Add product first

**Check 3: Product barcode format**
- Sample barcodes: "001", "002", "003", etc.
- Make sure barcode in product matches exactly
- No extra spaces

**Check 4: Scanner configuration**
- Test with keyboard: Type "001" and press Enter
- If works: Scanner type is fine
- If not: Focus issue

---

#### "Add to cart not working"
**Problem:** Click add button but nothing happens

**Solutions:**
1. Select product first (should show blue card)
2. Check quantity > 0
3. For weighted products: Enter weight first
4. Check browser console for errors (F12)
5. Try refreshing page

---

#### "Cart won't checkout"
**Problem:** Checkout button disabled or doesn't work

**Solutions:**
1. Cart must have items (not empty)
2. All items must have valid stock
3. If payment fails:
   - Check Supabase connection
   - Check database has sales table
   - Try again in 5 seconds
4. Check browser console for specific error

---

#### "Receipt won't print"
**Problem:** Print dialog doesn't open or PDF save doesn't work

**Solutions:**
1. Try different browser (Chrome recommended)
2. Check pop-ups aren't blocked:
   - Chrome: Settings → Privacy → Site settings → Pop-ups → Allow
3. Try print to PDF first, then save
4. Try Firefox if Chrome fails

---

### Product Management Issues

#### "Can't delete product"
**Problem:** Delete fails silently

**Solutions:**
1. Try again - may be timing issue
2. Check if product is in active sale:
   - Wait a moment
   - Try delete again
3. Refresh page and try again
4. Check Supabase permissions

---

#### "Edit product doesn't save"
**Problem:** Click save but changes don't appear

**Solutions:**
1. Wait a few seconds (API call processing)
2. Refresh page (F5)
3. Check all fields have valid values
4. Check for error message (might be hidden)
5. Try different browser

---

#### "Low stock not alerting"
**Problem:** Dashboard shows high stock despite setting minimum_stock

**Solutions:**
1. Dashboard only checks: `stock < minimum_stock`
2. Check actual stock amount:
   - Go to Products page
   - Verify "Stock" column value
   - Edit product to see full details
3. Update minimum_stock higher:
   - Edit product
   - Increase minimum_stock value
4. Refresh dashboard

---

### Customer & Debt Issues

#### "Can't create customer"
**Problem:** Add customer fails

**Solutions:**
1. First and last name are required
2. Phone is optional
3. Check all text fields aren't empty
4. Try different names (no special characters)
5. Check browser console for errors

---

#### "Debt not appearing"
**Problem:** Create credit sale but no debt shows in Debtors

**Solutions:**
1. Must select "Credit (Debt)" payment method
2. Must enter customer name
3. Wait a few seconds for database update
4. Refresh Debtors page (F5)
5. Check customer was created:
   - Go to Customers page
   - Search for customer name
   - Should be there

---

#### "Can't record payment"
**Problem:** Record payment button not working

**Solutions:**
1. Must view debtor details first:
   - Go to Debtors
   - Click on debtor card
2. Must have remaining balance > 0
3. Payment amount must be:
   - Greater than 0
   - Less than or equal to remaining balance
4. Try refreshing page first

---

#### "Payment amount rejected"
**Problem:** Payment amount shows error

**Solutions:**
- Amount must be: `0 < amount ≤ remaining_balance`
- Can't pay more than you owe
- Can't pay $0
- Use decimal format: `10.50`

---

### Sales History Issues

#### "No sales showing"
**Problem:** Sales list is empty

**Solutions:**
1. Must have completed at least one sale
2. Try making test sale:
   - Go to POS
   - Add product
   - Checkout
3. Refresh Sales page (F5)
4. Check date filters aren't too restrictive:
   - Clear all filters
   - Check "From Date" and "To Date"

---

#### "Sales history filtered wrong"
**Problem:** Can't find specific sales

**Solutions:**
1. Clear all filters first (button at top)
2. Check date range includes your sale date
3. Payment method filter: "All Methods" to see everything
4. Use exact date format: YYYY-MM-DD

---

#### "Receipt print looks wrong"
**Problem:** Receipt doesn't format correctly

**Solutions:**
1. Preview in print dialog before printing
2. Adjust margins: Print settings → More settings
3. Try "Save as PDF" first to review
4. Receipt template may need tweaking in code

---

### Performance Issues

#### "App is slow"
**Problem:** Sluggish interface, slow data loading

**Solutions:**
1. Check internet connection speed
2. Try different browser (Chrome usually fastest)
3. Close other tabs/apps consuming RAM
4. Clear browser cache:
   - Chrome: Ctrl+Shift+Delete
   - Firefox: Ctrl+Shift+Delete
5. Restart dev server:
   ```bash
   Ctrl+C
   npm run dev
   ```

---

#### "Data Grid takes forever to load"
**Problem:** Tables with many rows are slow

**Solutions:**
1. Default shows 10 rows per page
2. Filter data to reduce rows:
   - Use search bar
   - Apply date filters
3. Upgrade to larger database (Supabase Pro)
4. Add indexes (contact Supabase support)

---

### Browser-Specific Issues

#### "Works in Chrome but not in Firefox"
**Problem:** Browser compatibility issue

**Solutions:**
1. Try Chrome or Edge (Chromium-based)
2. Clear Firefox cache:
   - Settings → Privacy → Clear Data
3. Try in Firefox private window
4. Update Firefox to latest version

---

#### "Mobile layout broken"
**Problem:** Responsive design not working on phone

**Solutions:**
1. Refresh page
2. Try landscape orientation
3. Try different phone browser
4. Clear browser cache
5. Check if using proxy or VPN

---

### Port Already In Use

#### "Port 3000 already in use"
**Problem:** Another process using port 3000

**Solutions:**

**Option 1: Use different port**
```bash
npm run dev -- -p 3001
```
Then visit: http://localhost:3001

**Option 2: Kill process on 3000**

**Windows:**
```bash
netstat -ano | findstr :3000
taskkill /PID [PID] /F
npm run dev
```

**Mac/Linux:**
```bash
lsof -i :3000
kill -9 [PID]
npm run dev
```

---

## Diagnostic Checklist

If something isn't working, check in order:

- [ ] Is development server running? (npm run dev)
- [ ] Can you access http://localhost:3000?
- [ ] Are environment variables set (.env.local)?
- [ ] Can you login? (test@example.com)
- [ ] Does Supabase project exist and is active?
- [ ] Did you run database.sql to create tables?
- [ ] Check browser console (F12) for errors
- [ ] Try refresh (F5)
- [ ] Try clearing cache (Ctrl+Shift+Delete)
- [ ] Try different browser
- [ ] Try private/incognito window
- [ ] Restart dev server (Ctrl+C, then npm run dev)
- [ ] Check Supabase dashboard for SQL errors

---

## Getting Help

### Resources
- Supabase Docs: https://supabase.com/docs
- MUI Docs: https://mui.com
- Next.js Docs: https://nextjs.org/docs
- TypeScript Handbook: https://www.typescriptlang.org/docs

### Before Asking for Help
1. Read error message completely
2. Check browser console (F12)
3. Look through this troubleshooting guide
4. Try diagnostic checklist above
5. Restart development server

### Useful Debug Info
When reporting issues, include:
- Error message (exact text)
- Steps to reproduce
- Browser type and version
- Operating system
- Screenshot of error
- Browser console errors (F12)

---

## Quick Reference: Most Common Fixes

| Issue | Quick Fix |
|-------|-----------|
| Page won't load | Restart: Ctrl+C, npm run dev |
| Login fails | Create user in Supabase Auth |
| Products don't show | Run database.sql in SQL Editor |
| Cart won't checkout | Ensure items are in cart |
| Debt not tracked | Select "Credit" payment, enter customer |
| Performance slow | Clear cache, close other apps |
| Port 3000 in use | npm run dev -- -p 3001 |

---

## Recovery Steps

If system is broken:

1. **Stop dev server**
   ```bash
   Ctrl+C
   ```

2. **Clear and reinstall**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Reset database** (in Supabase)
   - Delete all tables (or drop schema)
   - Re-run database.sql
   - Create test user again

4. **Clear browser**
   - Clear cache and cookies
   - Try private window
   - Try different browser

5. **Restart everything**
   ```bash
   npm run dev
   # Visit http://localhost:3000
   ```

---

Most issues resolve with a restart. If not, check you've completed SETUP.md steps correctly.

See [SETUP.md](SETUP.md) for detailed installation guide.
