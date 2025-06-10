require('dotenv').config();
const mongoose = require('mongoose');
const mongourl=`mongodb+srv://darshanjadhav775:vM4qjJPfZdvKCW5x@cluster0.5wxychs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
// Connect to MongoDB
mongoose.connect(process.env.temp_db||mongourl, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("Connected to MongoDB");
}).catch(err => {
  console.error("Failed to connect to MongoDB", err);
});

const { Schema } = mongoose;

// User schema
const userSchema = new Schema({
  name: { type: String, trim: true, required: true, unique: true }
});
const User = mongoose.model('User', userSchema);

// Expense schema
const expenseSchema = new Schema({
  amount: { type: Number, required: true, min: 0.01 },
  description: { type: String, required: true, trim: true },
  paid_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  split: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    share: { type: Number, required: true, min: 0.01 } // exact amount owed by this user
  }],
   category: {
    type: String,
    enum: ['Food', 'Travel', 'Utilities', 'Entertainment', 'Other'],
    default: 'Other'
  },
  createdAt: { type: Date, default: Date.now }
});
const Expense = mongoose.model('Expense', expenseSchema);

// Account schema (for balance tracking)
const accountSchema = new Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  balance: { type: Number, required: true, default: 0 }
});
const Account = mongoose.model('Account', accountSchema);

module.exports = { User, Expense, Account };