import { Schema, model, InferSchemaType, Types } from 'mongoose';

export const KIT_KINDS = ['cover', 'bullets', 'questions', 'brief'] as const;
export type KitKind = (typeof KIT_KINDS)[number];

const KitSchema = new Schema(
  {
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    kind: { type: String, enum: KIT_KINDS, required: true },
    content: { type: String, required: true },
    model: { type: String, required: true },
  },
  { timestamps: true }
);

export type KitDoc = InferSchemaType<typeof KitSchema> & { _id: Types.ObjectId };
export const Kit = model('Kit', KitSchema);
