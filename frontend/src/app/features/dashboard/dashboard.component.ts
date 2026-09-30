import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Dashboard } from '../../core/models/dashboard.model';
import { apiErrorMessage } from '../../core/services/api-error';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { IconComponent } from '../../shared/components/icon.component';
import { LoadingComponent } from '../../shared/components/loading.component';
import { UsageMeterComponent } from '../../shared/components/usage-meter.component';
import { contentTypeLabel } from '../../shared/constants/options';

const BAR_MAX_PX = 96;

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe, EmptyStateComponent, IconComponent, LoadingComponent, UsageMeterComponent],
  template: `
    <div class="page-head">
      <div>
        <h1>Olá, {{ auth.firstName() }}!</h1>
        <p>Acompanhe sua produção de conteúdo e o uso de IA.</p>
      </div>
      <a routerLink="/content/generate" class="btn btn-primary"><app-icon name="sparkles" /> Gerar conteúdo</a>
    </div>

    @if (loading()) {
      <app-loading text="Carregando indicadores..." />
    } @else if (error()) {
      <div class="alert alert-error" role="alert">
        {{ error() }} <button type="button" class="btn btn-secondary btn-sm" (click)="load()">Tentar novamente</button>
      </div>
    } @else if (data(); as d) {
      <div class="grid grid-4">
        <div class="card stat"><div class="label">Conteúdos</div><div class="value">{{ d.totals.contents }}</div></div>
        <div class="card stat"><div class="label">Conteúdos salvos</div><div class="value">{{ d.totals.saved_contents }}</div></div>
        <div class="card stat"><div class="label">Campanhas</div><div class="value">{{ d.totals.campaigns }}</div></div>
        <div class="card stat"><div class="label">Gerações de IA</div><div class="value">{{ d.totals.generations }}</div></div>
      </div>

      <div style="margin-top:1rem"><app-usage-meter [usage]="d.usage" /></div>

      <div class="split" style="margin-top:1rem">
        <section class="card" aria-labelledby="usage-title">
          <div class="card-title"><h2 id="usage-title">Uso de IA nos últimos 14 dias</h2></div>
          @if (hasUsage()) {
            <div class="bars" role="img" [attr.aria-label]="'Gerações por dia nos últimos 14 dias'">
              @for (day of d.usage_last_days; track day.date) {
                <div class="col">
                  <span class="num">{{ day.count || '' }}</span>
                  <div class="bar" [class.zero]="day.count === 0" [style.height.px]="barHeight(day.count)"></div>
                  <span class="day">{{ dayLabel(day.date) }}</span>
                </div>
              }
            </div>
          } @else {
            <app-empty-state icon="zap" title="Nenhuma geração ainda" message="Quando você gerar conteúdos, o gráfico aparece aqui." />
          }
        </section>

        <section class="card" aria-labelledby="types-title">
          <div class="card-title"><h2 id="types-title">Conteúdos por tipo</h2></div>
          @if (d.contents_by_type.length) {
            @for (item of d.contents_by_type; track item.type) {
              <div class="hbar">
                <span class="name" [title]="label(item.type)">{{ label(item.type) }}</span>
                <span class="track"><span [style.width.%]="typePercent(item.count)"></span></span>
                <span class="count">{{ item.count }}</span>
              </div>
            }
          } @else {
            <app-empty-state icon="file" title="Sem conteúdos salvos" message="Salve conteúdos para ver a distribuição por tipo." />
          }
        </section>
      </div>

      <div class="split" style="margin-top:1rem">
        <section class="card" aria-labelledby="recent-gen-title">
          <div class="card-title"><h2 id="recent-gen-title">Gerações recentes</h2></div>
          @if (d.recent_generations.length) {
            <ul class="list">
              @for (g of d.recent_generations; track g.id) {
                <li>
                  <span><span class="title">{{ label(g.generation_type) }}</span>
                    @if (g.content_id) { · <a [routerLink]="['/contents', g.content_id]">ver conteúdo salvo</a> }
                  </span>
                  <span class="muted small">{{ g.created_at | date: 'dd/MM HH:mm' }}</span>
                </li>
              }
            </ul>
          } @else {
            <app-empty-state icon="sparkles" title="Sem gerações recentes" message="Suas últimas gerações de IA aparecem aqui." />
          }
        </section>

        <section class="card" aria-labelledby="activity-title">
          <div class="card-title"><h2 id="activity-title">Atividades recentes</h2></div>
          @if (d.recent_activity.length) {
            <ul class="list">
              @for (a of d.recent_activity; track a.kind + a.id) {
                <li>
                  <span style="min-width:0">
                    <span class="badge" [class.badge-primary]="a.kind === 'campaign'">{{ a.kind === 'campaign' ? 'Campanha' : 'Conteúdo' }}</span>
                    <a [routerLink]="[a.kind === 'campaign' ? '/campaigns' : '/contents', a.id]" class="title" style="margin-left:.4rem">{{ a.title }}</a>
                  </span>
                  <span class="muted small">{{ a.created_at | date: 'dd/MM HH:mm' }}</span>
                </li>
              }
            </ul>
          } @else {
            <app-empty-state icon="layers" title="Nada por aqui ainda" message="Crie um conteúdo ou uma campanha para começar.">
              <a routerLink="/content/generate" class="btn btn-primary btn-sm">Gerar primeiro conteúdo</a>
            </app-empty-state>
          }
        </section>
      </div>
    }
  `,
})
export class DashboardComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly service = inject(DashboardService);

  protected readonly data = signal<Dashboard | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  private readonly maxDaily = computed(() => Math.max(1, ...(this.data()?.usage_last_days.map((d) => d.count) ?? [1])));
  private readonly maxType = computed(() => Math.max(1, ...(this.data()?.contents_by_type.map((t) => t.count) ?? [1])));
  protected readonly hasUsage = computed(() => (this.data()?.usage_last_days ?? []).some((d) => d.count > 0));

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.load().subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(apiErrorMessage(err));
        this.loading.set(false);
      },
    });
  }

  protected label(type: string): string {
    return contentTypeLabel(type);
  }

  protected barHeight(count: number): number {
    return count === 0 ? 3 : Math.max(6, Math.round((count / this.maxDaily()) * BAR_MAX_PX));
  }

  protected typePercent(count: number): number {
    return Math.round((count / this.maxType()) * 100);
  }

  protected dayLabel(isoDate: string): string {
    return `${isoDate.slice(8, 10)}/${isoDate.slice(5, 7)}`;
  }
}
