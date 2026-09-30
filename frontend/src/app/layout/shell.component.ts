import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

import { AuthService } from '../core/services/auth.service';
import { IconComponent } from '../shared/components/icon.component';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  template: `
    <div class="shell">
      <aside class="sidebar" [class.open]="menuOpen()" id="sidebar" aria-label="Menu principal">
        <a routerLink="/dashboard" class="brand">
          <span class="brand-mark"><app-icon name="sparkles" /></span> AI Content Manager
        </a>
        <nav class="nav">
          @for (item of items; track item.path) {
            <a [routerLink]="item.path" routerLinkActive="active" [attr.aria-label]="item.label">
              <app-icon [name]="item.icon" style="width:19px;height:19px" /> {{ item.label }}
            </a>
          }
        </nav>
        <div class="sidebar-foot">
          <button type="button" class="btn btn-ghost btn-block" (click)="auth.logout()">
            <app-icon name="logout" /> Sair
          </button>
        </div>
      </aside>
      <div class="backdrop" [class.open]="menuOpen()" (click)="menuOpen.set(false)"></div>

      <div class="main-col">
        <header class="topbar">
          <button type="button" class="btn btn-ghost icon-btn menu-toggle" aria-label="Abrir menu" aria-controls="sidebar" [attr.aria-expanded]="menuOpen()" (click)="menuOpen.set(!menuOpen())">
            <app-icon name="menu" style="width:22px;height:22px" />
          </button>
          <span class="spacer"></span>
          <a routerLink="/profile" class="user" title="Meu perfil">{{ auth.user()?.name }}</a>
          <button type="button" class="btn btn-secondary btn-sm" (click)="auth.logout()">Sair</button>
        </header>
        <main class="page" id="main">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class ShellComponent {
  protected readonly auth = inject(AuthService);
  protected readonly menuOpen = signal(false);

  protected readonly items: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/content/generate', label: 'Gerar conteúdo', icon: 'sparkles' },
    { path: '/contents', label: 'Conteúdos', icon: 'file' },
    { path: '/campaigns', label: 'Campanhas', icon: 'megaphone' },
    { path: '/company', label: 'Minha empresa', icon: 'building' },
    { path: '/profile', label: 'Perfil', icon: 'user' },
  ];

  constructor() {
    inject(Router)
      .events.pipe(filter((event) => event instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => this.menuOpen.set(false));
  }
}
