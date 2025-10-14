import { Schema, model, Types } from 'mongoose';

const TaskAssignmentSchema = new Schema({
  taskId:   { type: Types.ObjectId, ref: 'Task', required: true },
  workerId: { type: Types.ObjectId, ref: 'Worker', required: true }
}, { timestamps: true });

TaskAssignmentSchema.index({ taskId:1, workerId:1 }, { unique:true });

export default model('TaskAssignment', TaskAssignmentSchema);
