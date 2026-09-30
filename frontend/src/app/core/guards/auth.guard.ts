import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/** Protege rotas privadas: sem sessão válida, vai para /login guardando a rota desejada. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.hasValidSession()) return true;

  const hadSession = auth.hasStoredToken(); // token presente porém expirado/inválido
  auth.clearSession();
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url, ...(hadSession ? { reason: 'expired' } : {}) },
  });
};

/** Impede usuários já autenticados de verem /login e /register. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.hasValidSession() ? inject(Router).createUrlTree(['/dashboard']) : true;
};
