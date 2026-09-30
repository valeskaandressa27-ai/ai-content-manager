export interface Company {
  id: number;
  name: string;
  segment: string | null;
  description: string | null;
  target_audience: string | null;
  communication_tone: string | null;
  brand_information: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyPayload {
  name: string;
  segment: string | null;
  description: string | null;
  target_audience: string | null;
  communication_tone: string | null;
  brand_information: string | null;
}
