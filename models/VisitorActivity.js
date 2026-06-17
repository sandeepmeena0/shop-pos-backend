import mongoose from 'mongoose';

const visitorActivitySchema = new mongoose.Schema({
  action: { type: String, required: true },
  ipAddress: { type: String },
  userAgent: { type: String },
  referrer: { type: String },
  timestamp: { type: Date, default: Date.now }
});

// Compound index for deduplication check on /api/activity/log
visitorActivitySchema.index({ action: 1, ipAddress: 1, timestamp: -1 });

// Index on timestamp to optimize sorting and listing
visitorActivitySchema.index({ timestamp: -1 });

const VisitorActivity = mongoose.model('VisitorActivity', visitorActivitySchema);
export default VisitorActivity;
