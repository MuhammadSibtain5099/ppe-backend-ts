import { Schema, model } from 'mongoose';
const UserSchema = new Schema({
  email: { type:String, required:true, unique:true },
  name: String,
  passwordHash: { type:String, required:true },
  nationalIdHash: { type: Buffer } // optional for worker users
},{ timestamps:true });
export default model('User', UserSchema);
