import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { fakeJwt } from '../../testing/test-utils';
import { TOKEN_KEY } from '../services/auth.service';
import { authGuard, guestGuard } from './auth.guard';

describe('guards', () => {
  const route = {} as ActivatedRouteSnapshot;
  const state = (url: string) => ({ url }) as RouterStateSnapshot;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
  });

  const run = (guard: typeof authGuard, url = '/contents') => TestBed.runInInjectionContext(() => guard(route, state(url)));

  it('authGuard libera com token válido', () => {
    localStorage.setItem(TOKEN_KEY, fakeJwt(600));
    expect(run(authGuard)).toBe(true);
  });

  it('authGuard redireciona para /login guardando a rota desejada', () => {
    const result = run(authGuard, '/campaigns/3') as UrlTree;
    const router = TestBed.inject(Router);
    expect(router.serializeUrl(result)).toBe('/login?returnUrl=%2Fcampaigns%2F3');
  });

  it('authGuard trata token expirado como sessão expirada', () => {
    localStorage.setItem(TOKEN_KEY, fakeJwt(-30));
    const result = run(authGuard) as UrlTree;
    expect(result.queryParams['reason']).toBe('expired');
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('guestGuard bloqueia /login para quem já está autenticado', () => {
    localStorage.setItem(TOKEN_KEY, fakeJwt(600));
    const result = run(guestGuard) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/dashboard');
  });

  it('guestGuard libera visitantes', () => {
    expect(run(guestGuard)).toBe(true);
  });
});
