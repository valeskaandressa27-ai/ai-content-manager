import { Component, computed, input } from '@angular/core';

import { Usage } from '../../core/models/ai.model';

/** Exibe o consumo diário de gerações. Os números vêm do backend (nunca calculados aqui). */
@Component({
  selector: 'app-usage-meter',
  template: `
    @if (usage(); as u) {
      <div class="usage" [class.usage-empty]="u.remaining === 0" role="status">
        <div class="usage-row">
          <span>Gerações utilizadas hoje: {{ u.used_today }} / {{ u.limit }}</span>
          <span>Gerações restantes: {{ u.remaining }}</span>
        </div>
        <div class="meter" role="progressbar" aria-label="Consumo diário de gerações" [attr.aria-valuenow]="u.used_today" aria-valuemin="0" [attr.aria-valuemax]="u.limit">
          <span [style.width.%]="percent()"></span>
        </div>
        @if (u.remaining === 0) {
          <p class="small" style="margin: .5rem 0 0">Você atingiu o limite diário de IA. Ele é renovado à meia-noite.</p>
        }
      </div>
    }
  `,
})
export class UsageMeterComponent {
  readonly usage = input<Usage | null>(null);
  protected readonly percent = computed(() => {
    const u = this.usage();
    return u && u.limit > 0 ? Math.min(100, Math.round((u.used_today / u.limit) * 100)) : 0;
  });
}
