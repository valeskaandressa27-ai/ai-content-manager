import { Usage } from './ai.model';

export interface Dashboard {
  totals: { contents: number; saved_contents: number; campaigns: number; generations: number };
  usage: Usage;
  contents_by_type: { type: string; count: number }[];
  usage_last_days: { date: string; count: number }[];
  recent_generations: { id: number; generation_type: string; content_id: number | null; created_at: string }[];
  recent_activity: { kind: 'content' | 'campaign'; id: number; title: string; created_at: string }[];
}
