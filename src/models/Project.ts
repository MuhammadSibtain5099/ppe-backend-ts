import { Schema, model, Types } from 'mongoose';
const ProjectSchema = new Schema({
  companyId: { type:Types.ObjectId, ref:'Company', required:true },
  name: { type:String, required:true },
  description: String
},{ timestamps:true });
export default model('Project', ProjectSchema);
