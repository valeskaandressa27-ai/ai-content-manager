import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TEST_USER, fakeJwt } from '../../../testing/test-utils';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let http: HttpTestingController;

  function setup() {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const type = (selector: string, value: string) => {
      const input = el.querySelector<HTMLInputElement>(selector)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    const submit = () => {
      el.querySelector('form')!.dispatchEvent(new Event('submit'));
      fixture.detectChanges();
    };
    return { fixture, el, type, submit };
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('não chama a API com formulário inválido e mostra erros associados aos campos', () => {
    const { el, submit } = setup();
    submit();
    http.expectNone('/api/auth/login');
    expect(el.querySelectorAll('.field-error').length).toBe(2);
    expect(el.querySelector('#email')?.getAttribute('aria-describedby')).toBe('email-error');
    expect(el.querySelector('#email-error')?.textContent).toContain('Campo obrigatório');
  });

  it('valida formato de e-mail', () => {
    const { el, type, submit } = setup();
    type('#email', 'sem-arroba');
    type('#password', 'Senha1234');
    submit();
    http.expectNone('/api/auth/login');
    expect(el.querySelector('#email-error')?.textContent).toContain('e-mail válido');
  });

  it('faz login e navega para o dashboard', () => {
    const { fixture, type, submit } = setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    type('#email', 'ana@example.com');
    type('#password', 'Senha1234');
    submit();

    const req = http.expectOne('/api/auth/login');
    expect(req.request.body).toEqual({ email: 'ana@example.com', password: 'Senha1234' });
    req.flush({ access_token: fakeJwt(3600), token_type: 'bearer', expires_in: 3600, user: TEST_USER });
    fixture.detectChanges();
    expect(navigate).toHaveBeenCalledWith('/dashboard');
  });

  it('desabilita o botão durante o envio e ignora clique duplicado', () => {
    const { fixture, el, type, submit } = setup();
    type('#email', 'ana@example.com');
    type('#password', 'Senha1234');
    submit();
    submit();
    expect(http.match('/api/auth/login').length).toBe(1);
    fixture.detectChanges();
    expect(el.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true);
  });

  it('mostra mensagem amigável para credenciais inválidas e reabilita o botão', () => {
    const { fixture, el, type, submit } = setup();
    type('#email', 'ana@example.com');
    type('#password', 'errada123');
    submit();
    http
      .expectOne('/api/auth/login')
      .flush({ detail: 'E-mail ou senha inválidos.', code: 'INVALID_CREDENTIALS' }, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();
    expect(el.querySelector('.alert-error')?.textContent).toContain('Credenciais inválidas.');
    expect(el.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(false);
  });
});
