import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { ContentGeneratorComponent } from './content-generator.component';

const usage = (used: number) => ({ used_today: used, limit: 20, remaining: 20 - used, resets_at: '2026-09-30T03:00:00Z' });
const generation = (id: number, used: number, text = `Texto ${id}`) => ({ generation_id: id, generated_content: text, usage: usage(used) });

describe('ContentGeneratorComponent', () => {
  let http: HttpTestingController;

  function setup() {
    TestBed.configureTestingModule({
      imports: [ContentGeneratorComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ContentGeneratorComponent);
    fixture.detectChanges();
    http.expectOne('/api/ai/usage').flush(usage(2));
    http.expectOne('/api/company').flush(null);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const fillProduct = (value: string) => {
      const input = el.querySelector<HTMLInputElement>('#product_or_service')!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    const submit = () => {
      el.querySelector('form')!.dispatchEvent(new Event('submit'));
      fixture.detectChanges();
    };
    const button = (text: string) =>
      Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.includes(text));
    return { fixture, el, fillProduct, submit, button };
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('mostra o consumo diário vindo do backend', () => {
    const { el } = setup();
    expect(el.textContent).toContain('Gerações utilizadas hoje: 2 / 20');
    expect(el.textContent).toContain('Gerações restantes: 18');
  });

  it('exige o produto ou serviço antes de gerar', () => {
    const { el, submit } = setup();
    submit();
    http.expectNone('/api/ai/generate');
    expect(el.querySelector('#product-error')?.textContent).toContain('Campo obrigatório');
  });

  it('gera pelo backend (sem falar com o provedor) e mostra o resultado editável', async () => {
    const { fixture, el, fillProduct, submit } = setup();
    fillProduct('Esmalte vegano');
    submit();

    const req = http.expectOne('/api/ai/generate');
    expect(req.request.body).toMatchObject({ content_type: 'instagram_caption', product_or_service: 'Esmalte vegano', use_company_context: true });
    expect(JSON.stringify(req.request.body)).not.toMatch(/key|token/i);
    req.flush(generation(7, 3, 'Legenda pronta'));
    fixture.detectChanges();
    await fixture.whenStable(); // ngModel escreve o valor de forma assíncrona

    expect(el.querySelector<HTMLTextAreaElement>('#result-text')?.value).toBe('Legenda pronta');
    expect(el.textContent).toContain('Gerações utilizadas hoje: 3 / 20');
  });

  it('evita envio duplicado durante a geração', () => {
    const { fillProduct, submit } = setup();
    fillProduct('Esmalte');
    submit();
    submit();
    expect(http.match('/api/ai/generate').length).toBe(1);
  });

  it('regenerar dispara uma nova geração e atualiza o consumo', async () => {
    const { fixture, el, fillProduct, submit, button } = setup();
    fillProduct('Esmalte');
    submit();
    http.expectOne('/api/ai/generate').flush(generation(1, 3));
    fixture.detectChanges();

    button('Regenerar')!.click();
    http.expectOne('/api/ai/generate').flush(generation(2, 4, 'Nova versão'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.querySelector<HTMLTextAreaElement>('#result-text')?.value).toBe('Nova versão');
    expect(el.textContent).toContain('Gerações utilizadas hoje: 4 / 20');
  });

  it('salva o conteúdo vinculado à geração', () => {
    const { fixture, fillProduct, submit, button } = setup();
    fillProduct('Esmalte');
    submit();
    http.expectOne('/api/ai/generate').flush(generation(9, 3, 'Texto final'));
    fixture.detectChanges();

    button('Salvar')!.click();
    const req = http.expectOne('/api/contents');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toMatchObject({ type: 'instagram_caption', generated_content: 'Texto final', generation_id: 9, status: 'saved' });
    req.flush({ id: 5, type: 'instagram_caption', title: 't', input_data: null, generated_content: 'Texto final', status: 'saved', created_at: '', updated_at: '' });
    fixture.detectChanges();
    expect(button('Atualizar conteúdo salvo')).toBeDefined();
  });

  it('mostra mensagem amigável quando o limite diário é atingido e recarrega o consumo', () => {
    const { fixture, el, fillProduct, submit } = setup();
    fillProduct('Esmalte');
    submit();
    http
      .expectOne('/api/ai/generate')
      .flush({ detail: 'Limite diário de 20 gerações atingido.', code: 'AI_LIMIT_REACHED' }, { status: 429, statusText: 'Too Many Requests' });
    http.expectOne('/api/ai/usage').flush(usage(20));
    fixture.detectChanges();

    expect(el.querySelector('.alert-error')?.textContent).toContain('Limite diário de IA atingido.');
    expect(el.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true);
  });

  it('mostra erro controlado quando a IA está indisponível, sem exibir conteúdo', () => {
    const { fixture, el, fillProduct, submit } = setup();
    fillProduct('Esmalte');
    submit();
    http.expectOne('/api/ai/generate').flush({ detail: 'x', code: 'AI_UNAVAILABLE' }, { status: 503, statusText: 'Service Unavailable' });
    fixture.detectChanges();
    expect(el.querySelector('.alert-error')?.textContent).toContain('Serviço de IA temporariamente indisponível');
    expect(el.querySelector('#result-text')).toBeNull();
    expect(el.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(false); // pode tentar de novo
  });
});
