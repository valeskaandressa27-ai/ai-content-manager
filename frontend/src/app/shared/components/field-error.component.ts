import { Component, input } from '@angular/core';
import { AbstractControl } from '@angular/forms';

const MESSAGES: Record<string, string> = {
  required: 'Campo obrigatório.',
  email: 'Informe um e-mail válido.',
  minlength: 'Valor muito curto.',
  maxlength: 'Valor muito longo.',
  letterAndNumber: 'A senha deve conter letras e números.',
};

/** Mensagem de erro associada ao campo via aria-describedby (o `id` deve coincidir). */
@Component({
  selector: 'app-field-error',
  template: `@if (message(); as text) { <p class="field-error" role="alert" [id]="id()">{{ text }}</p> }`,
})
export class FieldErrorComponent {
  readonly control = input.required<AbstractControl | null>();
  readonly id = input.required<string>();
  readonly label = input('');
  readonly minLengthText = input('');

  protected message(): string | null {
    const control = this.control();
    if (!control || !control.invalid || !(control.touched || control.dirty)) return null;
    const errors = control.errors ?? {};
    if (typeof errors['server'] === 'string') return errors['server'];
    if (errors['minlength'] && this.minLengthText()) return this.minLengthText();
    for (const key of Object.keys(errors)) {
      if (MESSAGES[key]) return MESSAGES[key];
    }
    return 'Valor inválido.';
  }
}
