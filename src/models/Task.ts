import { Schema, model, Types, InferSchemaType } from 'mongoose';

const TaskSchema = new Schema({
  companyId:   { type: Types.ObjectId, ref: 'Company', required: true },
  projectId:   { type: Types.ObjectId, ref: 'Project', required: true },
  title:       { type: String, required: true },
  workDate:    { type: Date, required: true },
  shift:       { type: String },
  notes:       { type: String },
  managerId:   { type: Types.ObjectId, ref: 'User', required: true },
  deletedAt:   { type: Date }
}, { timestamps: true });

export type Task = InferSchemaType<typeof TaskSchema>;
export default model<Task>('Task', TaskSchema);
