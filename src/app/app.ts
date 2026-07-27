import { Component, signal } from '@angular/core';
import { Lens } from './features/lens/lens';
import { Debug } from './features/debug/debug';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [Lens, Debug],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly tab = signal<'lens' | 'debug'>('lens');

  protected showLens(): void {
    this.tab.set('lens');
  }

  protected showDebug(): void {
    this.tab.set('debug');
  }
}
