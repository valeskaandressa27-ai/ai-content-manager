import { FormControl, FormGroup } from '@angular/forms';
import { describe, expect, it } from 'vitest';

import { matchFields, passwordStrength } from './password.validators';

describe('passwordStrength', () => {
  const check = (value: string) => passwordStrength(new FormControl(value));

  it('aceita senha com 8+ caracteres, letras e números', () => {
    expect(check('Senha1234')).toBeNull();
  });
  it('rejeita senha curta', () => {
    expect(check('abc123')?.['minlength']).toBe(true);
  });
  it('rejeita senha sem número ou sem letra', () => {
    expect(check('somenteletras')?.['letterAndNumber']).toBe(true);
    expect(check('123456789')?.['letterAndNumber']).toBe(true);
  });
  it('deixa o vazio para o validator required', () => {
    expect(check('')).toBeNull();
  });
});

describe('matchFields', () => {
  const group = (a: string, b: string) =>
    new FormGroup({ password: new FormControl(a), confirm: new FormControl(b) }, { validators: matchFields('password', 'confirm') });

  it('acusa diferença entre senha e confirmação', () => {
    expect(group('Senha1234', 'Outra1234').errors).toEqual({ mismatch: true });
  });
  it('passa quando iguais ou confirmação ainda vazia', () => {
    expect(group('Senha1234', 'Senha1234').errors).toBeNull();
    expect(group('Senha1234', '').errors).toBeNull();
  });
});
