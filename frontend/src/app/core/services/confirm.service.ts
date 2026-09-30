import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

/** Confirmação para ações destrutivas (renderizada por <app-confirm-dialog>). */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly pending = signal<PendingConfirm | null>(null);

  confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => this.pending.set({ ...options, resolve }));
  }

  answer(value: boolean): void {
    this.pending()?.resolve(value);
    this.pending.set(null);
  }
}
