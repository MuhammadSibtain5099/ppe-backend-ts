import { Schema, model } from 'mongoose';
const CompanySchema = new Schema({ name: {type:String, required:true}, domain:String }, { timestamps:true });
export default model('Company', CompanySchema);
