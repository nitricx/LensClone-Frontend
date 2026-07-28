import { Component, signal } from '@angular/core';
import { LensComponent } from './features/lens/lens.component';
import { DebugComponent } from './features/debug/debug.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [LensComponent, DebugComponent],
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
