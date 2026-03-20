import mongoose from 'mongoose';

const stockHistorySchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  type: { 
    type: String, 
    enum: ['RESTOCK', 'SALE', 'RETURN', 'ADJUSTMENT', 'INITIAL'], 
    required: true 
  },
  quantity: { type: Number, required: true }, // Can be positive or negative
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reason: { type: String }
}, { timestamps: true });

stockHistorySchema.index({ createdAt: -1 });

const StockHistory = mongoose.model('StockHistory', stockHistorySchema);
export default StockHistory;
