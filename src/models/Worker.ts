import { Schema, model, Types, InferSchemaType } from 'mongoose';

const WorkerSchema = new Schema({
  companyId:      { type: Types.ObjectId, ref: 'Company', default: null },
  userId:         { type: Types.ObjectId, ref: 'User' },
  nationalIdHash: { type: Buffer },
  name:           String,
  gender: String,
  jobDescription: String,
  dateOfBirth:    String,
  dob:            Date,
  phone:          { type: String, unique: true, sparse: true },
  photoUrl:       String,
  status:         { type: String, enum: ['independent', 'active', 'inactive'], default: 'independent' }
}, { timestamps: true });

// ✅ Enforce uniqueness only for company workers
WorkerSchema.index(
  { companyId: 1, nationalIdHash: 1 },
  {
    unique: true,
    partialFilterExpression: { companyId: { $type: 'objectId' }, nationalIdHash: { $exists: true } }
  }
);

export type Worker = InferSchemaType<typeof WorkerSchema>;
export default model<Worker>('Worker', WorkerSchema);
