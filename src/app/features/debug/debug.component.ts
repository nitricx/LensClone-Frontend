import { Component } from '@angular/core';
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
export class DebugComponent {
  readonly controls: DebugControl[] = [
    { key: 'boundingBoxes', label: 'Bounding Boxes' },
    { key: 'croppedRegions', label: 'Cropped Regions' },
    { key: 'recognizedText', label: 'Recognized Text' },
    { key: 'canonicalText', label: 'Canonical Text' },
    { key: 'lineGrouping', label: 'Line Grouping' },
  ];

  constructor(readonly pipeline: PipelineService) {}

  toggle(setting: DebugSettingKey): void {
    this.pipeline.debugSettings.update((settings) => ({
      ...settings,
      [setting]: !settings[setting],
    }));
  }
}
