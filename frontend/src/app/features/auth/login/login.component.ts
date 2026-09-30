import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { apiErrorMessage } from '../../../core/services/api-error';
import { AuthService } from '../../../core/services/auth.service';
import { FieldErrorComponent } from '../../../shared/components/field-error.component';
import { IconComponent } from '../../../shared/components/icon.component';
import { safeReturnUrl } from '../../../shared/utils';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, FieldErrorComponent, IconComponent],
  template: `
    <main class="auth-wrap" id="main">
      <div class="card auth-card">
        <a routerLink="/" class="brand"><span class="brand-mark"><app-icon name="sparkles" /></span> AI Content Manager</a>
        <h1>Entrar</h1>
        <p class="sub">Acesse sua conta para continuar.</p>

        @if (expired) {
          <div class="alert alert-info" role="status">Sua sessão expirou. Faça login novamente.</div>
        }
        @if (error()) {
          <div class="alert alert-error" role="alert">{{ error() }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="field">
            <label for="email">E-mail</label>
            <input id="email" class="input" type="email" formControlName="email" autocomplete="email" inputmode="email"
              [attr.aria-invalid]="form.controls.email.invalid && form.controls.email.touched" aria-describedby="email-error" />
            <app-field-error [control]="form.controls.email" id="email-error" />
          </div>
          <div class="field">
            <label for="password">Senha</label>
            <input id="password" class="input" type="password" formControlName="password" autocomplete="current-password"
              [attr.aria-invalid]="form.controls.password.invalid && form.controls.password.touched" aria-describedby="password-error" />
            <app-field-error [control]="form.controls.password" id="password-error" />
          </div>
          <button type="submit" class="btn btn-primary btn-block" [disabled]="loading()">
            @if (loading()) { <span class="spinner" aria-hidden="true"></span> Entrando... } @else { Entrar }
          </button>
        </form>
        <p class="auth-foot">Ainda não tem conta? <a routerLink="/register">Cadastre-se</a></p>
      </div>
    </main>
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly expired = this.route.snapshot.queryParamMap.get('reason') === 'expired';

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected submit(): void {
    if (this.loading()) return; // evita envios duplicados
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.loading.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();
    this.auth.login(email.trim(), password).subscribe({
      next: () => void this.router.navigateByUrl(safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'))),
      error: (err: HttpErrorResponse) => {
        this.error.set(apiErrorMessage(err));
        this.loading.set(false);
      },
    });
  }
}
