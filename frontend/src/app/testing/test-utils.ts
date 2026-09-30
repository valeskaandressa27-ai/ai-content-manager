/** Gera um JWT falso (sem assinatura válida) apenas para testar leitura do campo exp. */
export function fakeJwt(expiresInSeconds: number): string {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: '1', exp })}.assinatura`;
}

export const TEST_USER = { id: 1, name: 'Ana Souza', email: 'ana@example.com', created_at: '2026-09-01T10:00:00Z' };
