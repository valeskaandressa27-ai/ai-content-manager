import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TEST_USER, fakeJwt } from '../../testing/test-utils';
import { AuthService, TOKEN_KEY, USER_KEY } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let auth: AuthService;
  const token = fakeJwt(3600);

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(TEST_USER));
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  it('adiciona o token Bearer nas chamadas protegidas da API', () => {
    http.get('/api/contents').subscribe();
    const req = controller.expectOne('/api/contents');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    req.flush({});
  });

  it('não envia o token em login e cadastro', () => {
    http.post('/api/auth/login', {}).subscribe();
    http.post('/api/auth/register', {}).subscribe();
    for (const req of controller.match(() => true)) {
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    }
  });

  it('não envia o token para outros domínios', () => {
    http.get('https://outro-site.example.com/dados').subscribe();
    const req = controller.expectOne('https://outro-site.example.com/dados');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('em 401 encerra a sessão e manda para /login com aviso de expiração', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    let status = 0;
    http.get('/api/dashboard').subscribe({ error: (e) => (status = e.status) });
    controller.expectOne('/api/dashboard').flush({ code: 'TOKEN_EXPIRED' }, { status: 401, statusText: 'Unauthorized' });

    expect(status).toBe(401); // o erro continua chegando ao chamador
    expect(auth.token()).toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(navigate).toHaveBeenCalledWith(
      ['/login'],
      expect.objectContaining({ queryParams: expect.objectContaining({ reason: 'expired' }) }),
    );
  });

  it('401 de login (credenciais erradas) não dispara logout global', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    http.post('/api/auth/login', {}).subscribe({ error: () => undefined });
    controller.expectOne('/api/auth/login').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(navigate).not.toHaveBeenCalled();
    expect(auth.token()).toBe(token);
  });

  it('outros erros (ex.: 422) não encerram a sessão', () => {
    http.get('/api/contents').subscribe({ error: () => undefined });
    controller.expectOne('/api/contents').flush({}, { status: 422, statusText: 'Unprocessable' });
    expect(auth.token()).toBe(token);
  });
});
