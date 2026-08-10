# Frontend Code Style & AI Agent Guidelines

This document specifies the technical standards, architectural patterns, coding styles, and verification requirements for developers and AI agents working on the **LensClone Frontend** repository (`PoC-LensClone`).

---

## 🎯 Tech Stack Overview

- **Framework**: Angular 22 (`@angular/core`, `@angular/cli`)
- **Language**: TypeScript 6.0 (`strict: true`)
- **Computer Vision & ML**: `onnxruntime-web` WASM (DBNet text detection + CRNN text recognition)
- **Map & Spatial**: Leaflet (`leaflet`, `@types/leaflet`)
- **Test Runner & Formatter**: Vitest (`jsdom` environment), Prettier (`.prettierrc`)
- **Styling**: Vanilla CSS / Angular Component Scoped CSS

---

## 🏛️ Architecture & Component Conventions

### 1. Standalone Components & Modern Control Flow
- **Standalone Components**: Every component MUST be standalone (`standalone: true`). Do NOT use `NgModule`.
- **Angular Signals**: Use Signals (`signal()`, `computed()`) for component and service state instead of RxJS `BehaviorSubject` where possible.
- **Native Control Flow**: Use Angular 17+ control flow syntax exclusively:
  - `@if (condition) { ... } @else { ... }`
  - `@for (item of items; track item.id) { ... }`
  - `@switch (value) { @case ('a') { ... } }`
  - Do NOT use structural directives like `*ngIf` or `*ngFor`.
- **Explicit Imports**: Only import required Angular modules, directives, components, and pipes in component `imports: [...]`.

### 2. Machine Learning & Canvas Performance
- **ONNX WASM Asset Paths**: Maintain `/assets/ort/` WASM asset serving as configured in `angular.json`.
- **Canvas Context Optimization**: When reading pixel data frequently via `getImageData()`, always initialize 2D canvas contexts with `{ willReadFrequently: true }`.
- **AnimationFrame Loop Guards**: Ensure animation frame loops in vision/camera services maintain clean cancellation logic (`cancelAnimationFrame`) and execution flags (`detectionInProgress`).

### 3. Modular Co-located Documentation
- **Module README Files**: Maintain co-located `README.md` files inside feature folders (`src/app/features/*/README.md`) and service modules (`src/app/services/*/README.md`).
- **Context Retrieval**: Use module `README.md` files for quick architectural reference, signal state definitions, and public API contracts before modifying code.

---

## 📝 TypeScript & Formatting Rules

- **Strict Types**: Maintain strict TypeScript typing (`strict: true` in `tsconfig.json`). Avoid `any`; use explicit interfaces, type aliases, or generic parameters.
- **Explicit Error Handling**: Throw explicit errors with descriptive messages for out-of-bounds parameters or invalid configurations rather than silently swallowing exceptions or returning dummy fallback data.
- **Prettier Standard**: Code formatting must adhere to `.prettierrc`:
  - 2 spaces indent
  - Single quotes for strings
  - Trailing commas where applicable
  - Semi-colons enabled

---

## 🎨 CSS & UI Design Aesthetics

- **Modern Aesthetics**: Use modern visual styling principles (curated color palettes, dark mode support, glassmorphism, responsive dynamic layouts).
- **Typography**: Prefer modern web fonts (e.g., Google Fonts like Inter/Roboto) over plain browser defaults.
- **Interactive States**: Provide smooth transitions, micro-animations, and hover states for interactive UI controls.
- **Accessibility (a11y)**: Include explicit `aria-label` attributes on icon buttons, interactive elements, and canvas overlays. Ensure proper contrast ratio and keyboard focus indicators.

---

## 🛠️ Verification & Command Reference

Before declaring any task completed, agents MUST run verification:

| Task | Command | Notes |
| :--- | :--- | :--- |
| **Run Unit Tests** | `ng test` or `npm test` | Runs Vitest in jsdom environment |
| **Production Build** | `ng build` or `npm run build` | Validates TypeScript compilation & template diagnostics |
| **Dev Server** | `ng serve` or `npm start` | Runs dev server at `http://localhost:4200/` |
