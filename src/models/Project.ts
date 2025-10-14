// src/models/Project.ts
import { Schema, model, Types, InferSchemaType } from 'mongoose';

const ProjectSchema = new Schema({
  companyId:   { type: Types.ObjectId, ref: 'Company', required: true },
  name:        { type: String, required: true },
  description: { type: String },
  deletedAt:   { type: Date }
}, { timestamps: true });

export type Project = InferSchemaType<typeof ProjectSchema>;
export default model<Project>('Project', ProjectSchema);
