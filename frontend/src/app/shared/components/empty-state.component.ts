import { Component, input } from '@angular/core';

import { IconComponent } from './icon.component';

@Component({
  selector: 'app-empty-state',
  imports: [IconComponent],
  template: `
    <div class="empty">
      <div class="empty-icon"><app-icon [name]="icon()" /></div>
      <h3>{{ title() }}</h3>
      <p>{{ message() }}</p>
      <ng-content />
    </div>
  `,
})
export class EmptyStateComponent {
  readonly icon = input('file');
  readonly title = input.required<string>();
  readonly message = input('');
}
