import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class PreprocessService {
  private canvas = document.createElement('canvas');

  capture(video: HTMLVideoElement): ImageData {
    this.canvas.width = video.videoWidth;
    this.canvas.height = video.videoHeight;

    const ctx = this.canvas.getContext('2d')!;

    ctx.drawImage(video, 0, 0);

    return ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
  }
}
