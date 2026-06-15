import { Schema, model, InferSchemaType } from 'mongoose';

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    masterResume: { type: String, default: '' },
    defaultModel: { type: String, default: 'meta-llama/llama-3.3-70b-instruct:free' },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: string };
export const User = model('User', UserSchema);
