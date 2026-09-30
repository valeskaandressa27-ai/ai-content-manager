import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  template: `
    @if (total() > 0) {
      <nav class="pagination" aria-label="Paginação">
        <span class="muted small">{{ total() }} {{ total() === 1 ? 'resultado' : 'resultados' }}</span>
        <div class="pages">
          <button type="button" class="btn btn-secondary btn-sm" [disabled]="page() <= 1 || disabled()" (click)="pageChange.emit(page() - 1)">Anterior</button>
          <span class="small" aria-current="page">Página {{ page() }} de {{ pages() }}</span>
          <button type="button" class="btn btn-secondary btn-sm" [disabled]="page() >= pages() || disabled()" (click)="pageChange.emit(page() + 1)">Próxima</button>
        </div>
      </nav>
    }
  `,
})
export class PaginationComponent {
  readonly page = input.required<number>();
  readonly pages = input.required<number>();
  readonly total = input.required<number>();
  readonly disabled = input(false);
  readonly pageChange = output<number>();
}
