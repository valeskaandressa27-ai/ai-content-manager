import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, debounceTime, distinctUntilChanged, startWith, switchMap, tap } from 'rxjs';

import { Content, ContentStatus, ContentType } from '../../../core/models/content.model';
import { Page } from '../../../core/models/page.model';
import { apiErrorMessage } from '../../../core/services/api-error';
import { ClipboardService } from '../../../core/services/clipboard.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ContentService } from '../../../core/services/content.service';
import { ToastService } from '../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { IconComponent } from '../../../shared/components/icon.component';
import { LoadingComponent } from '../../../shared/components/loading.component';
import { PaginationComponent } from '../../../shared/components/pagination.component';
import { CONTENT_TYPES, STATUSES, contentTypeLabel, statusLabel } from '../../../shared/constants/options';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-content-list',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, EmptyStateComponent, IconComponent, LoadingComponent, PaginationComponent],
  template: `
    <div class="page-head">
      <div>
        <h1>Conteúdos</h1>
        <p>Histórico e biblioteca dos conteúdos que você salvou.</p>
      </div>
      <a routerLink="/content/generate" class="btn btn-primary"><app-icon name="plus" /> Novo conteúdo</a>
    </div>

    <div class="card">
      <form class="filters" [formGroup]="filters" role="search" (ngSubmit)="$event.preventDefault()">
        <div class="field">
          <label for="search">Buscar</label>
          <input id="search" class="input" type="search" formControlName="search" placeholder="Título ou texto" maxlength="100" />
        </div>
        <div class="field">
          <label for="type">Tipo</label>
          <select id="type" class="select" formControlName="type">
            <option value="">Todos</option>
            @for (type of types; track type.value) { <option [value]="type.value">{{ type.label }}</option> }
          </select>
        </div>
        <div class="field">
          <label for="status">Status</label>
          <select id="status" class="select" formControlName="status">
            <option value="">Todos</option>
            @for (status of statuses; track status.value) { <option [value]="status.value">{{ status.label }}</option> }
          </select>
        </div>
      </form>

      @if (error()) {
        <div class="alert alert-error" role="alert">{{ error() }} <button type="button" class="btn btn-secondary btn-sm" (click)="reload()">Tentar novamente</button></div>
      }

      @if (loading() && !data()) {
        <app-loading text="Carregando conteúdos..." />
      } @else if (data(); as page) {
        @if (page.total === 0) {
          @if (hasFilters()) {
            <app-empty-state icon="search" title="Nenhum resultado" message="Nenhum conteúdo corresponde aos filtros aplicados.">
              <button type="button" class="btn btn-secondary btn-sm" (click)="clearFilters()">Limpar filtros</button>
            </app-empty-state>
          } @else {
            <app-empty-state icon="file" title="Você ainda não salvou conteúdos" message="Gere seu primeiro conteúdo com IA e ele aparecerá aqui.">
              <a routerLink="/content/generate" class="btn btn-primary btn-sm">Gerar conteúdo</a>
            </app-empty-state>
          }
        } @else {
          <div class="table-wrap" [style.opacity]="loading() ? 0.6 : 1">
            <table class="table">
              <caption class="sr-only">Lista de conteúdos</caption>
              <thead><tr><th scope="col">Título</th><th scope="col">Tipo</th><th scope="col">Status</th><th scope="col">Criado em</th><th scope="col"><span class="sr-only">Ações</span></th></tr></thead>
              <tbody>
                @for (item of page.items; track item.id) {
                  <tr>
                    <td class="title-cell"><a [routerLink]="['/contents', item.id]">{{ item.title }}</a></td>
                    <td>{{ typeLabel(item.type) }}</td>
                    <td><span class="badge" [class.badge-success]="item.status === 'saved'" [class.badge-draft]="item.status === 'draft'">{{ statusText(item.status) }}</span></td>
                    <td class="muted small" style="white-space:nowrap">{{ item.created_at | date: 'dd/MM/yyyy HH:mm' }}</td>
                    <td>
                      <div class="actions">
                        <a class="btn btn-ghost btn-sm icon-btn" [routerLink]="['/contents', item.id]" [attr.aria-label]="'Abrir ' + item.title" title="Abrir"><app-icon name="file" /></a>
                        <button type="button" class="btn btn-ghost btn-sm icon-btn" (click)="copy(item)" [attr.aria-label]="'Copiar ' + item.title" title="Copiar"><app-icon name="copy" /></button>
                        <button type="button" class="btn btn-ghost btn-sm icon-btn" (click)="remove(item)" [attr.aria-label]="'Excluir ' + item.title" title="Excluir"><app-icon name="trash" /></button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <app-pagination [page]="page.page" [pages]="page.pages" [total]="page.total" [disabled]="loading()" (pageChange)="goTo($event)" />
        }
      }
    </div>
  `,
})
export class ContentListComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ContentService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly clipboard = inject(ClipboardService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly types = CONTENT_TYPES;
  protected readonly statuses = STATUSES;
  protected readonly data = signal<Page<Content> | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly filters = this.fb.nonNullable.group({
    search: [''],
    type: ['' as ContentType | ''],
    status: ['' as ContentStatus | ''],
  });

  private page = 1;
  private readonly trigger$ = new Subject<void>();

  ngOnInit(): void {
    this.filters.controls.search.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.resetToFirstPage());
    this.filters.controls.type.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.resetToFirstPage());
    this.filters.controls.status.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.resetToFirstPage());

    // switchMap descarta respostas antigas quando o usuário muda filtros rapidamente.
    this.trigger$
      .pipe(
        startWith(undefined),
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap(() =>
          this.service.list({ page: this.page, page_size: PAGE_SIZE, ...this.filters.getRawValue() }).pipe(
            catchError((err: unknown) => {
              this.error.set(apiErrorMessage(err));
              this.loading.set(false);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((page) => {
        this.data.set(page);
        this.loading.set(false);
      });
  }

  protected hasFilters(): boolean {
    const v = this.filters.getRawValue();
    return !!(v.search.trim() || v.type || v.status);
  }

  protected clearFilters(): void {
    this.filters.reset({ search: '', type: '', status: '' }, { emitEvent: false });
    this.resetToFirstPage();
  }

  protected reload(): void {
    this.trigger$.next();
  }

  protected goTo(page: number): void {
    this.page = page;
    this.reload();
  }

  private resetToFirstPage(): void {
    this.page = 1;
    this.reload();
  }

  protected typeLabel(type: string): string {
    return contentTypeLabel(type);
  }

  protected statusText(status: string): string {
    return statusLabel(status);
  }

  protected copy(item: Content): void {
    void this.clipboard.copy(item.generated_content);
  }

  protected async remove(item: Content): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Excluir conteúdo?',
      message: `“${item.title}” será removido permanentemente. Esta ação não pode ser desfeita.`,
      confirmText: 'Excluir',
    });
    if (!ok) return;
    this.service.delete(item.id).subscribe({
      next: () => {
        this.toast.success('Conteúdo excluído.');
        if (this.data()?.items.length === 1 && this.page > 1) this.page -= 1;
        this.reload();
      },
      error: (err: unknown) => this.toast.error(apiErrorMessage(err)),
    });
  }
}
