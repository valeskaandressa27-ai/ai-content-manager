import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { UsageMeterComponent } from './usage-meter.component';

describe('UsageMeterComponent', () => {
  function render(usage: { used_today: number; limit: number; remaining: number; resets_at: string } | null) {
    const fixture = TestBed.createComponent(UsageMeterComponent);
    fixture.componentRef.setInput('usage', usage);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('mostra o consumo vindo do backend', () => {
    const el = render({ used_today: 3, limit: 20, remaining: 17, resets_at: '2026-09-30T03:00:00Z' });
    expect(el.textContent).toContain('Gerações utilizadas hoje: 3 / 20');
    expect(el.textContent).toContain('Gerações restantes: 17');
    expect(el.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('3');
    expect(el.querySelector<HTMLElement>('.meter > span')?.style.width).toBe('15%');
  });

  it('avisa quando o limite foi atingido', () => {
    const el = render({ used_today: 20, limit: 20, remaining: 0, resets_at: '2026-09-30T03:00:00Z' });
    expect(el.textContent).toContain('atingiu o limite diário');
    expect(el.querySelector('.usage-empty')).not.toBeNull();
  });

  it('não renderiza nada sem dados', () => {
    expect(render(null).querySelector('.usage')).toBeNull();
  });
});
