import { Component } from '@angular/core';
import { PipelineService } from '../../services/pipeline/pipeline.service';

@Component({
  selector: 'app-debug',
  imports: [],
  templateUrl: './debug.html',
  styleUrl: './debug.css',
})
export class Debug {
  constructor(readonly pipeline: PipelineService) {}
}
