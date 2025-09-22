import { Schema, model, Types } from 'mongoose';

const MembershipSchema = new Schema({
  companyId: { type: Types.ObjectId, ref: 'Company', required: true },
  userId:    { type: Types.ObjectId, ref: 'User', required: true },
  role:      { type: String, enum: ['admin', 'manager', 'subcontractor', 'worker'], required: true },
  status:    { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  startedAt: { type: Date, default: Date.now },
  endedAt:   { type: Date }
}, { timestamps: true });

MembershipSchema.index({ companyId: 1, userId: 1 }, { unique: true });

export default model('Membership', MembershipSchema);
