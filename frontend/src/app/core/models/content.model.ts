export type ContentType =
  | 'instagram_caption'
  | 'product_description'
  | 'ad'
  | 'email'
  | 'website_text'
  | 'title'
  | 'promo_cta'
  | 'blog_post'
  | 'whatsapp_message'
  | 'video_script';

export type ContentStatus = 'draft' | 'saved';

export interface Content {
  id: number;
  type: ContentType;
  title: string;
  input_data: Record<string, unknown> | null;
  generated_content: string;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
}

export interface ContentCreatePayload {
  type: ContentType;
  title: string;
  generated_content: string;
  input_data?: Record<string, unknown> | null;
  status?: ContentStatus;
  generation_id?: number | null;
}

export interface ContentUpdatePayload {
  title?: string;
  generated_content?: string;
  status?: ContentStatus;
}

export interface ContentListQuery {
  page: number;
  page_size: number;
  search?: string;
  type?: ContentType | '';
  status?: ContentStatus | '';
}
