import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';

import { CameraService } from '../services/camera.service';

@Component({
  selector: 'app-camera',
  standalone: true,
  templateUrl: './camera.component.html',
  styleUrls: ['./camera.component.css'],
})
export class CameraComponent implements AfterViewInit {
  @ViewChild('video')
  video!: ElementRef<HTMLVideoElement>;

  constructor(private cameraService: CameraService) {}

  async ngAfterViewInit(): Promise<void> {
    await this.cameraService.start(this.video.nativeElement);
  }

  getVideoElement(): HTMLVideoElement {
    return this.video.nativeElement;
  }
}
