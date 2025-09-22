import { Schema, model, Types } from 'mongoose';

const InviteSchema = new Schema({
  companyId: { type: Types.ObjectId, ref: 'Company', required: true },
  email:     { type: String, required: true },
  role:      { type: String, enum: ['admin','manager','subcontractor','worker'], required: true },
  token:     { type: String, required: true, unique: true },
  status:    { type: String, enum: ['pending','accepted','revoked','expired'], default: 'pending' },
  expiresAt: { type: Date, required: true },
  createdBy: { type: Types.ObjectId, ref: 'User' }
}, { timestamps: true });

InviteSchema.index({ companyId: 1, email: 1, status: 1 });

export default model('Invite', InviteSchema);
