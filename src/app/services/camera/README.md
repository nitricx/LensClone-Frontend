# Camera Service

The `CameraService` handles WebRTC media stream initialization, device video stream playback control, and camera hardware hardware features like flashlight (torch) controls.

## Primary Files
- [camera.service.ts](file:///d:/Repositories/PoC-LensClone/src/app/services/camera/camera.service.ts) - Service for managing HTML5 `<video>` media streams and camera hardware capabilities.

## Key Methods
- `start(video: HTMLVideoElement)`: Requests environment camera media stream (`facingMode: 'environment'`) via `navigator.mediaDevices.getUserMedia` with Full HD resolution defaults (`width: { ideal: 1920 }`, `height: { ideal: 1080 }`), enables continuous autofocus (`focusMode: 'continuous'`), and attaches the stream to the `<video>` element.
- `stop(video?: HTMLVideoElement)`: Stops active media stream tracks and detaches srcObject.
- `hasTorch(video?: HTMLVideoElement)`: Checks if the active video track supports flashlight / torch capabilities.
- `toggleTorch(video: HTMLVideoElement, enable: boolean)`: Applies constraints to turn the hardware flashlight on/off.
- `pause(video: HTMLVideoElement)` / `resume(video: HTMLVideoElement)`: Controls stream playback state.

## Usage Context
Consumed primarily by the Lens feature component (`LensComponent`) to feed real-time frames into the vision pipeline canvas.
