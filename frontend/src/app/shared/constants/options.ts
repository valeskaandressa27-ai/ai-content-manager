import { ContentLength } from '../../core/models/ai.model';
import { ContentStatus, ContentType } from '../../core/models/content.model';

export const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: 'instagram_caption', label: 'Legenda para Instagram' },
  { value: 'product_description', label: 'Descrição de produto' },
  { value: 'ad', label: 'Anúncio' },
  { value: 'email', label: 'E-mail' },
  { value: 'website_text', label: 'Texto para site' },
  { value: 'title', label: 'Título' },
  { value: 'promo_cta', label: 'CTA promocional' },
  { value: 'blog_post', label: 'Post de blog' },
  { value: 'whatsapp_message', label: 'Mensagem de WhatsApp' },
  { value: 'video_script', label: 'Roteiro de vídeo' },
];

export const TONES = [
  'Profissional',
  'Amigável',
  'Descontraído',
  'Inspirador',
  'Persuasivo',
  'Formal',
  'Divertido',
  'Acolhedor',
];

export const LENGTHS: { value: ContentLength; label: string }[] = [
  { value: 'short', label: 'Curto' },
  { value: 'medium', label: 'Médio' },
  { value: 'long', label: 'Longo' },
];

export const STATUSES: { value: ContentStatus; label: string }[] = [
  { value: 'saved', label: 'Salvo' },
  { value: 'draft', label: 'Rascunho' },
];

export const INPUT_LABELS: Record<string, string> = {
  product_or_service: 'Produto ou serviço',
  target_audience: 'Público-alvo',
  objective: 'Objetivo',
  tone: 'Tom de comunicação',
  length: 'Tamanho',
  additional_info: 'Informações adicionais',
  use_company_context: 'Contexto da empresa',
};

export function contentTypeLabel(type: string): string {
  if (type === 'campaign') return 'Campanha';
  return CONTENT_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function statusLabel(status: string): string {
  return STATUSES.find((s) => s.value === status)?.label ?? status;
}

export function lengthLabel(length: string): string {
  return LENGTHS.find((l) => l.value === length)?.label ?? length;
}
