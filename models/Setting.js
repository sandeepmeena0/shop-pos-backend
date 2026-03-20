import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema({
  storeName: { type: String, default: 'SmartPOS Store' },
  storeAddress: { type: String, default: '123 Retail Lane, Main City' },
  storePhone: { type: String, default: '+91 98765 43210' },
  taxRate: { type: Number, default: 5 },
  receiptFooter: { type: String, default: 'Thank You! Please visit us again.' },
  upiId: { type: String, default: '' },
  merchantName: { type: String, default: '' },
  themeColor: { type: String, default: '#4f46e5' },
  receiptPrefix: { type: String, default: 'RCP-' },
  returnPrefix: { type: String, default: 'RET-' },
  defaultLowStockThreshold: { type: Number, default: 10 },
  categories: { type: [String], default: ['Groceries', 'Bakery', 'Dairy', 'Electronics', 'Beverages', 'Snacks', 'General'] },
}, { timestamps: true });

const Setting = mongoose.model('Setting', settingSchema);
export default Setting;
