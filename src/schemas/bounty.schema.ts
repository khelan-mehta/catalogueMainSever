import { Schema, Document, model } from 'mongoose';

// Bounty Interface
export interface Bounty extends Document {
  createdBy: any;
  title: string;
  listedUsers: string[];
  loot?: string;
  details?: string;
  referenceLink?: string;
  days?: string;
  status?: string; // open or assigned
  acceptedId?: string;
  isSuspended?: boolean;
  creatorDetails?: string;
  createdAt?: Date; // Explicitly define createdAt
}

// Bounty Schema
export const BountySchema = new Schema<Bounty>({
  createdBy: { type: String, required: true },
  title: { type: String, required: true },
  listedUsers: { type: [String], default: [] },
  loot: { type: String, required: false },
  details: { type: String, required: false },
  referenceLink: { type: String, required: false },
  days: { type: String, required: false },
  status: { type: String, enum: ['open', 'assigned'], default: 'open' },
  acceptedId: { type: String, required: false },
  isSuspended: { type: Boolean, default: false },
  creatorDetails: { type: String, required: false },
  createdAt: { type: Date, default: Date.now }, // Add createdAt with default value
});

export const BountyModel = model<Bounty>('Bounty', BountySchema);
