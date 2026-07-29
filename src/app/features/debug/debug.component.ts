import { Component } from '@angular/core';
import { PipelineService } from '../../services/pipeline/pipeline.service';
import { DecimalPipe } from '@angular/common';
import { LensComponent } from '../lens/lens.component';

@Component({
  selector: 'app-debug',
  imports: [DecimalPipe, LensComponent],
  templateUrl: './debug.component.html',
  styleUrl: './debug.component.css',
})
export class DebugComponent {
  constructor(readonly pipeline: PipelineService) {}

  toggleBoundingBoxes(): void {
    this.pipeline.debugSettings.update((settings) => ({
      ...settings,

      boundingBoxes: !settings.boundingBoxes,
    }));
  }

  toggleProbabilityMap(): void {
    this.pipeline.debugSettings.update((settings) => ({
      ...settings,

      probabilityMap: !settings.probabilityMap,
    }));
  }
}
