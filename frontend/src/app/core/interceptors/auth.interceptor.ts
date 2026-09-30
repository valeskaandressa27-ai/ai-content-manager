import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { API_URL } from '../services/api';
import { AuthService } from '../services/auth.service';

const PUBLIC_ENDPOINTS = [`${API_URL}/auth/login`, `${API_URL}/auth/register`];

/** Anexa o JWT às chamadas da API e trata sessão expirada (401) de forma centralizada. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_URL)) return next(req);

  const auth = inject(AuthService);
  const isPublic = PUBLIC_ENDPOINTS.some((url) => req.url.startsWith(url));
  const token = auth.token();

  const request = token && !isPublic ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !isPublic) {
        auth.handleSessionExpired();
      }
      return throwError(() => error);
    }),
  );
};
