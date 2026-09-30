import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormGroup } from '@angular/forms';

/** Copia erros de validação (422) do backend para os controles correspondentes. */
export function applyServerErrors(form: FormGroup, error: HttpErrorResponse): boolean {
  const list = (error.error as { errors?: { field: string; message: string }[] } | null)?.errors;
  if (error.status !== 422 || !Array.isArray(list)) return false;
  let applied = false;
  for (const item of list) {
    const control: AbstractControl | null = form.get(item.field);
    if (control) {
      control.setErrors({ ...(control.errors ?? {}), server: item.message });
      control.markAsTouched();
      applied = true;
    }
  }
  return applied;
}
