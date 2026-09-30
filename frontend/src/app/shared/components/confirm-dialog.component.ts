import { AfterViewChecked, Component, ElementRef, HostListener, inject, viewChild } from '@angular/core';

import { ConfirmService } from '../../core/services/confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  template: `
    @if (confirmService.pending(); as dialog) {
      <div class="modal-backdrop" (click)="onBackdrop($event)">
        <div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message">
          <h2 id="confirm-title">{{ dialog.title }}</h2>
          <p id="confirm-message" class="muted">{{ dialog.message }}</p>
          <div class="form-actions">
            <button #cancelBtn type="button" class="btn btn-secondary" (click)="confirmService.answer(false)">{{ dialog.cancelText ?? 'Cancelar' }}</button>
            <button type="button" class="btn" [class.btn-danger]="dialog.danger !== false" [class.btn-primary]="dialog.danger === false" (click)="confirmService.answer(true)">{{ dialog.confirmText ?? 'Confirmar' }}</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialogComponent implements AfterViewChecked {
  protected readonly confirmService = inject(ConfirmService);
  private readonly cancelBtn = viewChild<ElementRef<HTMLButtonElement>>('cancelBtn');
  private focused = false;

  ngAfterViewChecked(): void {
    const button = this.cancelBtn();
    if (button && !this.focused) {
      this.focused = true;
      button.nativeElement.focus();
    } else if (!button) {
      this.focused = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.confirmService.pending()) this.confirmService.answer(false);
  }

  protected onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.confirmService.answer(false);
  }
}
