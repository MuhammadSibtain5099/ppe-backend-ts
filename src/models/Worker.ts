import { Schema, model, Types, InferSchemaType } from 'mongoose';
const WorkerSchema = new Schema({
  companyId:      { type:Types.ObjectId, ref:'Company', required:true },
  userId:         { type:Types.ObjectId, ref:'User' },
  nationalIdHash: { type:Buffer, required:true },
  name:String, dob:Date, phone:String, photoUrl:String
},{ timestamps:true });
WorkerSchema.index({ companyId:1, nationalIdHash:1 }, { unique:true });
export type Worker = InferSchemaType<typeof WorkerSchema>;
export default model<Worker>('Worker', WorkerSchema);
