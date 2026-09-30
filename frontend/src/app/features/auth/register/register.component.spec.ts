import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TEST_USER, fakeJwt } from '../../../testing/test-utils';
import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
  let http: HttpTestingController;

  function setup() {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(RegisterComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const type = (selector: string, value: string) => {
      const input = el.querySelector<HTMLInputElement>(selector)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('blur'));
    };
    const fill = (overrides: Record<string, string> = {}) => {
      const values = { name: 'Ana Souza', email: 'ana@example.com', password: 'Senha1234', password_confirm: 'Senha1234', ...overrides };
      for (const [id, value] of Object.entries(values)) type(`#${id}`, value);
    };
    const submit = () => {
      el.querySelector('form')!.dispatchEvent(new Event('submit'));
      fixture.detectChanges();
    };
    return { fixture, el, fill, submit };
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('exige todos os campos', () => {
    const { el, submit } = setup();
    submit();
    http.expectNone('/api/auth/register');
    expect(el.querySelectorAll('.field-error').length).toBeGreaterThanOrEqual(4);
  });

  it('rejeita senha fraca', () => {
    const { el, fill, submit } = setup();
    fill({ password: 'somenteletras', password_confirm: 'somenteletras' });
    submit();
    http.expectNone('/api/auth/register');
    expect(el.querySelector('#password-error')?.textContent).toContain('letras e números');
  });

  it('acusa confirmação de senha diferente', () => {
    const { el, fill, submit } = setup();
    fill({ password_confirm: 'Outra12345' });
    submit();
    http.expectNone('/api/auth/register');
    expect(el.querySelector('#confirm-error')?.textContent).toContain('As senhas não conferem');
  });

  it('cadastra, faz login automático e vai para o dashboard', () => {
    const { fixture, fill, submit } = setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fill();
    submit();

    const register = http.expectOne('/api/auth/register');
    expect(register.request.body).toEqual({
      name: 'Ana Souza',
      email: 'ana@example.com',
      password: 'Senha1234',
      password_confirm: 'Senha1234',
    });
    register.flush(TEST_USER);

    http.expectOne('/api/auth/login').flush({ access_token: fakeJwt(3600), token_type: 'bearer', expires_in: 3600, user: TEST_USER });
    fixture.detectChanges();
    expect(navigate).toHaveBeenCalledWith('/dashboard');
  });

  it('mostra erro no campo e-mail quando já cadastrado', () => {
    const { fixture, el, fill, submit } = setup();
    fill();
    submit();
    http
      .expectOne('/api/auth/register')
      .flush({ detail: 'E-mail já cadastrado.', code: 'EMAIL_ALREADY_REGISTERED' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();
    expect(el.querySelector('#email-error')?.textContent).toContain('E-mail já cadastrado.');
    expect(el.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(false);
  });

  it('não envia duas vezes ao clicar rápido', () => {
    const { fill, submit } = setup();
    fill();
    submit();
    submit();
    expect(http.match('/api/auth/register').length).toBe(1);
  });
});
