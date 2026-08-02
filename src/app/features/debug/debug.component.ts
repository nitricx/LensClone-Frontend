import { Component, effect, ElementRef, viewChildren } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { LensComponent } from '../lens/lens.component';
import { PipelineService } from '../../services/pipeline/pipeline.service';
import { DebugSettings } from './debug-settings';

type DebugSettingKey = keyof DebugSettings & string;

interface DebugControl {
  key: DebugSettingKey;
  label: string;
}

@Component({
  selector: 'app-debug',
  imports: [DecimalPipe, LensComponent],
  templateUrl: './debug.component.html',
  styleUrl: './debug.component.css',
})
export class DebugComponent {
  private readonly cropCanvases = viewChildren<ElementRef<HTMLCanvasElement>>('cropCanvas');

  readonly controls: DebugControl[] = [
    { key: 'boundingBoxes', label: 'Bounding Boxes' },
    { key: 'croppedRegions', label: 'Cropped Regions' },
    { key: 'recognizedText', label: 'Recognized Text' },
    { key: 'canonicalText', label: 'Canonical Text' },
    { key: 'lineGrouping', label: 'Line Grouping' },
  ];

  constructor(readonly pipeline: PipelineService) {
    effect(() => {
      const detections = this.pipeline.state().detections;
      const canvases = this.cropCanvases();

      let canvasIndex = 0;

      for (const detection of detections) {
        if (!detection.crop) {
          continue;
        }

        const canvas = canvases[canvasIndex++]?.nativeElement;
        if (!canvas) {
          continue;
        }

        canvas.width = detection.crop.width;
        canvas.height = detection.crop.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          continue;
        }

        ctx.putImageData(detection.crop, 0, 0);
      }
    });
  }

  toggle(setting: DebugSettingKey): void {
    this.pipeline.debugSettings.update((settings) => ({
      ...settings,
      [setting]: !settings[setting],
    }));
  }
}
