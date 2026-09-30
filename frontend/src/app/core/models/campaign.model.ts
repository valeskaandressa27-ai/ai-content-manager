export interface Campaign {
  id: number;
  name: string;
  product_or_service: string;
  objective: string | null;
  target_audience: string | null;
  period: string | null;
  tone: string | null;
  additional_info: string | null;
  generated_content: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignInput {
  name: string;
  product_or_service: string;
  objective: string | null;
  target_audience: string | null;
  period: string | null;
  tone: string | null;
  additional_info: string | null;
}

export interface CampaignCreatePayload extends CampaignInput {
  generated_content: string;
}

export type CampaignUpdatePayload = Partial<CampaignCreatePayload>;

export interface CampaignGeneratePayload extends CampaignInput {
  use_company_context: boolean;
}
