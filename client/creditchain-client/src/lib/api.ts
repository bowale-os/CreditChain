// src/lib/api.ts   (or any folder you keep your API helpers)
const BASE_URL = 'http://localhost:5000/api/insights';

import type { Insight } from "../types/insight";
import type { CreateInsightPayload } from "../types/CreateInsightPayload";


/* -------------------------------------------------
   Enhanced handleResponse with full logging
------------------------------------------------- */
async function handleResponse<T>(res: Response): Promise<T> {
  console.log(`[API] Response: ${res.status} ${res.statusText} | URL: ${res.url}`);

  if (!res.ok) {
    const text = await res.text();
    console.error(`[API] Failed response body:`, text);
    
    let message = `HTTP ${res.status}`;
    try {
      const json = JSON.parse(text);
      message = json.message ?? message;
    } catch (e) {
      console.warn(`[API] Response not JSON:`, text.slice(0, 200));
    }

    const err = new Error(message);
    (err as any).status = res.status;
    (err as any).body = text;
    throw err;
  }

  try {
    const data = await res.json();
    console.log(`[API] Success:`, data);
    return data;
  } catch (e) {
    console.error(`[API] Failed to parse JSON:`, e);
    throw new Error('Invalid JSON response');
  }
}

/* -------------------------------------------------
   GET all insights
------------------------------------------------- */
export async function getAllInsights(): Promise<Insight[]> {
  console.log(`[API] GET ${BASE_URL}`);
  const res = await fetch(`${BASE_URL}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  return handleResponse<Insight[]>(res);
}

/* -------------------------------------------------
   POST new insight
------------------------------------------------- */
export async function postInsight(payload: CreateInsightPayload): Promise<Insight> {
  console.log(`[API] POST ${BASE_URL}`, payload);
  const res = await fetch(`${BASE_URL}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data =  await handleResponse<{ message: string; insight: Insight }>(res);
  console.log('[API] POST response:', data);

  return data.insight; // ← CRITICAL: return the insight, not the wrapper
}

/* -------------------------------------------------
   Upvote
------------------------------------------------- */
export async function addUpvote(id: string): Promise<{ upvotes: number }> {
  console.log(`[API] POST ${BASE_URL}/${id}/upvote`);
  const res = await fetch(`${BASE_URL}/${id}/upvote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return handleResponse<{ upvotes: number }>(res);
}

/* -------------------------------------------------
   Search by category
------------------------------------------------- */
export async function searchCategory(category: string): Promise<Insight[]> {
  const url = `${BASE_URL}/category/${category}`;
  console.log(`[API] GET ${url}`);
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  return handleResponse<Insight[]>(res);
}