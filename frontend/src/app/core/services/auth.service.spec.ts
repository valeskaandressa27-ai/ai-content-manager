import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TEST_USER, fakeJwt } from '../../testing/test-utils';
import { AuthService, TOKEN_KEY, USER_KEY, isTokenExpired, tokenExpiry } from './auth.service';

describe('AuthService', () => {
  let http: HttpTestingController;

  function setup(): AuthService {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(AuthService);
  }

  beforeEach(() => localStorage.clear());

  it('login guarda token e usuário e expõe o estado', () => {
    const service = setup();
    const token = fakeJwt(3600);
    let done = false;

    service.login('ana@example.com', 'Senha1234').subscribe(() => (done = true));
    const req = http.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'ana@example.com', password: 'Senha1234' });
    req.flush({ access_token: token, token_type: 'bearer', expires_in: 3600, user: TEST_USER });

    expect(done).toBe(true);
    expect(service.token()).toBe(token);
    expect(service.user()?.email).toBe('ana@example.com');
    expect(service.firstName()).toBe('Ana');
    expect(service.hasValidSession()).toBe(true);
    expect(localStorage.getItem(TOKEN_KEY)).toBe(token);
    expect(localStorage.getItem(USER_KEY)).toContain('ana@example.com');
  });

  it('restaura a sessão a partir do localStorage', () => {
    localStorage.setItem(TOKEN_KEY, fakeJwt(600));
    localStorage.setItem(USER_KEY, JSON.stringify(TEST_USER));
    const service = setup();
    expect(service.hasValidSession()).toBe(true);
    expect(service.user()?.name).toBe('Ana Souza');
  });

  it('token expirado não conta como sessão válida', () => {
    localStorage.setItem(TOKEN_KEY, fakeJwt(-60));
    const service = setup();
    expect(service.hasStoredToken()).toBe(true);
    expect(service.hasValidSession()).toBe(false);
  });

  it('ignora usuário corrompido no localStorage', () => {
    localStorage.setItem(USER_KEY, '{quebrado');
    expect(setup().user()).toBeNull();
  });

  it('logout limpa a sessão e redireciona para /login', () => {
    localStorage.setItem(TOKEN_KEY, fakeJwt(600));
    localStorage.setItem(USER_KEY, JSON.stringify(TEST_USER));
    const service = setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    service.logout();

    expect(service.token()).toBeNull();
    expect(service.user()).toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('register envia os dados para a API', () => {
    const service = setup();
    const payload = { name: 'Ana', email: 'ana@example.com', password: 'Senha1234', password_confirm: 'Senha1234' };
    service.register(payload).subscribe();
    const req = http.expectOne('/api/auth/register');
    expect(req.request.body).toEqual(payload);
    req.flush(TEST_USER);
  });

  it('lê a expiração do JWT', () => {
    const exp = tokenExpiry(fakeJwt(100));
    expect(exp).toBeGreaterThan(Date.now() / 1000);
    expect(tokenExpiry('lixo')).toBeNull();
    expect(isTokenExpired('lixo')).toBe(true);
    expect(isTokenExpired(fakeJwt(100))).toBe(false);
    expect(isTokenExpired(fakeJwt(-1))).toBe(true);
  });
});
