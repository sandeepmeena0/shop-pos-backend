import mongoose from 'mongoose';

const visitorActivitySchema = new mongoose.Schema({
  action: { type: String, required: true },
  ipAddress: { type: String },
  userAgent: { type: String },
  referrer: { type: String },
  timestamp: { type: Date, default: Date.now }
});

const VisitorActivity = mongoose.model('VisitorActivity', visitorActivitySchema);
export default VisitorActivity;
