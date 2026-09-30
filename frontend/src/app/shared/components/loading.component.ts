import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loading',
  template: `<div class="loading-block" role="status"><span class="spinner" aria-hidden="true"></span><span>{{ text() }}</span></div>`,
})
export class LoadingComponent {
  readonly text = input('Carregando...');
}
