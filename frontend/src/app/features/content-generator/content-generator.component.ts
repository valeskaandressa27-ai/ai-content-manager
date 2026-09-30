import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { GenerateContentPayload, GenerationResult, Usage } from '../../core/models/ai.model';
import { Company } from '../../core/models/company.model';
import { ContentType } from '../../core/models/content.model';
import { AiService } from '../../core/services/ai.service';
import { apiErrorCode, apiErrorMessage } from '../../core/services/api-error';
import { ClipboardService } from '../../core/services/clipboard.service';
import { CompanyService } from '../../core/services/company.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ContentService } from '../../core/services/content.service';
import { ToastService } from '../../core/services/toast.service';
import { FieldErrorComponent } from '../../shared/components/field-error.component';
import { IconComponent } from '../../shared/components/icon.component';
import { UsageMeterComponent } from '../../shared/components/usage-meter.component';
import { CONTENT_TYPES, LENGTHS, TONES, contentTypeLabel } from '../../shared/constants/options';
import { emptyToNull } from '../../shared/utils';

@Component({
  selector: 'app-content-generator',
  imports: [ReactiveFormsModule, FormsModule, RouterLink, FieldErrorComponent, IconComponent, UsageMeterComponent],
  template: `
    <div class="page-head">
      <div>
        <h1>Gerar conteúdo</h1>
        <p>Descreva o que precisa e deixe a IA escrever o primeiro rascunho.</p>
      </div>
    </div>

    <app-usage-meter [usage]="usage()" />

    <div class="split" style="margin-top:1rem">
      <section class="card" aria-labelledby="form-title">
        <div class="card-title"><h2 id="form-title">Informações do conteúdo</h2></div>

        @if (company() === null && companyLoaded()) {
          <div class="alert alert-info">
            Você ainda não cadastrou sua empresa. <a routerLink="/company">Cadastre agora</a> para que a IA use o contexto da sua marca.
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="generate()" novalidate>
          <div class="field">
            <label for="content_type">Tipo de conteúdo</label>
            <select id="content_type" class="select" formControlName="content_type">
              @for (type of types; track type.value) { <option [value]="type.value">{{ type.label }}</option> }
            </select>
          </div>
          <div class="field">
            <label for="product_or_service">Produto ou serviço</label>
            <input id="product_or_service" class="input" type="text" formControlName="product_or_service" maxlength="200"
              [attr.aria-invalid]="form.controls.product_or_service.invalid && form.controls.product_or_service.touched" aria-describedby="product-error" />
            <app-field-error [control]="form.controls.product_or_service" id="product-error" />
          </div>
          <div class="field">
            <label for="target_audience">Público-alvo</label>
            <input id="target_audience" class="input" type="text" formControlName="target_audience" maxlength="300" placeholder="Ex.: mulheres de 25 a 40 anos" />
          </div>
          <div class="field">
            <label for="objective">Objetivo</label>
            <input id="objective" class="input" type="text" formControlName="objective" maxlength="300" placeholder="Ex.: divulgar o lançamento" />
          </div>
          <div class="form-grid">
            <div class="field">
              <label for="tone">Tom de comunicação</label>
              <select id="tone" class="select" formControlName="tone">
                <option value="">Usar o da empresa / padrão</option>
                @for (tone of tones; track tone) { <option [value]="tone">{{ tone }}</option> }
              </select>
            </div>
            <div class="field">
              <label for="length">Tamanho</label>
              <select id="length" class="select" formControlName="length">
                @for (length of lengths; track length.value) { <option [value]="length.value">{{ length.label }}</option> }
              </select>
            </div>
          </div>
          <div class="field">
            <label for="additional_info">Informações adicionais</label>
            <textarea id="additional_info" class="textarea" formControlName="additional_info" maxlength="1000" placeholder="Detalhes que a IA deve considerar"></textarea>
          </div>
          <label class="check" style="margin-bottom:1rem">
            <input type="checkbox" formControlName="use_company_context" />
            <span>Usar as informações da minha empresa como contexto</span>
          </label>

          @if (error()) {
            <div class="alert alert-error" role="alert">{{ error() }}</div>
          }
          <button type="submit" class="btn btn-primary btn-block" [disabled]="generating() || noQuota()">
            @if (generating()) { <span class="spinner" aria-hidden="true"></span> Gerando... } @else { <app-icon name="sparkles" /> Gerar conteúdo }
          </button>
          @if (noQuota()) { <p class="hint" style="margin-top:.5rem">Limite diário atingido. Tente novamente amanhã.</p> }
        </form>
      </section>

      <section class="card" aria-labelledby="result-title" aria-live="polite">
        <div class="card-title"><h2 id="result-title">Resultado</h2>
          @if (result()) { <span class="badge badge-primary">{{ typeLabel() }}</span> }
        </div>

        @if (generating()) {
          <div class="loading-block" role="status"><span class="spinner" aria-hidden="true"></span> A IA está escrevendo seu conteúdo...</div>
        } @else if (result()) {
          <div class="field">
            <label for="result-title-input">Título (para salvar na biblioteca)</label>
            <input id="result-title-input" class="input" type="text" maxlength="200" [ngModel]="title()" (ngModelChange)="title.set($event)" />
          </div>
          <div class="field">
            <label for="result-text">Conteúdo (você pode editar)</label>
            <textarea id="result-text" class="textarea tall" [ngModel]="text()" (ngModelChange)="text.set($event)"></textarea>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-primary" (click)="save()" [disabled]="saving() || !canSave()">
              @if (saving()) { <span class="spinner" aria-hidden="true"></span> } @else { <app-icon name="save" /> }
              {{ savedId() ? 'Atualizar conteúdo salvo' : 'Salvar' }}
            </button>
            <button type="button" class="btn btn-secondary" (click)="copy()"><app-icon name="copy" /> Copiar</button>
            <button type="button" class="btn btn-secondary" (click)="regenerate()" [disabled]="generating() || noQuota()" title="Consome uma nova geração">
              <app-icon name="refresh" /> Regenerar (usa 1 geração)
            </button>
            <button type="button" class="btn btn-ghost" (click)="discard()"><app-icon name="trash" /> {{ savedId() ? 'Excluir' : 'Descartar' }}</button>
          </div>
          @if (savedId()) {
            <p class="small" style="margin-top:.75rem">Salvo na biblioteca. <a [routerLink]="['/contents', savedId()]">Abrir conteúdo</a></p>
          }
        } @else {
          <div class="empty">
            <div class="empty-icon"><app-icon name="sparkles" /></div>
            <h3>Nenhum conteúdo gerado</h3>
            <p>Preencha o formulário e clique em “Gerar conteúdo”.</p>
          </div>
        }
      </section>
    </div>
  `,
})
export class ContentGeneratorComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly ai = inject(AiService);
  private readonly contents = inject(ContentService);
  private readonly companies = inject(CompanyService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly clipboard = inject(ClipboardService);

  protected readonly types = CONTENT_TYPES;
  protected readonly tones = TONES;
  protected readonly lengths = LENGTHS;

  protected readonly usage = signal<Usage | null>(null);
  protected readonly company = signal<Company | null>(null);
  protected readonly companyLoaded = signal(false);
  protected readonly generating = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly result = signal<GenerationResult | null>(null);
  protected readonly text = signal('');
  protected readonly title = signal('');
  protected readonly savedId = signal<number | null>(null);
  private lastPayload: GenerateContentPayload | null = null;

  protected readonly noQuota = computed(() => (this.usage()?.remaining ?? 1) <= 0);
  protected readonly canSave = computed(() => this.text().trim().length > 0 && this.title().trim().length > 0);
  protected readonly typeLabel = computed(() => (this.lastPayload ? contentTypeLabel(this.lastPayload.content_type) : ''));

  protected readonly form = this.fb.nonNullable.group({
    content_type: ['instagram_caption' as ContentType, Validators.required],
    product_or_service: ['', [Validators.required, Validators.maxLength(200)]],
    target_audience: [''],
    objective: [''],
    tone: [''],
    length: ['medium' as 'short' | 'medium' | 'long'],
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

  private buildPayload(): GenerateContentPayload {
    const v = this.form.getRawValue();
    return {
      content_type: v.content_type,
      product_or_service: v.product_or_service.trim(),
      target_audience: emptyToNull(v.target_audience),
      objective: emptyToNull(v.objective),
      tone: emptyToNull(v.tone),
      length: v.length,
      additional_info: emptyToNull(v.additional_info),
      use_company_context: v.use_company_context,
    };
  }

  protected generate(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.run(this.buildPayload());
  }

  protected regenerate(): void {
    if (this.lastPayload) this.run(this.lastPayload);
  }

  private run(payload: GenerateContentPayload): void {
    if (this.generating()) return; // sem envio duplicado
    this.generating.set(true);
    this.error.set(null);
    this.lastPayload = payload;

    this.ai.generate(payload).subscribe({
      next: (res) => {
        this.result.set(res);
        this.usage.set(res.usage);
        this.text.set(res.generated_content);
        this.title.set(`${contentTypeLabel(payload.content_type)} — ${payload.product_or_service}`.slice(0, 200));
        this.savedId.set(null); // nova geração = novo resultado ainda não salvo
        this.generating.set(false);
        this.toast.success('Conteúdo gerado! Revise, edite e salve.');
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(apiErrorMessage(err));
        this.generating.set(false);
        if (apiErrorCode(err) === 'AI_LIMIT_REACHED') this.refreshUsage();
      },
    });
  }

  protected save(): void {
    const result = this.result();
    if (!result || !this.lastPayload || this.saving() || !this.canSave()) return;
    this.saving.set(true);

    const done = (message: string) => {
      this.saving.set(false);
      this.toast.success(message);
    };
    const fail = (err: unknown) => {
      this.saving.set(false);
      this.toast.error(apiErrorMessage(err));
    };

    const id = this.savedId();
    if (id) {
      this.contents.update(id, { title: this.title().trim(), generated_content: this.text().trim() }).subscribe({
        next: () => done('Conteúdo atualizado.'),
        error: fail,
      });
      return;
    }
    this.contents
      .create({
        type: this.lastPayload.content_type,
        title: this.title().trim(),
        generated_content: this.text().trim(),
        input_data: { ...this.lastPayload },
        status: 'saved',
        generation_id: result.generation_id,
      })
      .subscribe({
        next: (content) => {
          this.savedId.set(content.id);
          done('Conteúdo salvo na biblioteca.');
        },
        error: fail,
      });
  }

  protected copy(): void {
    void this.clipboard.copy(this.text());
  }

  protected async discard(): Promise<void> {
    const id = this.savedId();
    if (id) {
      const ok = await this.confirm.confirm({
        title: 'Excluir conteúdo salvo?',
        message: 'O conteúdo será removido da sua biblioteca. Esta ação não pode ser desfeita.',
        confirmText: 'Excluir',
      });
      if (!ok) return;
      this.contents.delete(id).subscribe({
        next: () => {
          this.toast.success('Conteúdo excluído.');
          this.resetResult();
        },
        error: (err: unknown) => this.toast.error(apiErrorMessage(err)),
      });
      return;
    }
    this.resetResult();
  }

  private resetResult(): void {
    this.result.set(null);
    this.savedId.set(null);
    this.text.set('');
    this.title.set('');
  }
}
