import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CameraService {
  private video!: HTMLVideoElement;
  async start(video: HTMLVideoElement): Promise<void> {
    this.video = video;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
      },
      audio: false,
    });

    video.srcObject = stream;

    if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
      await new Promise<void>((resolve) => {
        video.addEventListener('loadedmetadata', () => resolve(), {
          once: true,
        });
      });
    }

    await video.play();
  }

  getVideo(): HTMLVideoElement {
    const video = document.querySelector('video');
    if (!video) {
      throw new Error('Video element not found');
    }
    return video;
  }

  getWidth(): number {
    return this.video.videoWidth;
  }

  getHeight(): number {
    return this.video.videoHeight;
  }
}
