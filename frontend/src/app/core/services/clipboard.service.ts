import { Injectable, inject } from '@angular/core';

import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class ClipboardService {
  private readonly toast = inject(ToastService);

  async copy(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.toast.success('Texto copiado para a área de transferência.');
    } catch {
      this.toast.error('Não foi possível copiar. Selecione o texto e copie manualmente.');
    }
  }
}
