import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';

import { apiErrorCode, apiErrorMessage } from './api-error';

const http = (status: number, error: unknown = null) => new HttpErrorResponse({ status, error });

describe('apiErrorMessage', () => {
  it('traduz códigos conhecidos do backend', () => {
    expect(apiErrorMessage(http(409, { code: 'EMAIL_ALREADY_REGISTERED', detail: 'x' }))).toBe('E-mail já cadastrado.');
    expect(apiErrorMessage(http(429, { code: 'AI_LIMIT_REACHED' }))).toBe('Limite diário de IA atingido.');
    expect(apiErrorMessage(http(503, { code: 'AI_UNAVAILABLE' }))).toBe(
      'Serviço de IA temporariamente indisponível. Tente novamente em instantes.',
    );
    expect(apiErrorMessage(http(401, { code: 'INVALID_CREDENTIALS' }))).toBe('Credenciais inválidas.');
  });

  it('usa mensagens amigáveis por status', () => {
    expect(apiErrorMessage(http(0))).toContain('conectar ao servidor');
    expect(apiErrorMessage(http(403))).toBe('Você não possui permissão para acessar este recurso.');
    expect(apiErrorMessage(http(404, { detail: 'Conteúdo não encontrado.' }))).toBe('Conteúdo não encontrado.');
    expect(apiErrorMessage(http(422))).toBe('Verifique os campos informados.');
    expect(apiErrorMessage(http(500, { detail: 'Traceback (most recent call last)...' }))).toBe(
      'Erro interno do servidor. Tente novamente mais tarde.',
    );
  });

  it('nunca vaza erro técnico desconhecido', () => {
    expect(apiErrorMessage(new Error('TypeError: undefined is not a function'))).toBe(
      'Ocorreu um erro inesperado. Tente novamente.',
    );
  });

  it('expõe o código de erro', () => {
    expect(apiErrorCode(http(429, { code: 'AI_LIMIT_REACHED' }))).toBe('AI_LIMIT_REACHED');
    expect(apiErrorCode(new Error('x'))).toBeNull();
  });
});
