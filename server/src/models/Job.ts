import { Schema, model, InferSchemaType, Types } from 'mongoose';

export const STATUSES = ['wishlist', 'applied', 'interviewing', 'offer', 'rejected'] as const;
export type Status = (typeof STATUSES)[number];

const JobSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, default: '' },
    company: { type: String, default: '' },
    location: { type: String, default: '' },
    jdText: { type: String, required: true },
    sourceUrl: { type: String, default: '' },
    status: { type: String, enum: STATUSES, default: 'wishlist', index: true },
    order: { type: Number, default: 0 },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export type JobDoc = InferSchemaType<typeof JobSchema> & { _id: Types.ObjectId };
export const Job = model('Job', JobSchema);
