import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Campaign } from '../../../core/models/campaign.model';
import { apiErrorMessage } from '../../../core/services/api-error';
import { CampaignService } from '../../../core/services/campaign.service';
import { ClipboardService } from '../../../core/services/clipboard.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { FieldErrorComponent } from '../../../shared/components/field-error.component';
import { IconComponent } from '../../../shared/components/icon.component';
import { LoadingComponent } from '../../../shared/components/loading.component';
import { TONES } from '../../../shared/constants/options';
import { emptyToNull } from '../../../shared/utils';

@Component({
  selector: 'app-campaign-detail',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, FieldErrorComponent, IconComponent, LoadingComponent],
  template: `
    <p><a routerLink="/campaigns">← Voltar para campanhas</a></p>

    @if (loading()) {
      <app-loading text="Carregando campanha..." />
    } @else if (notFound()) {
      <div class="card empty">
        <h3>Campanha não encontrada</h3>
        <p>Ela pode ter sido excluída ou não pertence à sua conta.</p>
        <a routerLink="/campaigns" class="btn btn-primary btn-sm">Ver minhas campanhas</a>
      </div>
    } @else if (error()) {
      <div class="alert alert-error" role="alert">{{ error() }}</div>
    } @else if (campaign(); as c) {
      <div class="page-head">
        <div>
          <h1>{{ c.name }}</h1>
          <p class="muted small">Criada em {{ c.created_at | date: 'dd/MM/yyyy HH:mm' }} · atualizada em {{ c.updated_at | date: 'dd/MM/yyyy HH:mm' }}</p>
        </div>
      </div>

      <form [formGroup]="form" (ngSubmit)="save()" novalidate>
        <div class="split">
          <section class="card" aria-labelledby="camp-data-title">
            <div class="card-title"><h2 id="camp-data-title">Dados da campanha</h2></div>
            <div class="field">
              <label for="name">Nome</label>
              <input id="name" class="input" type="text" formControlName="name" maxlength="150"
                [attr.aria-invalid]="form.controls.name.invalid && form.controls.name.touched" aria-describedby="name-error" />
              <app-field-error [control]="form.controls.name" id="name-error" minLengthText="Informe ao menos 2 caracteres." />
            </div>
            <div class="field">
              <label for="product_or_service">Produto ou serviço</label>
              <input id="product_or_service" class="input" type="text" formControlName="product_or_service" maxlength="200"
                [attr.aria-invalid]="form.controls.product_or_service.invalid && form.controls.product_or_service.touched" aria-describedby="product-error" />
              <app-field-error [control]="form.controls.product_or_service" id="product-error" />
            </div>
            <div class="field"><label for="objective">Objetivo</label><input id="objective" class="input" type="text" formControlName="objective" maxlength="300" /></div>
            <div class="field"><label for="target_audience">Público-alvo</label><input id="target_audience" class="input" type="text" formControlName="target_audience" maxlength="300" /></div>
            <div class="form-grid">
              <div class="field"><label for="period">Período</label><input id="period" class="input" type="text" formControlName="period" maxlength="150" /></div>
              <div class="field">
                <label for="tone">Tom</label>
                <select id="tone" class="select" formControlName="tone">
                  <option value="">Não definido</option>
                  @for (tone of tones; track tone) { <option [value]="tone">{{ tone }}</option> }
                </select>
              </div>
            </div>
            <div class="field"><label for="additional_info">Informações adicionais</label><textarea id="additional_info" class="textarea" formControlName="additional_info" maxlength="1000"></textarea></div>
          </section>

          <section class="card" aria-labelledby="camp-plan-title">
            <div class="card-title"><h2 id="camp-plan-title">Plano da campanha</h2></div>
            <div class="field">
              <label for="generated_content">Conteúdo</label>
              <textarea id="generated_content" class="textarea tall" formControlName="generated_content"
                [attr.aria-invalid]="form.controls.generated_content.invalid && form.controls.generated_content.touched" aria-describedby="plan-error"></textarea>
              <app-field-error [control]="form.controls.generated_content" id="plan-error" />
            </div>
          </section>
        </div>

        <div class="form-actions" style="margin-top:1rem">
          <button type="submit" class="btn btn-primary" [disabled]="saving() || form.pristine">
            @if (saving()) { <span class="spinner" aria-hidden="true"></span> } @else { <app-icon name="save" /> } Salvar alterações
          </button>
          <button type="button" class="btn btn-secondary" (click)="copy()"><app-icon name="copy" /> Copiar plano</button>
          <button type="button" class="btn btn-ghost" (click)="remove()"><app-icon name="trash" /> Excluir</button>
        </div>
      </form>
    }
  `,
})
export class CampaignDetailComponent implements OnInit {
  readonly id = input.required<string>();

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(CampaignService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly clipboard = inject(ClipboardService);
  private readonly router = inject(Router);

  protected readonly tones = TONES;
  protected readonly campaign = signal<Campaign | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly notFound = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
    product_or_service: ['', [Validators.required, Validators.maxLength(200)]],
    objective: [''],
    target_audience: [''],
    period: [''],
    tone: [''],
    additional_info: [''],
    generated_content: ['', [Validators.required, Validators.maxLength(30000)]],
  });

  ngOnInit(): void {
    const numericId = Number(this.id());
    if (!Number.isInteger(numericId) || numericId <= 0) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }
    this.service.get(numericId).subscribe({
      next: (campaign) => {
        this.setCampaign(campaign);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 404) this.notFound.set(true);
        else this.error.set(apiErrorMessage(err));
        this.loading.set(false);
      },
    });
  }

  private setCampaign(c: Campaign): void {
    this.campaign.set(c);
    this.form.reset({
      name: c.name,
      product_or_service: c.product_or_service,
      objective: c.objective ?? '',
      target_audience: c.target_audience ?? '',
      period: c.period ?? '',
      tone: c.tone ?? '',
      additional_info: c.additional_info ?? '',
      generated_content: c.generated_content,
    });
  }

  protected save(): void {
    const campaign = this.campaign();
    this.form.markAllAsTouched();
    if (!campaign || this.form.invalid || this.saving()) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    this.service
      .update(campaign.id, {
        name: v.name.trim(),
        product_or_service: v.product_or_service.trim(),
        objective: emptyToNull(v.objective),
        target_audience: emptyToNull(v.target_audience),
        period: emptyToNull(v.period),
        tone: emptyToNull(v.tone),
        additional_info: emptyToNull(v.additional_info),
        generated_content: v.generated_content.trim(),
      })
      .subscribe({
        next: (updated) => {
          this.setCampaign(updated);
          this.saving.set(false);
          this.toast.success('Alterações salvas.');
        },
        error: (err: unknown) => {
          this.saving.set(false);
          this.toast.error(apiErrorMessage(err));
        },
      });
  }

  protected copy(): void {
    void this.clipboard.copy(this.form.getRawValue().generated_content);
  }

  protected async remove(): Promise<void> {
    const campaign = this.campaign();
    if (!campaign) return;
    const ok = await this.confirm.confirm({
      title: 'Excluir campanha?',
      message: `“${campaign.name}” será removida permanentemente. Esta ação não pode ser desfeita.`,
      confirmText: 'Excluir',
    });
    if (!ok) return;
    this.service.delete(campaign.id).subscribe({
      next: () => {
        this.toast.success('Campanha excluída.');
        void this.router.navigate(['/campaigns']);
      },
      error: (err: unknown) => this.toast.error(apiErrorMessage(err)),
    });
  }
}
