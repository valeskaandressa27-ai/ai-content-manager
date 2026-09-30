import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <div class="auth-wrap">
      <div class="card auth-card" style="text-align:center">
        <h1>Página não encontrada</h1>
        <p class="muted">O endereço que você acessou não existe ou foi movido.</p>
        <a routerLink="/" class="btn btn-primary">Voltar ao início</a>
      </div>
    </div>
  `,
})
export class NotFoundComponent {}
