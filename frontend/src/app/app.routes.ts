import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/guards/auth.guard';
import { ShellComponent } from './layout/shell.component';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'AI Content Manager',
    loadComponent: () => import('./features/landing/landing.component').then((m) => m.LandingComponent),
  },
  {
    path: 'login',
    title: 'Entrar | AI Content Manager',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    title: 'Criar conta | AI Content Manager',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        title: 'Dashboard | AI Content Manager',
        loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'content/generate',
        title: 'Gerar conteúdo | AI Content Manager',
        loadComponent: () =>
          import('./features/content-generator/content-generator.component').then((m) => m.ContentGeneratorComponent),
      },
      {
        path: 'contents',
        title: 'Conteúdos | AI Content Manager',
        loadComponent: () =>
          import('./features/contents/content-list/content-list.component').then((m) => m.ContentListComponent),
      },
      {
        path: 'contents/:id',
        title: 'Conteúdo | AI Content Manager',
        loadComponent: () =>
          import('./features/contents/content-detail/content-detail.component').then((m) => m.ContentDetailComponent),
      },
      {
        path: 'campaigns',
        title: 'Campanhas | AI Content Manager',
        loadComponent: () =>
          import('./features/campaigns/campaign-list/campaign-list.component').then((m) => m.CampaignListComponent),
      },
      {
        path: 'campaigns/new',
        title: 'Nova campanha | AI Content Manager',
        loadComponent: () =>
          import('./features/campaigns/campaign-new/campaign-new.component').then((m) => m.CampaignNewComponent),
      },
      {
        path: 'campaigns/:id',
        title: 'Campanha | AI Content Manager',
        loadComponent: () =>
          import('./features/campaigns/campaign-detail/campaign-detail.component').then(
            (m) => m.CampaignDetailComponent,
          ),
      },
      {
        path: 'company',
        title: 'Minha empresa | AI Content Manager',
        loadComponent: () => import('./features/company/company.component').then((m) => m.CompanyComponent),
      },
      {
        path: 'profile',
        title: 'Perfil | AI Content Manager',
        loadComponent: () => import('./features/profile/profile.component').then((m) => m.ProfileComponent),
      },
    ],
  },
  {
    path: '**',
    title: 'Página não encontrada | AI Content Manager',
    loadComponent: () => import('./features/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
