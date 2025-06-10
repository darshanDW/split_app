const express = require('express');
const { User, Expense, Account } = require('../db');
const router = express.Router();


// List all people (users)
router.get('/people', async (req, res) => {
  try {
    const users = await User.find({});
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch users', error });
  }
});

router.post('/expenses', async (req, res) => {
  try {
    const { amount, description, paid_by, split, split_type,category } = req.body;

    // Validation
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Amount must be positive' });
    if (!description || !description.trim()) return res.status(400).json({ success: false, message: 'Description required' });
    if (!paid_by) return res.status(400).json({ success: false, message: 'paid_by is required' });
    if (!split || !Array.isArray(split) || split.length === 0) return res.status(400).json({ success: false, message: 'Split details required' });

    // Normalize split to exact amounts
    let splitWithAmounts;
    if (split_type === 'equal') {
      const share = parseFloat((amount / split.length).toFixed(2));
      splitWithAmounts = split.map(s => ({ user: s.user, share }));
    } else if (split[0].percent !== undefined) {
      splitWithAmounts = split.map(s => ({
        user: s.user,
        share: parseFloat(((s.percent / 100) * amount).toFixed(2))
      }));
    } else if (split[0].share !== undefined) {
      splitWithAmounts = split;
      const total = split.reduce((sum, s) => sum + s.share, 0);
      if (Math.abs(total - amount) > 0.01) {
        return res.status(400).json({ success: false, message: 'Split shares do not add up to total amount' });
      }
    } else {
      return res.status(400).json({ success: false, message: 'Invalid split format' });
    }

    // Ensure users exist or create them
    const paidByUser = await User.findOneAndUpdate({ name: paid_by }, { name: paid_by }, { upsert: true, new: true });
    for (const s of splitWithAmounts) {
      await User.findOneAndUpdate({ name: s.user }, { name: s.user }, { upsert: true, new: true });
    }

    // Map split to user ObjectIds
    const splitWithIds = await Promise.all(splitWithAmounts.map(async s => {
      const u = await User.findOne({ name: s.user });
      return { user: u._id, share: s.share };
    }));

    const expense = new Expense({
      amount,
      description,
      paid_by: paidByUser._id,
      split: splitWithIds,
      category
    });
    await expense.save();

    res.json({ success: true, data: expense, message: 'Expense added successfully' });
  } catch (error) {
    console.error('Error adding expense:', error);
    res.status(500).json({ success: false, message: 'Failed to add expense', error });
  }
});
// List all expenses
router.get('/expenses', async (req, res) => {
  try {
    const expenses = await Expense.find({}).populate('paid_by').populate('split.user');
    res.json({ success: true, data: expenses });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch expenses', error });
  }
});

// Update an expense
// Update an expense
router.put('/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
  
    const { amount, description, split, split_type,category } = req.body;
    const update = {};

    if (amount) update.amount = amount;
    if (description) update.description = description;
    if (category) update.category = category;

    if (split) {
      // Normalize split to exact amounts
      let splitWithAmounts;
      if (split_type === 'equal') {
        const share = parseFloat((amount / split.length).toFixed(2));
        splitWithAmounts = split.map(s => ({ user: s.user, share }));
      } else if (split[0].percent !== undefined) {
        splitWithAmounts = split.map(s => ({
          user: s.user,
          share: parseFloat(((s.percent / 100) * amount).toFixed(2))
        }));
      } else if (split[0].share !== undefined) {
        splitWithAmounts = split;
        const total = split.reduce((sum, s) => sum + s.share, 0);
        if (Math.abs(total - amount) > 0.01) {
          return res.status(400).json({ success: false, message: 'Split shares do not add up to total amount' });
        }
      } else {
        return res.status(400).json({ success: false, message: 'Invalid split format' });
      }

      // Ensure users exist or create them
      for (const s of splitWithAmounts) {
        await User.findOneAndUpdate({ name: s.user }, { name: s.user }, { upsert: true, new: true });
      }

      // Map split to user ObjectIds
      const splitWithIds = await Promise.all(splitWithAmounts.map(async s => {
        const u = await User.findOne({ name: s.user });
        return { user: u._id, share: s.share };
      }));

      update.split = splitWithIds;
    }

    const expense = await Expense.findByIdAndUpdate(id, update, { new: true });
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });

    res.json({ success: true, data: expense, message: 'Expense updated successfully' });
  } catch (error) {
    console.log(error)
    res.status(500).json({ success: false, message: 'Failed to update expense', error });
  }
});
// Delete an expense
router.delete('/expenses/:id', async (req, res) => {
  try {
    const id = req.params.id.trim(); // <-- Trim whitespace/newlines
    const expense = await Expense.findByIdAndDelete(id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });

    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete expense', error });
  }
});

// Get balances for each person
router.get('/balances', async (req, res) => {
  try {
    // Calculate balances
    const users = await User.find({});
    const expenses = await Expense.find({});
if (expenses.length === 0) {
      return res.json({ success: true, data: users.reduce((acc, u) => ({ ...acc, [u.name]: 0 }), {}) });
    }
    const balances = {};
    users.forEach(u => balances[u.name] = 0);

    for (const exp of expenses) {
      const paidBy = await User.findById(exp.paid_by);
      balances[paidBy.name] += exp.amount;
      for (const s of exp.split) {
        const user = await User.findById(s.user);
        balances[user.name] -= s.share;
      }
    }

    res.json({ success: true, data: balances });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to calculate balances', error });
  }
});

// Get settlement summary (who owes whom)
router.get('/settlements', async (req, res) => {
  try {
    // Calculate balances
    const users = await User.find({});
    const expenses = await Expense.find({});

    const balances = {};
    users.forEach(u => balances[u.name] = 0);

    for (const exp of expenses) {
      const paidBy = await User.findById(exp.paid_by);
      balances[paidBy.name] += exp.amount;
      for (const s of exp.split) {
        const user = await User.findById(s.user);
        balances[user.name] -= s.share;
      }
    }

    // Settlement logic: minimize transactions
    const creditors = [];
    const debtors = [];
    for (const [name, balance] of Object.entries(balances)) {
      if (balance > 0.01) creditors.push({ name, balance });
      else if (balance < -0.01) debtors.push({ name, balance: -balance });
    }

    const settlements = [];
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const min = Math.min(debtors[i].balance, creditors[j].balance);
      settlements.push({
        from: debtors[i].name,
        to: creditors[j].name,
        amount: Math.round(min * 100) / 100
      });
      debtors[i].balance -= min;
      creditors[j].balance -= min;
      if (debtors[i].balance < 0.01) i++;
      if (creditors[j].balance < 0.01) j++;
    }

    res.json({ success: true, data: settlements });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to calculate settlements', error });
  }
});
// Get category-wise spending summary
router.get('/expenses/category-summary', async (req, res) => {
  try {
    const summary = await Expense.aggregate([
      {
        $group: {
          _id: "$category",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      }
    ]);
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get category summary', error });
  }
});

module.exports = router;