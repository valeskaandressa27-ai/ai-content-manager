import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Company } from '../../core/models/company.model';
import { apiErrorMessage } from '../../core/services/api-error';
import { CompanyService } from '../../core/services/company.service';
import { ToastService } from '../../core/services/toast.service';
import { FieldErrorComponent } from '../../shared/components/field-error.component';
import { IconComponent } from '../../shared/components/icon.component';
import { LoadingComponent } from '../../shared/components/loading.component';
import { TONES } from '../../shared/constants/options';
import { emptyToNull } from '../../shared/utils';
import { applyServerErrors } from '../../shared/validators/form-errors';

@Component({
  selector: 'app-company',
  imports: [ReactiveFormsModule, FieldErrorComponent, IconComponent, LoadingComponent],
  template: `
    <div class="page-head">
      <div>
        <h1>Minha empresa</h1>
        <p>Essas informações são usadas como contexto nas gerações de IA.</p>
      </div>
    </div>

    @if (loading()) {
      <app-loading text="Carregando dados da empresa..." />
    } @else {
      @if (error()) { <div class="alert alert-error" role="alert">{{ error() }}</div> }
      @if (!exists()) {
        <div class="alert alert-info">Cadastre sua empresa para que a IA escreva no tom e para o público certos.</div>
      }
      <form class="card" [formGroup]="form" (ngSubmit)="save()" novalidate>
        <div class="form-grid">
          <div class="field">
            <label for="name">Nome da empresa</label>
            <input id="name" class="input" type="text" formControlName="name" maxlength="150"
              [attr.aria-invalid]="form.controls.name.invalid && form.controls.name.touched" aria-describedby="name-error" />
            <app-field-error [control]="form.controls.name" id="name-error" minLengthText="Informe ao menos 2 caracteres." />
          </div>
          <div class="field">
            <label for="segment">Segmento</label>
            <input id="segment" class="input" type="text" formControlName="segment" maxlength="150" placeholder="Ex.: salão de beleza" />
          </div>
          <div class="field full">
            <label for="description">Descrição</label>
            <textarea id="description" class="textarea" formControlName="description" maxlength="2000" placeholder="O que sua empresa faz e o que a diferencia"></textarea>
          </div>
          <div class="field">
            <label for="target_audience">Público-alvo</label>
            <textarea id="target_audience" class="textarea" formControlName="target_audience" maxlength="1000"></textarea>
          </div>
          <div class="field">
            <label for="communication_tone">Tom de comunicação</label>
            <select id="communication_tone" class="select" formControlName="communication_tone">
              <option value="">Não definido</option>
              @for (tone of tones; track tone) { <option [value]="tone">{{ tone }}</option> }
            </select>
          </div>
          <div class="field full">
            <label for="brand_information">Informações da marca</label>
            <textarea id="brand_information" class="textarea" formControlName="brand_information" maxlength="2000" placeholder="Valores, diferenciais, palavras a usar ou evitar"></textarea>
          </div>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" [disabled]="saving()">
            @if (saving()) { <span class="spinner" aria-hidden="true"></span> Salvando... } @else { <app-icon name="save" /> Salvar empresa }
          </button>
        </div>
      </form>
    }
  `,
})
export class CompanyComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(CompanyService);
  private readonly toast = inject(ToastService);

  protected readonly tones = TONES;
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly exists = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
    segment: [''],
    description: [''],
    target_audience: [''],
    communication_tone: [''],
    brand_information: [''],
  });

  ngOnInit(): void {
    this.service.get().subscribe({
      next: (company) => {
        if (company) this.fill(company);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(apiErrorMessage(err));
        this.loading.set(false);
      },
    });
  }

  private fill(company: Company): void {
    this.exists.set(true);
    this.form.reset({
      name: company.name,
      segment: company.segment ?? '',
      description: company.description ?? '',
      target_audience: company.target_audience ?? '',
      communication_tone: company.communication_tone ?? '',
      brand_information: company.brand_information ?? '',
    });
  }

  protected save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    const v = this.form.getRawValue();
    this.service
      .save({
        name: v.name.trim(),
        segment: emptyToNull(v.segment),
        description: emptyToNull(v.description),
        target_audience: emptyToNull(v.target_audience),
        communication_tone: emptyToNull(v.communication_tone),
        brand_information: emptyToNull(v.brand_information),
      })
      .subscribe({
        next: (company) => {
          this.fill(company);
          this.saving.set(false);
          this.toast.success('Dados da empresa salvos.');
        },
        error: (err: HttpErrorResponse) => {
          if (!applyServerErrors(this.form, err)) this.error.set(apiErrorMessage(err));
          this.saving.set(false);
        },
      });
  }
}
