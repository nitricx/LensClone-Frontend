import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { LensComponent } from '../lens/lens.component';
import { PipelineService } from '../../services/pipeline/pipeline.service';
import { DebugSettings } from './debug-settings';
import { CropCanvasComponent } from './crop-canvas.component';

type DebugSettingKey = keyof DebugSettings & string;

interface DebugControl {
  key: DebugSettingKey;
  label: string;
}

@Component({
  selector: 'app-debug',
  imports: [DecimalPipe, LensComponent, CropCanvasComponent],
  templateUrl: './debug.component.html',
  styleUrl: './debug.component.css',
})
export class DebugComponent implements OnInit, OnDestroy {
  readonly controls: DebugControl[] = [
    { key: 'boundingBoxes', label: 'Bounding Boxes' },
    { key: 'croppedRegions', label: 'Cropped Regions' },
    { key: 'recognizedText', label: 'Recognized Text' },
    { key: 'canonicalText', label: 'Canonical Text' },
    { key: 'lineGrouping', label: 'Line Grouping' },
  ];

  readonly initialHeapMb = signal<number | null>(null);
  readonly currentHeapMb = signal<number | null>(null);
  readonly totalHeapMb = signal<number | null>(null);
  readonly limitHeapMb = signal<number | null>(null);
  readonly peakHeapMb = signal<number | null>(null);

  readonly activeTab = signal<'crops' | 'text' | 'grouping'>('crops');
  private intervalId?: number;

  constructor(readonly pipeline: PipelineService) {}

  ngOnInit(): void {
    this.updateMemoryStats();
    if (typeof window !== 'undefined') {
      this.intervalId = window.setInterval(() => this.updateMemoryStats(), 1000);
    }
  }

  ngOnDestroy(): void {
    if (this.intervalId !== undefined) {
      clearInterval(this.intervalId);
    }
  }

  toggle(setting: DebugSettingKey): void {
    this.pipeline.debugSettings.update((settings) => ({
      ...settings,
      [setting]: !settings[setting],
    }));
  }

  updateMemoryStats(): void {
    const memory = typeof performance !== 'undefined' ? (performance as any).memory : null;
    if (!memory) return;

    const usedMb = memory.usedJSHeapSize / (1024 * 1024);
    const totalMb = memory.totalJSHeapSize / (1024 * 1024);
    const limitMb = memory.jsHeapSizeLimit / (1024 * 1024);

    if (this.initialHeapMb() === null) {
      this.initialHeapMb.set(usedMb);
    }

    const peak = this.peakHeapMb() ?? 0;
    if (usedMb > peak) {
      this.peakHeapMb.set(usedMb);
    }

    this.currentHeapMb.set(usedMb);
    this.totalHeapMb.set(totalMb);
    this.limitHeapMb.set(limitMb);
  }
}

