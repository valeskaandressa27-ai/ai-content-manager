import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';

import { apiErrorCode, apiErrorMessage } from '../../../core/services/api-error';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { FieldErrorComponent } from '../../../shared/components/field-error.component';
import { IconComponent } from '../../../shared/components/icon.component';
import { applyServerErrors } from '../../../shared/validators/form-errors';
import { matchFields, passwordStrength } from '../../../shared/validators/password.validators';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, FieldErrorComponent, IconComponent],
  template: `
    <main class="auth-wrap" id="main">
      <div class="card auth-card">
        <a routerLink="/" class="brand"><span class="brand-mark"><app-icon name="sparkles" /></span> AI Content Manager</a>
        <h1>Criar conta</h1>
        <p class="sub">Comece a gerar conteúdos em poucos minutos.</p>

        @if (error()) {
          <div class="alert alert-error" role="alert">{{ error() }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="field">
            <label for="name">Nome</label>
            <input id="name" class="input" type="text" formControlName="name" autocomplete="name"
              [attr.aria-invalid]="form.controls.name.invalid && form.controls.name.touched" aria-describedby="name-error" />
            <app-field-error [control]="form.controls.name" id="name-error" minLengthText="Informe ao menos 2 caracteres." />
          </div>
          <div class="field">
            <label for="email">E-mail</label>
            <input id="email" class="input" type="email" formControlName="email" autocomplete="email" inputmode="email"
              [attr.aria-invalid]="form.controls.email.invalid && form.controls.email.touched" aria-describedby="email-error" />
            <app-field-error [control]="form.controls.email" id="email-error" />
          </div>
          <div class="field">
            <label for="password">Senha</label>
            <input id="password" class="input" type="password" formControlName="password" autocomplete="new-password"
              [attr.aria-invalid]="form.controls.password.invalid && form.controls.password.touched" aria-describedby="password-hint password-error" />
            <span id="password-hint" class="hint">Mínimo de 8 caracteres, com letras e números.</span>
            <app-field-error [control]="form.controls.password" id="password-error" minLengthText="A senha deve ter ao menos 8 caracteres." />
          </div>
          <div class="field">
            <label for="password_confirm">Confirmar senha</label>
            <input id="password_confirm" class="input" type="password" formControlName="password_confirm" autocomplete="new-password"
              [attr.aria-invalid]="confirmInvalid()" aria-describedby="confirm-error" />
            @if (form.controls.password_confirm.touched && form.hasError('mismatch')) {
              <p class="field-error" id="confirm-error" role="alert">As senhas não conferem.</p>
            } @else {
              <app-field-error [control]="form.controls.password_confirm" id="confirm-error" />
            }
          </div>
          <button type="submit" class="btn btn-primary btn-block" [disabled]="loading()">
            @if (loading()) { <span class="spinner" aria-hidden="true"></span> Criando conta... } @else { Criar conta }
          </button>
        </form>
        <p class="auth-foot">Já tem conta? <a routerLink="/login">Entrar</a></p>
      </div>
    </main>
  `,
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, passwordStrength]],
      password_confirm: ['', [Validators.required]],
    },
    { validators: matchFields('password', 'password_confirm') },
  );

  protected confirmInvalid(): boolean {
    const control = this.form.controls.password_confirm;
    return control.touched && (control.invalid || this.form.hasError('mismatch'));
  }

  protected submit(): void {
    if (this.loading()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.loading.set(true);
    this.error.set(null);
    const value = this.form.getRawValue();
    const email = value.email.trim();

    this.auth
      .register({ ...value, name: value.name.trim(), email })
      .pipe(switchMap(() => this.auth.login(email, value.password)))
      .subscribe({
        next: () => {
          this.toast.success('Conta criada com sucesso! Bem-vinda(o).');
          void this.router.navigateByUrl('/dashboard');
        },
        error: (err: HttpErrorResponse) => {
          if (apiErrorCode(err) === 'EMAIL_ALREADY_REGISTERED') {
            this.form.controls.email.setErrors({ server: 'E-mail já cadastrado.' });
            this.form.controls.email.markAsTouched();
          } else if (!applyServerErrors(this.form, err)) {
            this.error.set(apiErrorMessage(err));
          }
          this.loading.set(false);
        },
      });
  }
}
