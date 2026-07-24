import mongoose, { Schema, Document } from 'mongoose';

export interface IConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  // Rich cards attached to an assistant message (doctor/service/offer/result/
  // booking) — a lightweight pointer shape, not a duplicate of the source
  // document, so the widget re-fetches fresh data by id/slug when rendering.
  cards?: Array<{ type: 'doctor' | 'service' | 'offer' | 'result' | 'booking'; id?: string; slug?: string; title: string; subtitle?: string; image?: string; href?: string }>;
  // Set when the message matched a Settings.ai.escalationRules keyword —
  // lets the Analytics tab surface an escalation count without re-scanning
  // every message's text against the (mutable, admin-editable) rule list.
  escalated?: boolean;
  // Patient-facing thumbs up/down on an assistant reply — addressed by
  // {sessionId, createdAt} from the client rather than an array index, since
  // the 60-message trim in /api/ai-chat can shift indices but createdAt
  // (server-assigned, millisecond precision) stays a stable per-message key.
  feedback?: 'up' | 'down' | null;
  createdAt: Date;
}

export interface IConversation extends Document {
  sessionId: string;
  messages: IConversationMessage[];
  location?: string;
  handedOffToWhatsApp: boolean;
  leadPhone?: string;
  startedAt: Date;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>({
  sessionId: { type: String, required: true, unique: true, index: true },
  messages: [{
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    cards: [{
      type: { type: String, enum: ['doctor', 'service', 'offer', 'result', 'booking'] },
      id: String, slug: String, title: String, subtitle: String, image: String, href: String,
    }],
    escalated: { type: Boolean, default: false },
    feedback: { type: String, enum: ['up', 'down', null], default: null },
    createdAt: { type: Date, default: Date.now },
  }],
  location: { type: String, default: '' },
  handedOffToWhatsApp: { type: Boolean, default: false },
  leadPhone: { type: String, default: '' },
  startedAt: { type: Date, default: Date.now },
  lastMessageAt: { type: Date, default: Date.now },
}, { timestamps: true });

ConversationSchema.index({ lastMessageAt: -1 });

export const Conversation = mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', ConversationSchema);
