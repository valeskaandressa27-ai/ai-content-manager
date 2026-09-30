import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { GenerationResult, Usage } from '../../../core/models/ai.model';
import { CampaignGeneratePayload } from '../../../core/models/campaign.model';
import { Company } from '../../../core/models/company.model';
import { AiService } from '../../../core/services/ai.service';
import { apiErrorCode, apiErrorMessage } from '../../../core/services/api-error';
import { CampaignService } from '../../../core/services/campaign.service';
import { ClipboardService } from '../../../core/services/clipboard.service';
import { CompanyService } from '../../../core/services/company.service';
import { ToastService } from '../../../core/services/toast.service';
import { FieldErrorComponent } from '../../../shared/components/field-error.component';
import { IconComponent } from '../../../shared/components/icon.component';
import { UsageMeterComponent } from '../../../shared/components/usage-meter.component';
import { TONES } from '../../../shared/constants/options';
import { emptyToNull } from '../../../shared/utils';

@Component({
  selector: 'app-campaign-new',
  imports: [ReactiveFormsModule, FormsModule, RouterLink, FieldErrorComponent, IconComponent, UsageMeterComponent],
  template: `
    <p><a routerLink="/campaigns">← Voltar para campanhas</a></p>
    <div class="page-head">
      <div>
        <h1>Nova campanha</h1>
        <p>A IA monta conceito, ideias de posts, legendas, CTAs, hashtags, formatos e calendário.</p>
      </div>
    </div>

    <app-usage-meter [usage]="usage()" />

    <div class="split" style="margin-top:1rem">
      <section class="card" aria-labelledby="camp-form-title">
        <div class="card-title"><h2 id="camp-form-title">Dados da campanha</h2></div>

        @if (companyLoaded() && company() === null) {
          <div class="alert alert-info">Cadastre sua empresa em <a routerLink="/company">Minha empresa</a> para a IA considerar o contexto da marca.</div>
        }

        <form [formGroup]="form" (ngSubmit)="generate()" novalidate>
          <div class="field">
            <label for="name">Nome da campanha</label>
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
          <div class="field">
            <label for="objective">Objetivo</label>
            <input id="objective" class="input" type="text" formControlName="objective" maxlength="300" placeholder="Ex.: aumentar agendamentos" />
          </div>
          <div class="field">
            <label for="target_audience">Público-alvo</label>
            <input id="target_audience" class="input" type="text" formControlName="target_audience" maxlength="300" />
          </div>
          <div class="form-grid">
            <div class="field">
              <label for="period">Período</label>
              <input id="period" class="input" type="text" formControlName="period" maxlength="150" placeholder="Ex.: 2 semanas em maio" />
            </div>
            <div class="field">
              <label for="tone">Tom</label>
              <select id="tone" class="select" formControlName="tone">
                <option value="">Usar o da empresa / padrão</option>
                @for (tone of tones; track tone) { <option [value]="tone">{{ tone }}</option> }
              </select>
            </div>
          </div>
          <div class="field">
            <label for="additional_info">Informações adicionais</label>
            <textarea id="additional_info" class="textarea" formControlName="additional_info" maxlength="1000"></textarea>
          </div>
          <label class="check" style="margin-bottom:1rem">
            <input type="checkbox" formControlName="use_company_context" />
            <span>Usar as informações da minha empresa como contexto</span>
          </label>

          @if (error()) { <div class="alert alert-error" role="alert">{{ error() }}</div> }
          <button type="submit" class="btn btn-primary btn-block" [disabled]="generating() || noQuota()">
            @if (generating()) { <span class="spinner" aria-hidden="true"></span> Gerando campanha... } @else { <app-icon name="sparkles" /> Gerar campanha }
          </button>
          @if (noQuota()) { <p class="hint" style="margin-top:.5rem">Limite diário atingido. Tente novamente amanhã.</p> }
        </form>
      </section>

      <section class="card" aria-labelledby="camp-result-title" aria-live="polite">
        <div class="card-title"><h2 id="camp-result-title">Plano da campanha</h2></div>
        @if (generating()) {
          <div class="loading-block" role="status"><span class="spinner" aria-hidden="true"></span> A IA está montando sua campanha...</div>
        } @else if (result()) {
          <div class="field">
            <label for="result-text">Conteúdo (você pode editar)</label>
            <textarea id="result-text" class="textarea tall" [ngModel]="text()" (ngModelChange)="text.set($event)"></textarea>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-primary" (click)="save()" [disabled]="saving() || !text().trim()">
              @if (saving()) { <span class="spinner" aria-hidden="true"></span> } @else { <app-icon name="save" /> } Salvar campanha
            </button>
            <button type="button" class="btn btn-secondary" (click)="copy()"><app-icon name="copy" /> Copiar</button>
            <button type="button" class="btn btn-secondary" (click)="regenerate()" [disabled]="generating() || noQuota()" title="Consome uma nova geração">
              <app-icon name="refresh" /> Regenerar (usa 1 geração)
            </button>
            <button type="button" class="btn btn-ghost" (click)="discard()"><app-icon name="trash" /> Descartar</button>
          </div>
        } @else {
          <div class="empty">
            <div class="empty-icon"><app-icon name="megaphone" /></div>
            <h3>Nenhuma campanha gerada</h3>
            <p>Preencha os dados e clique em “Gerar campanha”.</p>
          </div>
        }
      </section>
    </div>
  `,
})
export class CampaignNewComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly ai = inject(AiService);
  private readonly campaigns = inject(CampaignService);
  private readonly companies = inject(CompanyService);
  private readonly clipboard = inject(ClipboardService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly tones = TONES;
  protected readonly usage = signal<Usage | null>(null);
  protected readonly company = signal<Company | null>(null);
  protected readonly companyLoaded = signal(false);
  protected readonly generating = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly result = signal<GenerationResult | null>(null);
  protected readonly text = signal('');
  private lastPayload: CampaignGeneratePayload | null = null;

  protected readonly noQuota = computed(() => (this.usage()?.remaining ?? 1) <= 0);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
    product_or_service: ['', [Validators.required, Validators.maxLength(200)]],
    objective: [''],
    target_audience: [''],
    period: [''],
    tone: [''],
    additional_info: [''],
    use_company_context: [true],
  });

  ngOnInit(): void {
    this.refreshUsage();
    this.companies.get().subscribe({
      next: (company) => {
        this.company.set(company);
        this.companyLoaded.set(true);
      },
      error: () => this.companyLoaded.set(false),
    });
  }

  private refreshUsage(): void {
    this.ai.usage().subscribe({ next: (usage) => this.usage.set(usage), error: () => undefined });
  }

  protected generate(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.run({
      name: v.name.trim(),
      product_or_service: v.product_or_service.trim(),
      objective: emptyToNull(v.objective),
      target_audience: emptyToNull(v.target_audience),
      period: emptyToNull(v.period),
      tone: emptyToNull(v.tone),
      additional_info: emptyToNull(v.additional_info),
      use_company_context: v.use_company_context,
    });
  }

  protected regenerate(): void {
    if (this.lastPayload) this.run(this.lastPayload);
  }

  private run(payload: CampaignGeneratePayload): void {
    if (this.generating()) return;
    this.generating.set(true);
    this.error.set(null);
    this.lastPayload = payload;
    this.ai.generateCampaign(payload).subscribe({
      next: (res) => {
        this.result.set(res);
        this.usage.set(res.usage);
        this.text.set(res.generated_content);
        this.generating.set(false);
        this.toast.success('Campanha gerada! Revise, edite e salve.');
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(apiErrorMessage(err));
        this.generating.set(false);
        if (apiErrorCode(err) === 'AI_LIMIT_REACHED') this.refreshUsage();
      },
    });
  }

  protected save(): void {
    const payload = this.lastPayload;
    if (!payload || this.saving() || !this.text().trim()) return;
    this.saving.set(true);
    const { use_company_context: _ignored, ...fields } = payload;
    this.campaigns.create({ ...fields, generated_content: this.text().trim() }).subscribe({
      next: (campaign) => {
        this.toast.success('Campanha salva.');
        void this.router.navigate(['/campaigns', campaign.id]);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.toast.error(apiErrorMessage(err));
      },
    });
  }

  protected copy(): void {
    void this.clipboard.copy(this.text());
  }

  protected discard(): void {
    this.result.set(null);
    this.text.set('');
  }
}
