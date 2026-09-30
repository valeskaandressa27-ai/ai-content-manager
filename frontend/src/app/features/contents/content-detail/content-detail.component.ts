import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Content, ContentStatus } from '../../../core/models/content.model';
import { apiErrorMessage } from '../../../core/services/api-error';
import { ClipboardService } from '../../../core/services/clipboard.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ContentService } from '../../../core/services/content.service';
import { ToastService } from '../../../core/services/toast.service';
import { FieldErrorComponent } from '../../../shared/components/field-error.component';
import { IconComponent } from '../../../shared/components/icon.component';
import { LoadingComponent } from '../../../shared/components/loading.component';
import { INPUT_LABELS, STATUSES, contentTypeLabel, lengthLabel } from '../../../shared/constants/options';

@Component({
  selector: 'app-content-detail',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, FieldErrorComponent, IconComponent, LoadingComponent],
  template: `
    <p><a routerLink="/contents">← Voltar para conteúdos</a></p>

    @if (loading()) {
      <app-loading text="Carregando conteúdo..." />
    } @else if (notFound()) {
      <div class="card empty">
        <h3>Conteúdo não encontrado</h3>
        <p>Ele pode ter sido excluído ou não pertence à sua conta.</p>
        <a routerLink="/contents" class="btn btn-primary btn-sm">Ver meus conteúdos</a>
      </div>
    } @else if (error()) {
      <div class="alert alert-error" role="alert">{{ error() }}</div>
    } @else if (content(); as c) {
      <div class="page-head">
        <div>
          <h1>{{ c.title }}</h1>
          <p>
            <span class="badge badge-primary">{{ typeLabel() }}</span>
            <span class="badge" style="margin-left:.4rem" [class.badge-success]="c.status === 'saved'" [class.badge-draft]="c.status === 'draft'">{{ c.status === 'saved' ? 'Salvo' : 'Rascunho' }}</span>
            <span class="muted small" style="margin-left:.6rem">Criado em {{ c.created_at | date: 'dd/MM/yyyy HH:mm' }}</span>
          </p>
        </div>
      </div>

      <div class="split">
        <section class="card" aria-labelledby="edit-title">
          <div class="card-title"><h2 id="edit-title">Conteúdo</h2></div>
          <form [formGroup]="form" (ngSubmit)="save()" novalidate>
            <div class="field">
              <label for="title">Título</label>
              <input id="title" class="input" type="text" formControlName="title" maxlength="200"
                [attr.aria-invalid]="form.controls.title.invalid && form.controls.title.touched" aria-describedby="title-error" />
              <app-field-error [control]="form.controls.title" id="title-error" />
            </div>
            <div class="field">
              <label for="status">Status</label>
              <select id="status" class="select" formControlName="status">
                @for (s of statuses; track s.value) { <option [value]="s.value">{{ s.label }}</option> }
              </select>
            </div>
            <div class="field">
              <label for="text">Texto</label>
              <textarea id="text" class="textarea tall" formControlName="generated_content"
                [attr.aria-invalid]="form.controls.generated_content.invalid && form.controls.generated_content.touched" aria-describedby="text-error"></textarea>
              <app-field-error [control]="form.controls.generated_content" id="text-error" />
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary" [disabled]="saving() || form.pristine">
                @if (saving()) { <span class="spinner" aria-hidden="true"></span> } @else { <app-icon name="save" /> } Salvar alterações
              </button>
              <button type="button" class="btn btn-secondary" (click)="copy()"><app-icon name="copy" /> Copiar</button>
              <button type="button" class="btn btn-ghost" (click)="remove()"><app-icon name="trash" /> Excluir</button>
            </div>
          </form>
        </section>

        <section class="card" aria-labelledby="info-title">
          <div class="card-title"><h2 id="info-title">Informações utilizadas</h2></div>
          @if (inputs().length) {
            <dl class="kv">
              @for (item of inputs(); track item.label) { <dt>{{ item.label }}</dt><dd>{{ item.value }}</dd> }
            </dl>
          } @else {
            <p class="muted">Este conteúdo não possui informações de geração registradas.</p>
          }
          <p class="muted small" style="margin-top:1rem">Última atualização: {{ c.updated_at | date: 'dd/MM/yyyy HH:mm' }}</p>
        </section>
      </div>
    }
  `,
})
export class ContentDetailComponent implements OnInit {
  readonly id = input.required<string>(); // vem da rota (withComponentInputBinding)

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ContentService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly clipboard = inject(ClipboardService);
  private readonly router = inject(Router);

  protected readonly statuses = STATUSES;
  protected readonly content = signal<Content | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly notFound = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly typeLabel = computed(() => contentTypeLabel(this.content()?.type ?? ''));
  protected readonly inputs = computed(() => {
    const data = this.content()?.input_data ?? {};
    return Object.entries(data)
      .filter(([key, value]) => key !== 'content_type' && value !== null && value !== '' && value !== undefined)
      .map(([key, value]) => ({
        label: INPUT_LABELS[key] ?? key,
        value: this.formatValue(key, value),
      }));
  });

  protected readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    status: ['saved' as ContentStatus],
    generated_content: ['', [Validators.required, Validators.maxLength(20000)]],
  });

  ngOnInit(): void {
    const numericId = Number(this.id());
    if (!Number.isInteger(numericId) || numericId <= 0) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }
    this.service.get(numericId).subscribe({
      next: (content) => {
        this.setContent(content);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 404) this.notFound.set(true);
        else this.error.set(apiErrorMessage(err));
        this.loading.set(false);
      },
    });
  }

  private setContent(content: Content): void {
    this.content.set(content);
    this.form.reset({ title: content.title, status: content.status, generated_content: content.generated_content });
  }

  private formatValue(key: string, value: unknown): string {
    if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
    if (key === 'length') return lengthLabel(String(value));
    return String(value);
  }

  protected save(): void {
    const content = this.content();
    this.form.markAllAsTouched();
    if (!content || this.form.invalid || this.saving()) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    this.service
      .update(content.id, { title: v.title.trim(), status: v.status, generated_content: v.generated_content.trim() })
      .subscribe({
        next: (updated) => {
          this.setContent(updated);
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
    const content = this.content();
    if (!content) return;
    const ok = await this.confirm.confirm({
      title: 'Excluir conteúdo?',
      message: `“${content.title}” será removido permanentemente. Esta ação não pode ser desfeita.`,
      confirmText: 'Excluir',
    });
    if (!ok) return;
    this.service.delete(content.id).subscribe({
      next: () => {
        this.toast.success('Conteúdo excluído.');
        void this.router.navigate(['/contents']);
      },
      error: (err: unknown) => this.toast.error(apiErrorMessage(err)),
    });
  }
}
