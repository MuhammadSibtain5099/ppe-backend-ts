import { Schema, model, Types, InferSchemaType } from 'mongoose';

const WorkerSchema = new Schema({
  userId:         { type: Types.ObjectId, ref: 'User' },
  nationalIdHash: { type: Buffer },
  name:           String,
  dob:            Date,
  phone:          { type: String, unique: true, sparse: true },
  photoUrl:       String,
  status:         { type: String, enum: ['independent', 'active', 'inactive'], default: 'independent' }
}, { timestamps: true });

export type Worker = InferSchemaType<typeof WorkerSchema>;
export default model<Worker>('Worker', WorkerSchema);
