import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Mesmas regras do backend: 8+ caracteres, ao menos uma letra e um número. */
export function passwordStrength(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '');
  if (!value) return null; // "required" cuida do vazio
  const errors: ValidationErrors = {};
  if (value.length < 8) errors['minlength'] = true;
  if (!/[A-Za-zÀ-ÿ]/.test(value) || !/\d/.test(value)) errors['letterAndNumber'] = true;
  return Object.keys(errors).length ? errors : null;
}

/** Validador de grupo: marca o campo de confirmação quando difere da senha. */
export function matchFields(source: string, confirm: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const a = group.get(source)?.value;
    const b = group.get(confirm)?.value;
    return a && b && a !== b ? { mismatch: true } : null;
  };
}
