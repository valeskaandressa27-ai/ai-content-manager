import { ContentType } from './content.model';

export type ContentLength = 'short' | 'medium' | 'long';

export interface Usage {
  used_today: number;
  limit: number;
  remaining: number;
  resets_at: string;
}

export interface GenerateContentPayload {
  content_type: ContentType;
  product_or_service: string;
  target_audience: string | null;
  objective: string | null;
  tone: string | null;
  length: ContentLength;
  additional_info: string | null;
  use_company_context: boolean;
}

export interface GenerationResult {
  generation_id: number;
  generated_content: string;
  usage: Usage;
}
