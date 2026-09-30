import { HttpErrorResponse } from '@angular/common/http';

interface ApiErrorBody {
  detail?: unknown;
  code?: string;
}

const CODE_MESSAGES: Record<string, string> = {
  EMAIL_ALREADY_REGISTERED: 'E-mail já cadastrado.',
  INVALID_CREDENTIALS: 'Credenciais inválidas.',
  INVALID_CURRENT_PASSWORD: 'Senha atual incorreta.',
  TOKEN_EXPIRED: 'Sua sessão expirou. Faça login novamente.',
  AI_LIMIT_REACHED: 'Limite diário de IA atingido.',
  AI_UNAVAILABLE: 'Serviço de IA temporariamente indisponível. Tente novamente em instantes.',
  AI_TIMEOUT: 'O serviço de IA demorou demais para responder. Tente novamente.',
  AI_INVALID_RESPONSE: 'O serviço de IA retornou uma resposta inválida. Tente novamente.',
  AI_PROVIDER_AUTH: 'Serviço de IA temporariamente indisponível. Tente novamente mais tarde.',
  AI_NOT_CONFIGURED: 'O serviço de IA ainda não foi configurado neste ambiente.',
};

/** Converte qualquer erro HTTP em uma mensagem amigável (nunca expõe detalhes técnicos). */
export function apiErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Ocorreu um erro inesperado. Tente novamente.';
  }
  const body = (error.error ?? {}) as ApiErrorBody;
  if (body.code && CODE_MESSAGES[body.code]) return CODE_MESSAGES[body.code];

  switch (true) {
    case error.status === 0:
      return 'Não foi possível conectar ao servidor. Verifique sua conexão.';
    case error.status === 401:
      return 'Credenciais inválidas ou sessão expirada.';
    case error.status === 403:
      return 'Você não possui permissão para acessar este recurso.';
    case error.status === 404:
      return typeof body.detail === 'string' ? body.detail : 'Recurso não encontrado.';
    case error.status === 409:
      return typeof body.detail === 'string' ? body.detail : 'Conflito ao salvar os dados.';
    case error.status === 422:
      return 'Verifique os campos informados.';
    case error.status === 429:
      return 'Limite diário de IA atingido.';
    case error.status >= 500:
      return 'Erro interno do servidor. Tente novamente mais tarde.';
    default:
      return typeof body.detail === 'string' ? body.detail : 'Não foi possível concluir a operação.';
  }
}

export function apiErrorCode(error: unknown): string | null {
  return error instanceof HttpErrorResponse ? ((error.error as ApiErrorBody | null)?.code ?? null) : null;
}
