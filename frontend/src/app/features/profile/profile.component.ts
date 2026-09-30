import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { apiErrorCode, apiErrorMessage } from '../../core/services/api-error';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { UserService } from '../../core/services/user.service';
import { FieldErrorComponent } from '../../shared/components/field-error.component';
import { IconComponent } from '../../shared/components/icon.component';
import { applyServerErrors } from '../../shared/validators/form-errors';
import { matchFields, passwordStrength } from '../../shared/validators/password.validators';

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, DatePipe, FieldErrorComponent, IconComponent],
  template: `
    <div class="page-head">
      <div>
        <h1>Meu perfil</h1>
        <p>Gerencie seus dados de acesso.</p>
      </div>
    </div>

    <div class="split">
      <form class="card" [formGroup]="profileForm" (ngSubmit)="saveProfile()" novalidate>
        <div class="card-title"><h2>Dados pessoais</h2></div>
        <div class="field">
          <label for="name">Nome</label>
          <input id="name" class="input" type="text" formControlName="name" maxlength="120" autocomplete="name"
            [attr.aria-invalid]="profileForm.controls.name.invalid && profileForm.controls.name.touched" aria-describedby="name-error" />
          <app-field-error [control]="profileForm.controls.name" id="name-error" minLengthText="Informe ao menos 2 caracteres." />
        </div>
        <div class="field">
          <label for="email">E-mail</label>
          <input id="email" class="input" type="email" [value]="auth.user()?.email ?? ''" readonly aria-describedby="email-hint" />
          <span id="email-hint" class="hint">O e-mail é usado no login e não pode ser alterado por aqui.</span>
        </div>
        @if (auth.user(); as user) {
          <p class="muted small">Conta criada em {{ user.created_at | date: 'dd/MM/yyyy' }}</p>
        }
        @if (profileError()) { <div class="alert alert-error" role="alert">{{ profileError() }}</div> }
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" [disabled]="savingProfile() || profileForm.pristine">
            @if (savingProfile()) { <span class="spinner" aria-hidden="true"></span> Salvando... } @else { <app-icon name="save" /> Salvar perfil }
          </button>
        </div>
      </form>

      <form class="card" [formGroup]="passwordForm" (ngSubmit)="changePassword()" novalidate>
        <div class="card-title"><h2>Alterar senha</h2></div>
        <div class="field">
          <label for="current_password">Senha atual</label>
          <input id="current_password" class="input" type="password" formControlName="current_password" autocomplete="current-password"
            [attr.aria-invalid]="passwordForm.controls.current_password.invalid && passwordForm.controls.current_password.touched" aria-describedby="current-error" />
          <app-field-error [control]="passwordForm.controls.current_password" id="current-error" />
        </div>
        <div class="field">
          <label for="new_password">Nova senha</label>
          <input id="new_password" class="input" type="password" formControlName="new_password" autocomplete="new-password"
            [attr.aria-invalid]="passwordForm.controls.new_password.invalid && passwordForm.controls.new_password.touched" aria-describedby="new-hint new-error" />
          <span id="new-hint" class="hint">Mínimo de 8 caracteres, com letras e números.</span>
          <app-field-error [control]="passwordForm.controls.new_password" id="new-error" minLengthText="A senha deve ter ao menos 8 caracteres." />
        </div>
        <div class="field">
          <label for="new_password_confirm">Confirmar nova senha</label>
          <input id="new_password_confirm" class="input" type="password" formControlName="new_password_confirm" autocomplete="new-password"
            aria-describedby="confirm-error" />
          @if (passwordForm.controls.new_password_confirm.touched && passwordForm.hasError('mismatch')) {
            <p class="field-error" id="confirm-error" role="alert">As senhas não conferem.</p>
          } @else {
            <app-field-error [control]="passwordForm.controls.new_password_confirm" id="confirm-error" />
          }
        </div>
        @if (passwordError()) { <div class="alert alert-error" role="alert">{{ passwordError() }}</div> }
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" [disabled]="savingPassword()">
            @if (savingPassword()) { <span class="spinner" aria-hidden="true"></span> Alterando... } @else { Alterar senha }
          </button>
        </div>
      </form>
    </div>
  `,
})
export class ProfileComponent {
  protected readonly auth = inject(AuthService);
  private readonly users = inject(UserService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected readonly savingProfile = signal(false);
  protected readonly savingPassword = signal(false);
  protected readonly profileError = signal<string | null>(null);
  protected readonly passwordError = signal<string | null>(null);

  protected readonly profileForm = this.fb.nonNullable.group({
    name: [this.auth.user()?.name ?? '', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
  });

  protected readonly passwordForm = this.fb.nonNullable.group(
    {
      current_password: ['', Validators.required],
      new_password: ['', [Validators.required, passwordStrength]],
      new_password_confirm: ['', Validators.required],
    },
    { validators: matchFields('new_password', 'new_password_confirm') },
  );

  protected saveProfile(): void {
    this.profileForm.markAllAsTouched();
    if (this.profileForm.invalid || this.savingProfile()) return;
    this.savingProfile.set(true);
    this.profileError.set(null);
    this.users.updateName(this.profileForm.getRawValue().name.trim()).subscribe({
      next: (user) => {
        this.profileForm.reset({ name: user.name });
        this.savingProfile.set(false);
        this.toast.success('Perfil atualizado.');
      },
      error: (err: HttpErrorResponse) => {
        if (!applyServerErrors(this.profileForm, err)) this.profileError.set(apiErrorMessage(err));
        this.savingProfile.set(false);
      },
    });
  }

  protected changePassword(): void {
    this.passwordForm.markAllAsTouched();
    if (this.passwordForm.invalid || this.savingPassword()) return;
    this.savingPassword.set(true);
    this.passwordError.set(null);
    this.users.changePassword(this.passwordForm.getRawValue()).subscribe({
      next: () => {
        this.passwordForm.reset();
        this.savingPassword.set(false);
        this.toast.success('Senha alterada com sucesso.');
      },
      error: (err: HttpErrorResponse) => {
        if (apiErrorCode(err) === 'INVALID_CURRENT_PASSWORD') {
          this.passwordForm.controls.current_password.setErrors({ server: 'Senha atual incorreta.' });
          this.passwordForm.controls.current_password.markAsTouched();
        } else if (!applyServerErrors(this.passwordForm, err)) {
          this.passwordError.set(apiErrorMessage(err));
        }
        this.savingPassword.set(false);
      },
    });
  }
}
