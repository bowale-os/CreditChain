export interface CreateInsightPayload {
  tip: string;
  body?: string | null;
  category: string;
  hashedId: string;
}