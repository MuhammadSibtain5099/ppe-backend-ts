import { Schema, model } from 'mongoose';

const AddressSchema = new Schema({
  line1: String,
  city: String,
  country: String,
}, { _id: false });

const CompanySchema = new Schema({
  name:        { type: String, required: true },
  regNumber:   { type: String, required: true, unique: true }, // normalized digits-only
  domain:      { type: String, lowercase: true, trim: true },
  address:     AddressSchema,
  contactEmail:{ type: String, lowercase: true, trim: true },
  contactPhone: String,
  description: String,
  status:      { type: String, enum: ['pending','verified','rejected'], default: 'pending' } // ✅ verification status
}, { timestamps: true });

// Normalize regNumber to digits-only so uniqueness works across formats
CompanySchema.pre('validate', function (next) {
  const self = this as any;
  if (typeof self.regNumber === 'string') self.regNumber = self.regNumber.replace(/\D+/g, '');
  next();
});



export default model('Company', CompanySchema);
