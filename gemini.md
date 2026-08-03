# GEMINI.md - LensClone Project Context & Coding Guidelines

## Project Overview
`LensClone` is a Proof-of-Concept (PoC) web application inspired by Google Lens. It runs real-time computer vision, text detection (DBNet), and text recognition (CRNN/OCR) directly inside the browser using **Angular 22** and **ONNX Runtime Web**.

---

## Technical Stack
- **Framework**: Angular 22 (`@angular/core`, `@angular/cli`)
- **Language**: TypeScript (`~6.0.2`)
- **ML / Vision Inference Engine**: `onnxruntime-web` (`^1.27.0`) running WebAssembly (WASM) models
- **Test Runner**: Vitest (`^4.0.8`) with `jsdom` via `ng test`
- **Code Formatter**: Prettier (`^3.8.1`)
- **Style System**: Vanilla CSS / Angular Component Scoped CSS

---

## Architecture & Codebase Structure

```text
src/
├── app/
│   ├── app.ts                  # Root standalone component
│   ├── app.config.ts           # Application config (providers, routing)
│   ├── app.routes.ts           # Application routes
│   ├── features/               # Feature components
│   │   ├── debug/              # Debugging & diagnostics views
│   │   ├── lens/               # Main camera feed & detection loop view
│   │   └── overlay/            # Canvas overlay for detected text boxes
│   └── services/               # Core services & vision pipeline
│       ├── camera.service.ts   # WebRTC camera access & video stream setup
│       ├── pipeline/           # Detection & recognition pipeline orchestration
│       ├── text-detection/     # ML preprocessing, text cropping, line grouping, recognition
│       └── visualization/      # Canvas rendering of text bounding boxes
public/                         # Static assets and ONNX model files
```

---

## Key Development Conventions & Best Practices

### 1. Angular Components & Templates
- **Standalone Components**: Always use standalone components (`standalone: true`).
- **Angular Signals**: Use Signals (`signal()`, `computed()`) for reactive component and service state instead of RxJS `BehaviorSubject` where possible.
- **Control Flow**: Use Angular's built-in control flow syntax (`@if`, `@else`, `@for`, `@switch`) instead of structural directives (`*ngIf`, `*ngFor`).
- **Explicit Imports**: Include only required components, directives, and pipes in component `imports`.

### 2. Machine Learning & Canvas Performance
- **ONNX WASM Asset Handling**: `angular.json` configures `onnxruntime-web` WASM assets to be served at `/assets/ort/`. Maintain this configuration for inference to function offline/locally.
- **Canvas Contexts**: When reading pixel data frequently via `getImageData()`, initialize 2D canvas contexts with `{ willReadFrequently: true }`.
- **AnimationFrame Safety**: Always maintain clean `requestAnimationFrame` loops in camera and vision services, ensuring proper cancellation and execution guards (`detectionInProgress` flags).

### 3. Code Formatting & TypeScript Rules
- **Strict Types**: Maintain strict TypeScript typing. Avoid `any` where explicit interfaces or types can be defined.
- **Prettier**: Code should adhere to formatting defined in `.prettierrc`.

---

## Command Reference

| Action | Command | Notes |
| :--- | :--- | :--- |
| **Start Dev Server** | `npm start` or `ng serve` | Runs local server at `http://localhost:4200/` |
| **Run Unit Tests** | `npm test` or `ng test` | Runs tests using Vitest |
| **Build Production** | `npm run build` or `ng build` | Compiles application output to `dist/` |
| **Watch Build** | `npm run watch` | Builds in watch mode with development config |
