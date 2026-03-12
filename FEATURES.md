# ShopPOS - Complete Feature Documentation

## 🔐 Authentication & Access

### Login Page
- **Email/Password login** via Supabase Auth
- Professional card-based design
- Error messaging for invalid credentials
- Demo credentials pre-configured
- Secure JWT token handling
- Session persistence

### User Account
- View logged-in user in top-right menu
- Logout functionality
- Account settings page
- Settings saved to local preferences

---

## 📊 Dashboard

### Real-Time Metrics (KPI Cards)
1. **Today's Sales** - Sum of all sales from midnight
2. **Total Revenue** - Lifetime revenue across all sales
3. **Total Products** - Count of products in inventory
4. **Total Customers** - Count of registered customers
5. **Total Debt** - Outstanding credit balance
6. **Active Debtors** - Number of customers with pending debt
7. **Low Stock Items** - Products below minimum threshold
8. **Estimated Profit** - Revenue minus estimated costs

### Charts & Visualizations
- **Sales Trend Chart** - Line chart of last 30 days
- **Data Points** - Date and amount for each day
- **Interactive Tooltip** - Hover to see exact values
- **Color Coding** - Blue gradient for professional look

### Quick Actions
- **New Sale Button** - Jump to POS page
- **Manage Products** - Go to inventory management
- **View Debtors** - Check credit ledger

### Responsive Design
- Desktop: All cards in grid layout
- Tablet: 2-column layout
- Mobile: Stacked single column

---

## 🛒 Point of Sale (POS)

### The Core Cashier Interface

#### Left Panel: Product Selection

**Barcode Scanner Input**
- Accepts keyboard input from barcode readers
- On Enter key: Searches for matching product
- Auto-adds to cart if found
- Shows error if not found
- Auto-clears after scan

**Product Search**
- Autocomplete field
- Search by product name or barcode
- Shows matching products in dropdown
- Click to select product

**Product Details Card** (when selected)
- Product name and barcode
- Selling price displayed prominently
- Current stock level with color indicator
- For weighted products: Weight input field
- Quantity controls (-, number input, +)
- **Add to Cart** button (primary action)

**Popular Items Grid**
- Shows 8 most recent products
- Quick-click buttons for fast entry
- Product name and price
- Ideal for frequently sold items

#### Right Panel: Cart & Checkout

**Cart Display**
- Scrollable list of cart items
- Product name and variant info
- Quantity or weight × quantity
- Line item total
- Delete button per item

**Order Summary**
- **Subtotal** - Sum of all items
- **Total** - Final amount (after discount)
- Large, prominent total display
- Color-coded (blue for emphasis)

**Action Buttons**
- **Checkout** (Primary) - Proceed to payment
- **Clear Cart** (Secondary) - Empty cart with confirmation

#### Payment Dialog

**Payment Breakdown**
- Shows final total amount
- Displays previous subtotal for reference

**Payment Method Selection**
- Cash (default)
- Debit/Credit Card
- Credit (Debt) - Creates debt record

**Discount Field**
- Optional discount amount
- Reduces final total
- Useful for loyalty discounts

**Confirmation**
- Shows amount before payment
- Complete Sale button
- Processing state during submission
- Success message on completion

### Advanced Features

**Weighted Product Support**
- For kg/liter products: Shows weight input
- Calculates: quantity × weight × price_per_unit
- Example: 2.5 kg of rice @ $3/kg = 7.5kg total × $3 = $22.50

**Stock Validation**
- Prevents selling more than available
- Shows out-of-stock items in red
- Warning before checkout if low stock

**Multi-Item Transactions**
- Add multiple products
- Edit quantity for any item
- Remove items as needed
- See running total

**Credit Sale Workflow**
- Select "Credit (Debt)" payment
- System creates customer record if new
- Debt automatically created/updated
- Customer can pay later

---

## 📦 Product Management

### Products List (Data Grid)

**Columns Displayed**
- Product Name
- Barcode
- Category
- Unit Type
- Buy Price (wholesale cost)
- Sell Price (customer price)
- Stock Level (with color chip)
  - Green: Adequate stock
  - Red: Low stock warning
- Actions (Edit/Delete)

**Features**
- **Search** - Filter by name or barcode
- **Sort** - Click any column header
- **Paginate** - 10 rows per page (configurable)
- **Row Actions** - Edit or Delete

### Add Product Dialog

**Form Fields**
1. **Product Name** (required)
2. **Barcode** (optional, unique)
3. **Category** (dropdown selection)
4. **Unit Type** (piece, kg, liter, pack, box, dozen)
5. **Buy Price** - Wholesale/cost price
6. **Sell Price** - Retail customer price
7. **Stock Quantity** - Initial inventory
8. **Minimum Stock Alert** - Threshold for warnings

**Validation**
- All prices must be non-negative
- Product name required
- Stock must be valid number
- Real-time error messages

**Submit Options**
- Create Product (new)
- Update Product (edit)
- Cancel and discard

### Edit Product

- Same form as Add
- Pre-populated with current values
- Update any field
- Delete option available

### Quick Actions per Product
- **Edit** - Modify product details
- **Delete** - Remove from inventory (with confirmation)
- **View** - See full details (not implemented yet)

### Stock Management Features
- **Real-time Updates** - Stock decrements on sale completion
- **Low Stock Alerts** - Dashboard shows count
- **Visual Indicators** - Red chips for low stock
- **Minimum Threshold** - Customizable per product

---

## 👥 Customers

### Customer List (Data Grid)

**Columns**
- First Name
- Last Name
- Phone Number (with icon)
- Notes
- Created Date
- Actions (Edit/Delete)

**Features**
- **Search** - By name or phone
- **Sort** - Click any header
- **Paginate** - 10 rows per page
- **Quick View** - See phone and notes at a glance

### Add/Edit Customer Dialog

**Form Fields**
1. **First Name** (required)
2. **Last Name** (required)
3. **Phone Number** (optional)
4. **Notes** (optional, multiline)

**Uses**
- Reference for credit sales
- Contact information storage
- Order history tracking
- Debt ledger association

### Customer Workflows
- **Credit Sale** - Customer selected/created during checkout
- **Debt Tracking** - All debts linked to customer
- **Payment History** - Payments tracked per customer
- **Contact Management** - Store preferences and notes

---

## 💳 Debtors & Credit Ledger

### Debtors List View

**Debtor Cards** (visual, click-based)

Each card shows:
- **Customer Name** (Full name)
- **Phone Number**
- **Total Debt** - Amount borrowed (in red)
- **Paid Amount** - Money already returned (in green)
- **Remaining Balance** - Still owed (in orange)
- **Last Transaction Date** - Most recent activity
- **Quick Actions** - View Details link

**Card Interactions**
- Click card to view full details
- Hover effects for interactivity
- Color-coded amounts for quick scanning
- Date info for reference

### Debtor Details View

**Header Section**
- Customer name prominently displayed
- Phone number
- **Record Payment** button (primary action)

**Balance Summary**
- Total Debt Amount (e.g., $500.00)
- Paid Amount (e.g., $200.00)
- Remaining Balance (e.g., $300.00)
- Visual breakdown of amounts

**Transaction History Table**

Columns:
- Date - When transaction occurred
- Type - "Debt Charge" or "Payment"
- Amount - How much (color-coded)
  - Charges in red with + prefix
  - Payments in green with - prefix
- Notes - Additional context

Example Transactions:
```
2024-01-10 | Debt Charge | +$500.00 | Initial sale
2024-01-15 | Payment     | -$200.00 | Cash payment
2024-01-20 | Debt Charge | +$150.00 | Second purchase
2024-01-25 | Payment     | -$350.00 | Check payment
```

### Payment Recording Dialog

**Current Balance Display**
- Shows remaining amount to pay
- Updated in real-time

**Payment Form**
1. **Payment Amount** - How much to record
   - Max: Remaining balance
   - Validation prevents overpayment
2. **Notes** - Optional transaction notes
   - Record payment method or reference

**Processing**
- Validates amount
- Updates debt_entries table
- Recalculates balance
- Updates debt status
- Shows success message

**Debt Status Updates**
- **Pending** - Still owes money
- **Partial** - Some paid, some remaining
- **Cleared** - Fully paid off

### Credit Sale Creation

**During Checkout:**
1. Select "Credit (Debt)" payment method
2. Enter customer name and phone
3. Complete sale
4. System automatically:
   - Creates customer (if new)
   - Creates debt record
   - Sets initial balance = total amount
   - Records first charge entry
   - Customer appears in debtors list

---

## 📋 Sales History

### Sales List (Data Grid)

**Columns Displayed**
- **Date** - When sale occurred
- **Customer** - Linked customer name or "Walk-in"
- **Amount** - Total sale amount (in blue)
- **Payment Method** - Cash, Card, or Credit
- **Type** - Sale or Credit (debt)
- **Actions** - View Details or Print

**Filtering & Search**
- **Date Range** - From date to date selector
- **Payment Method** - Dropdown: All/Cash/Card/Credit
- **Clear Filters** - Reset all filters

**Sorting & Pagination**
- Click any column header to sort
- 10 rows per page
- Navigate pages at bottom

### Sale Details Dialog

**Sale Information**
- Transaction date and time
- Customer name or walk-in
- Payment method badge

**Items Sold** (Table)
- Item name
- Quantity sold
- Unit price
- Line total

**Financial Summary**
- Subtotal (before discount)
- Discount amount (if applied)
  - Only shows if > 0
- **Total Amount** (final payment)
- Payment method emphasized

**Actions**
- **Print Receipt** - HTML print to printer or PDF
- **Close** - Return to sales list

### Receipt Printing

**Receipt Format**
- Professional receipt layout
- ShopPOS header and title
- Transaction date/time
- Customer information
- Itemized list
- Subtotal, discount, total
- Payment method

**Output Options**
- Print to physical printer
- Save as PDF
- Email recipient (browser dependent)

---

## ⚙️ Settings

### Account Information
- **Display Email** - Logged-in user email (read-only)
- Cannot change email in app (use Supabase dashboard)

### Preferences
- **Dark Mode Toggle** - Prepare for dark mode
- **Notifications Toggle** - Enable/disable alerts
- **Save Button** - Persist preferences

### About Section
- Application Name: ShopPOS
- Version: 1.0.0
- Description: Premium POS System

### Logout
- **Logout Button** - Sign out and return to login
- Clears session
- Redirects to login page

---

## 🎯 Feature Comparison Matrix

| Feature | Status | Details |
|---------|--------|---------|
| Barcode Scanning | ✅ Complete | Keyboard input, auto-add |
| Weighted Products | ✅ Complete | kg, liter, custom units |
| Credit Sales | ✅ Complete | Track debt, record payments |
| Stock Management | ✅ Complete | Auto-deduct, low stock alerts |
| Multi-Payment | ✅ Complete | Cash, Card, Credit options |
| Customer Database | ✅ Complete | Store info, link to sales |
| Sales History | ✅ Complete | Filter, view details, print |
| Dashboard Analytics | ✅ Complete | Charts, KPIs, trends |
| Receipt Printing | ✅ Complete | HTML print, receipt format |
| Responsive Design | ✅ Complete | Mobile, tablet, desktop |
| Authentication | ✅ Complete | Secure login, session mgmt |

---

## 🚀 Workflow Examples

### Example 1: Regular Customer Cash Sale
```
1. Customer arrives with items
2. Go to POS page
3. Scan first item barcode
   → Auto-adds to cart
4. Scan second item
   → Added to cart
5. Click Checkout
6. Select Cash payment
7. Click Complete Sale
8. Success! Item shows in Sales History
9. Stock automatically decreased
```

### Example 2: Weighted Product Sale
```
1. Search for "Rice"
2. Select Rice product
3. Weight field appears
4. Enter: 2.5 (kg)
5. Quantity: 1
6. Price automatically: 2.5 × $3/kg = $7.50
7. Add to cart
8. Checkout normally
```

### Example 3: Credit Sale with Debt
```
1. Customer buys on credit
2. Add items to cart
3. Total: $500
4. Click Checkout
5. Select "Credit (Debt)"
6. Enter: John Doe, 555-1234
7. Complete Sale
8. System creates:
   - Customer record
   - Debt record ($500)
   - First charge entry
9. Later, customer pays:
   - Go to Debtors
   - Click John Doe
   - Record Payment: $200
   - Balance now: $300
10. Repeat until cleared
```

### Example 4: Low Stock Alert
```
1. Dashboard shows: "5 Low Stock Items"
2. Click notification
3. Go to Products page
4. Filter by low stock
5. See which items need reorder
6. Click Edit to increase stock
7. System alerts on POS if trying to over-sell
```

---

## 🎨 UI Component Details

### Cards
- Rounded corners (12px)
- Subtle borders (light gray)
- Hover effects
- Responsive padding

### Buttons
- Rounded corners (8px)
- Smooth hover animations
- Color-coded (primary/secondary/error)
- Full-width or fixed width

### Tables
- Alternating row colors
- Hover highlighting
- Sortable headers
- Paginated rows

### Forms
- Clear labels
- Helper text for guidance
- Error messages below field
- Consistent spacing

### Dialogs
- Centered on screen
- Overlay background
- Modal (must close/confirm)
- Smooth animations

### Data Grid (MUI X)
- Professional enterprise style
- Toolbar with filters
- Column customization ready
- Export ready (add in code)

---

## 📈 Performance Metrics

These numbers are tracked and displayed:
- Transactions per day
- Revenue per transaction
- Average transaction value
- Payment method distribution
- Customer repeat rate
- Stock turnover
- Debt aging (days overdue)

---

## 🔐 Permission Model

Current: Single user (admin/cashier)

Future enhancements:
- Manager: Full access
- Cashier: POS + view sales
- Viewer: Read-only dashboard
- Accountant: Full reports

---

## ✅ Quality Checklist

Each feature includes:
- ✅ Input validation
- ✅ Error handling
- ✅ Loading states
- ✅ Success confirmations
- ✅ Responsive design
- ✅ Accessible (ARIA labels)
- ✅ Type safety
- ✅ Error messages
- ✅ Clean UX

---

This comprehensive feature set provides everything needed for a professional retail POS system.

See [README.md](README.md) for installation and [ARCHITECTURE.md](ARCHITECTURE.md) for technical details.
