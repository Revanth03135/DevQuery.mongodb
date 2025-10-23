# 🚀 Quick Start: Using Whitelist Feature

## Step-by-Step Guide

### 1. Open the Whitelist Manager
- Click the **🔐 Whitelist** button in the sidebar
- A modal dialog will open

### 2. Verify Your Identity
- Enter your **DevQuery login password**
- Click **Verify Password**
- You'll see "✅ Password Verified" message

### 3. Enable Whitelist
- Click the **Enable Whitelist** button
- Status will change to "ENABLED" (in green)
- AI can now only access whitelisted tables

### 4. Add a Table to Whitelist
- Click **Add Table to Whitelist**
- A form will appear
- Select a table from the dropdown
- Click **Add Table**
- Table appears in the list below

### 5. View Table Details (Optional)
- Click on a table name to expand it
- You'll see all columns in that table
- Columns are allowed by default

### 6. Manage Columns (Advanced)
- Expand a table
- See "Allowed Columns" section
- Click **-** button next to a column to remove it
- This restricts access to specific columns

### 7. Remove a Table
- Expand the table
- Click **Remove Table**
- Click **Remove** in the confirmation dialog
- Table is removed from whitelist

### 8. Disable Whitelist
- Click **Disable Whitelist** button
- Status changes to "DISABLED" (in yellow)
- AI can access all tables again

---

## 💡 Tips

✅ **Allow all columns in a table**
- Leave columns empty (don't remove any)
- All columns will be accessible

✅ **Restrict specific columns**
- Click **-** button next to each column
- Only selected columns will be allowed

✅ **Quick security check**
- Click **Logout** button to verify password again
- Starts a fresh verification session

✅ **Empty state**
- If no tables are added, you'll see "No tables whitelisted yet"
- Add tables using "Add Table to Whitelist" button

---

## 🎯 Common Scenarios

### Scenario 1: Restrict AI to specific tables
1. Enable whitelist
2. Add only "users" and "orders" tables
3. AI can only read/write these tables

### Scenario 2: Restrict columns in sensitive table
1. Add "users" table
2. Expand "users" table
3. Click **-** on "password" column
4. AI cannot access password column

### Scenario 3: Allow all access (default)
1. Disable whitelist
2. All tables and columns are accessible

---

## ❌ Troubleshooting

| Problem | Solution |
|---------|----------|
| Can't see tables in dropdown | Click "Refresh Schema" first |
| Password verification fails | Check your login password |
| Tables not updating | Refresh the page and reopen modal |
| Can't click buttons | Make sure password is verified first |
| Column options not showing | Click on the table name to expand it |

---

## ⚠️ Important Notes

- ⚡ **All changes take effect immediately**
- 🔒 **Password verification is required** for security
- ✅ **Empty columns = all columns allowed** in that table
- 📊 **Whitelist is per database connection** (not global)
- 🎛️ **Write operations always require user confirmation** regardless of whitelist

---

## 📞 Need Help?

Check the detailed guide: `WHITELIST_IMPLEMENTATION_GUIDE.md`
