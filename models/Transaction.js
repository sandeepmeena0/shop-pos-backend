import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  receiptNumber: { type: String, required: true, unique: true },
  type: { type: String, enum: ['SALE', 'RETURN'], default: 'SALE' },
  parentTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 }
  }],
  totalAmount: { type: Number, required: true },
  discount: { type: Number, default: 0, min: 0 },
  taxAmount: { type: Number, default: 0 },
  taxRate: { type: Number, default: 0, min: 0 },
  finalAmount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['Cash', 'Card', 'UPI'], required: true },
  cashierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reason: { type: String }
}, { timestamps: true });

transactionSchema.index({ createdAt: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
