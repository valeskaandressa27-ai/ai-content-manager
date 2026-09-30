import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, debounceTime, distinctUntilChanged, startWith, switchMap, tap } from 'rxjs';

import { Campaign } from '../../../core/models/campaign.model';
import { Page } from '../../../core/models/page.model';
import { apiErrorMessage } from '../../../core/services/api-error';
import { CampaignService } from '../../../core/services/campaign.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { IconComponent } from '../../../shared/components/icon.component';
import { LoadingComponent } from '../../../shared/components/loading.component';
import { PaginationComponent } from '../../../shared/components/pagination.component';

const PAGE_SIZE = 9;

@Component({
  selector: 'app-campaign-list',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, EmptyStateComponent, IconComponent, LoadingComponent, PaginationComponent],
  template: `
    <div class="page-head">
      <div>
        <h1>Campanhas</h1>
        <p>Planos de campanha gerados com IA e salvos por você.</p>
      </div>
      <a routerLink="/campaigns/new" class="btn btn-primary"><app-icon name="plus" /> Nova campanha</a>
    </div>

    <div class="field" style="max-width:420px">
      <label for="search">Buscar campanhas</label>
      <input id="search" class="input" type="search" [formControl]="search" placeholder="Nome ou produto/serviço" maxlength="100" />
    </div>

    @if (error()) {
      <div class="alert alert-error" role="alert">{{ error() }} <button type="button" class="btn btn-secondary btn-sm" (click)="reload()">Tentar novamente</button></div>
    }

    @if (loading() && !data()) {
      <app-loading text="Carregando campanhas..." />
    } @else if (data(); as page) {
      @if (page.total === 0) {
        <div class="card">
          @if (search.value.trim()) {
            <app-empty-state icon="search" title="Nenhuma campanha encontrada" message="Tente buscar por outro termo." />
          } @else {
            <app-empty-state icon="megaphone" title="Você ainda não criou campanhas" message="Gere uma campanha completa com conceito, posts, legendas e calendário.">
              <a routerLink="/campaigns/new" class="btn btn-primary btn-sm">Criar primeira campanha</a>
            </app-empty-state>
          }
        </div>
      } @else {
        <div class="grid grid-3" [style.opacity]="loading() ? 0.6 : 1">
          @for (item of page.items; track item.id) {
            <article class="card" style="display:flex;flex-direction:column;gap:.5rem;margin:0">
              <h3 style="margin:0"><a [routerLink]="['/campaigns', item.id]">{{ item.name }}</a></h3>
              <p class="muted small" style="margin:0">{{ item.product_or_service }}</p>
              @if (item.period) { <span class="badge" style="align-self:flex-start">{{ item.period }}</span> }
              <p class="muted small" style="margin:0">Criada em {{ item.created_at | date: 'dd/MM/yyyy' }}</p>
              <div class="form-actions" style="margin-top:auto">
                <a class="btn btn-secondary btn-sm" [routerLink]="['/campaigns', item.id]">Abrir</a>
                <button type="button" class="btn btn-ghost btn-sm" (click)="remove(item)" [attr.aria-label]="'Excluir campanha ' + item.name"><app-icon name="trash" /> Excluir</button>
              </div>
            </article>
          }
        </div>
        <app-pagination [page]="page.page" [pages]="page.pages" [total]="page.total" [disabled]="loading()" (pageChange)="goTo($event)" />
      }
    }
  `,
})
export class CampaignListComponent implements OnInit {
  private readonly service = inject(CampaignService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly data = signal<Page<Campaign> | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  private page = 1;
  private readonly trigger$ = new Subject<void>();

  ngOnInit(): void {
    this.search.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page = 1;
        this.reload();
      });

    this.trigger$
      .pipe(
        startWith(undefined),
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap(() =>
          this.service.list(this.page, PAGE_SIZE, this.search.value).pipe(
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

  protected reload(): void {
    this.trigger$.next();
  }

  protected goTo(page: number): void {
    this.page = page;
    this.reload();
  }

  protected async remove(item: Campaign): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Excluir campanha?',
      message: `“${item.name}” será removida permanentemente. Esta ação não pode ser desfeita.`,
      confirmText: 'Excluir',
    });
    if (!ok) return;
    this.service.delete(item.id).subscribe({
      next: () => {
        this.toast.success('Campanha excluída.');
        if (this.data()?.items.length === 1 && this.page > 1) this.page -= 1;
        this.reload();
      },
      error: (err: unknown) => this.toast.error(apiErrorMessage(err)),
    });
  }
}
