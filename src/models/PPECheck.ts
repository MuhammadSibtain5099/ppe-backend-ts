import { Schema, model, Types } from 'mongoose';
const PPECheckSchema = new Schema({
  companyId:   { type:Types.ObjectId, ref:'Company', required:true },
  taskId:      { type:Types.ObjectId, ref:'Task',    required:true },
  workerId:    { type:Types.ObjectId, ref:'Worker',  required:true },
  checkedById: { type:Types.ObjectId, ref:'User',    required:true },
  ts:          { type:Date, default:Date.now },
  result:      { type:String, enum:['pass','fail','partial'], required:true },
  jsonBlobUrl: String,
  evidenceHash: Buffer
},{ timestamps:true });
export default model('PPECheck', PPECheckSchema);
