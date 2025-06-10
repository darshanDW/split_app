# Expense Splitter Backend

## Overview
A backend API for splitting expenses among groups, inspired by Splitwise. Supports adding expenses, tracking balances, settlements, and category-wise summaries.

## Local Setup

1. Clone the repo:
git clone <https://github.com/darshanDW/split_appl> cd backend

2. Install dependencies:npm install

3. Start the server:node index.js


## Deployed URL
> [https://split-app-jrw7.onrender.com/api/v1/group]

## Postman Collection
> [https://gist.github.com/darshanDW/9e390686ec4f9b38b458f8a7cb8efb96]

## API Documentation

### Expense Management
- `GET /expenses` — List all expenses
- `POST /expenses` — Add new expense
- `PUT /expenses/:id` — Update expense
- `DELETE /expenses/:id` — Delete expense

### Settlement & People
- `GET /people` — List all people
- `GET /balances` — Show each person's balance
- `GET /settlements` — Get settlement summary
- `GET /expenses/category-summary` — Category-wise spending summary

### Example Request: Add Expense
1. Equal Split

```json
{
  "amount": 600,
  "description": "Dinner at restaurant",
  "paid_by": "Shantanu",
  "split": [
 { "user": "Shantanu" },
 { "user": "Sanket" },
 { "user": "Om" }
  ],
  "split_type": "equal",
  "category": "Food"
}


2. Percentage Split
{
  "amount": 1000,
  "description": "Hotel Bill",
  "paid_by": "Shantanu",
  "split": [
    { "user": "Shantanu", "percent": 50 },
    { "user": "Sanket", "percent": 30 },
    { "user": "Om", "percent": 20 }
  ],
  "category": "Travel"
}


3. Exact Share Split

{
  "amount": 900,
  "description": "Groceries",
  "paid_by": "Om",
  "split": [
    { "user": "Shantanu", "share": 300 },
    { "user": "Sanket", "share": 400 },
    { "user": "Om", "share": 200 }
  ],
  "category": "Utilities"
}

Example Response
{
  "success": true,
  "data": { ...expenseObject },
  "message": "Expense added successfully"
}```

Settlement Logic
The settlement logic determines who owes whom and how much after all expenses have been added and split.

How It Works
Calculate Balances:

For each user, calculate their net balance:
Add the total amount they have paid for others.
Subtract the total amount they owe (their share in all expenses).
A positive balance means the user is owed money.
A negative balance means the user owes money.
Minimize Transactions:

The algorithm matches users who owe money (debtors) with users who are owed money (creditors).
It generates the minimum number of transactions needed to settle all debts.
For each debtor, pay off as much as possible to a creditor, then move to the next.
Example
Suppose after all expenses:

Shantanu: +400 (is owed ₹400)
Sanket: -200 (owes ₹200)
Om: -200 (owes ₹200)
Settlement:

Sanket pays Shantanu ₹200
Om pays Shantanu ₹200
After these transactions, all balances become zero.

Why This Logic?
Ensures everyone pays or receives exactly what they owe or are owed.
Reduces the number of transactions between users.

Known Limitations
No authentication (unless you add it)
No recurring transactions (unless you add it)
No frontend (API only)