import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { IconComponent } from '../../shared/components/icon.component';

@Component({
  selector: 'app-landing',
  imports: [RouterLink, IconComponent],
  template: `
    <header class="land-head">
      <a routerLink="/" class="brand"><span class="brand-mark"><app-icon name="sparkles" /></span> AI Content Manager</a>
      <div class="land-actions">
        @if (auth.hasValidSession()) {
          <a routerLink="/dashboard" class="btn btn-primary">Ir para o painel</a>
        } @else {
          <a routerLink="/login" class="btn btn-secondary">Entrar</a>
          <a routerLink="/register" class="btn btn-primary">Criar conta</a>
        }
      </div>
    </header>

    <main id="main">
      <section class="hero">
        <span class="badge badge-primary" style="margin-bottom:1rem">Marketing com IA para pequenos negócios</span>
        <h1>Crie e organize seus conteúdos de marketing <em>com inteligência artificial</em></h1>
        <p class="lead">
          Gere legendas, anúncios, e-mails e campanhas completas no tom da sua marca, edite, salve e encontre tudo em
          uma biblioteca só sua.
        </p>
        @if (!auth.hasValidSession()) {
          <div class="land-actions">
            <a routerLink="/register" class="btn btn-primary">Criar conta grátis <app-icon name="arrow" /></a>
            <a routerLink="/login" class="btn btn-secondary">Já tenho conta</a>
          </div>
        }
      </section>

      <section class="land-section" aria-labelledby="features-title">
        <h2 id="features-title">Tudo para produzir conteúdo com consistência</h2>
        <p class="sub">Ferramentas simples, pensadas para quem não tem tempo a perder.</p>
        <div class="grid grid-3">
          @for (feature of features; track feature.title) {
            <article class="card feature">
              <div class="ic"><app-icon [name]="feature.icon" /></div>
              <h3>{{ feature.title }}</h3>
              <p>{{ feature.text }}</p>
            </article>
          }
        </div>
      </section>

      <section class="land-section" aria-labelledby="how-title">
        <h2 id="how-title">Como funciona</h2>
        <p class="sub">Do cadastro ao conteúdo pronto em poucos passos.</p>
        <div class="grid grid-3">
          @for (step of steps; track step.title; let i = $index) {
            <article class="card step">
              <div class="num">{{ i + 1 }}</div>
              <h3>{{ step.title }}</h3>
              <p class="muted" style="margin:0">{{ step.text }}</p>
            </article>
          }
        </div>
      </section>

      <section class="land-section" aria-labelledby="benefits-title">
        <h2 id="benefits-title">Benefícios</h2>
        <p class="sub">Menos improviso, mais resultado.</p>
        <div class="grid grid-2">
          @for (benefit of benefits; track benefit) {
            <div class="card" style="display:flex;gap:.75rem;align-items:flex-start">
              <span style="color:var(--success);width:22px;height:22px;flex:none"><app-icon name="check" /></span>
              <span>{{ benefit }}</span>
            </div>
          }
        </div>
      </section>

      @if (!auth.hasValidSession()) {
        <section class="cta-band">
          <h2>Comece a criar agora</h2>
          <p>Cadastre-se, informe os dados da sua empresa e gere seu primeiro conteúdo.</p>
          <div class="land-actions" style="justify-content:center">
            <a routerLink="/register" class="btn btn-primary">Criar minha conta</a>
          </div>
        </section>
      }
    </main>

    <footer class="land-foot">AI Content Manager · Projeto de portfólio</footer>
  `,
})
export class LandingComponent {
  protected readonly auth = inject(AuthService);

  protected readonly features = [
    { icon: 'sparkles', title: 'Geração com IA', text: 'Legendas, descrições, anúncios, e-mails, textos para site, títulos, CTAs e mais.' },
    { icon: 'building', title: 'Contexto da sua marca', text: 'Cadastre segmento, público e tom de comunicação uma vez e use em todas as gerações.' },
    { icon: 'megaphone', title: 'Campanhas completas', text: 'Conceito, ideias de posts, legendas, CTAs, hashtags e calendário básico de publicação.' },
    { icon: 'file', title: 'Biblioteca de conteúdos', text: 'Pesquise, filtre por tipo e status, edite e reutilize tudo o que você já criou.' },
    { icon: 'layers', title: 'Dashboard real', text: 'Acompanhe conteúdos, campanhas e o uso de IA com dados da sua própria conta.' },
    { icon: 'shield', title: 'Dados só seus', text: 'Cada usuário enxerga apenas os próprios dados, com autenticação segura.' },
  ];

  protected readonly steps = [
    { title: 'Crie sua conta', text: 'Cadastro rápido, sem cartão de crédito.' },
    { title: 'Conte sobre sua empresa', text: 'Informe segmento, público-alvo e tom de comunicação.' },
    { title: 'Gere, edite e salve', text: 'Escolha o tipo de conteúdo, ajuste o texto e guarde na biblioteca.' },
  ];

  protected readonly benefits = [
    'Ganhe tempo na criação de posts e textos de venda.',
    'Mantenha a mesma voz de marca em todos os canais.',
    'Organize campanhas e conteúdos em um só lugar.',
    'Limite diário de gerações para uso equilibrado da IA.',
  ];
}
