import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

import { LoginResponse, RegisterPayload, User } from '../models/user.model';
import { API_URL } from './api';

export const TOKEN_KEY = 'aicm.token';
export const USER_KEY = 'aicm.user';

/** Lê o campo `exp` (segundos) de um JWT sem validar a assinatura (a validação real é do backend). */
export function tokenExpiry(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const exp = (JSON.parse(json) as { exp?: number }).exp;
    return typeof exp === 'number' ? exp : null;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string, nowMs = Date.now()): boolean {
  const exp = tokenExpiry(token);
  return exp === null || exp * 1000 <= nowMs;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly tokenState = signal<string | null>(this.read(TOKEN_KEY));
  private readonly userState = signal<User | null>(this.readUser());

  readonly token = this.tokenState.asReadonly();
  readonly user = this.userState.asReadonly();
  readonly firstName = computed(() => this.userState()?.name.split(' ')[0] ?? '');

  hasStoredToken(): boolean {
    return !!this.tokenState();
  }

  hasValidSession(): boolean {
    const token = this.tokenState();
    return !!token && !isTokenExpired(token);
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${API_URL}/auth/login`, { email, password })
      .pipe(tap((response) => this.setSession(response)));
  }

  register(payload: RegisterPayload): Observable<User> {
    return this.http.post<User>(`${API_URL}/auth/register`, payload);
  }

  loadCurrentUser(): Observable<User> {
    return this.http.get<User>(`${API_URL}/auth/me`).pipe(tap((user) => this.setUser(user)));
  }

  setUser(user: User): void {
    this.userState.set(user);
    this.write(USER_KEY, JSON.stringify(user));
  }

  logout(): void {
    this.clearSession();
    void this.router.navigate(['/login']);
  }

  /** Chamado pelo interceptor quando o backend responde 401 em rota protegida. */
  handleSessionExpired(): void {
    const returnUrl = this.router.url;
    this.clearSession();
    if (!returnUrl.startsWith('/login')) {
      void this.router.navigate(['/login'], { queryParams: { reason: 'expired', returnUrl } });
    }
  }

  clearSession(): void {
    this.tokenState.set(null);
    this.userState.set(null);
    this.remove(TOKEN_KEY);
    this.remove(USER_KEY);
  }

  private setSession(response: LoginResponse): void {
    this.tokenState.set(response.access_token);
    this.write(TOKEN_KEY, response.access_token);
    this.setUser(response.user);
  }

  private readUser(): User | null {
    const raw = this.read(USER_KEY);
    try {
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }

  // localStorage pode estar indisponível (modo privado, políticas do navegador).
  private read(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private write(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* mantém apenas em memória */
    }
  }

  private remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}
