import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CameraService {
  async start(video: HTMLVideoElement): Promise<{
    width: number;
    height: number;
  }> {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
      },
      audio: false,
    });

    video.srcObject = stream;

    await video.play();

    return {
      width: video.videoWidth,
      height: video.videoHeight,
    };
  }
}
