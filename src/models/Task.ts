import { Schema, model, Types } from 'mongoose';
const TaskSchema = new Schema({
  companyId: { type:Types.ObjectId, ref:'Company', required:true },
  projectId: { type:Types.ObjectId, ref:'Project', required:true },
  workDate:  { type:Date, required:true },
  title:String, shift:String, notes:String,
  supervisorId: { type:Types.ObjectId, ref:'User' }
},{ timestamps:true });
export default model('Task', TaskSchema);
