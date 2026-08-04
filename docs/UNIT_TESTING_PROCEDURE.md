# LensClone Unit Testing Procedure & Execution Guide

This document defines the standardized unit testing strategy, conventions, and step-by-step procedure for **LensClone**. 
AI agents working on this project MUST follow this guide to implement unit tests incrementally without breaking existing functionality or incurring unnecessary complexity.

---

## 1. Context & Environment Specifications

- **Framework**: Angular 22 (Standalone Components & Signals)
- **Test Runner**: Vitest (`^4.0.8`) integrated with Angular CLI (`@angular/build:vitest`) and `jsdom`
- **Execution Command**:
  ```bash
  npm test -- --watch=false
  ```
  *(Or to run a specific spec file: `npx ng test --include="**/dictionary-matcher.service.spec.ts" --watch=false`)*

> [!IMPORTANT]
> **Command Rule for Agents**: Always run unit tests using `npm test -- --watch=false` or `ng test`. **Do NOT** execute bare `npx vitest run` directly, as Angular's test environment setup (`TestBed.initTestEnvironment()`) is injected by the Angular CLI runner.

---

## 2. Testing Architecture & Prioritized Tiers

To allow AI agents to work in small, independent, risk-free increments, the codebase is divided into **5 Unit Testing Tiers**, ordered from highest ease and lowest dependency risk to component-level integration.

```
┌─────────────────────────────────────────────────────────────┐
│ Tier 1: Pure Math & Domain Logic Services                    │
│ (WeightedLevenshtein, DetectorFilter, LineGrouping)         │
├─────────────────────────────────────────────────────────────┤
│ Tier 2: Postprocessing & State Transformer Services         │
│ (DictionaryMatcher, DetectorPostprocessor, RecognitionPost) │
├─────────────────────────────────────────────────────────────┤
│ Tier 3: Canvas, Preprocessor & Image Services              │
│ (Cropper, DetectorPreproc, RecognitionPreproc, BoundingBox) │
├─────────────────────────────────────────────────────────────┤
│ Tier 4: ML Inference & Pipeline Orchestration Services      │
│ (DetectorService, RecognitionService, PipelineService)      │
├─────────────────────────────────────────────────────────────┤
│ Tier 5: Angular Standalone Components & UI Signals         │
│ (OverlayComponent, DebugComponent, LensComponent, App)      │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Step-by-Step Agent Workflow (Micro-Task Protocol)

When assigned a task to implement or expand unit tests, an AI agent must complete the work in the following strict order:

### Step 1: Select Target File & Verify Existing Tests
- Identify the single service or component target (e.g., `line-grouping.service.ts`).
- Check if a co-located `[target-name].spec.ts` already exists in the same folder.

### Step 2: Draft Test Requirements & Edge Cases
For any unit under test, write test cases covering:
1. **Happy path / Standard execution**
2. **Empty inputs / Edge boundary conditions** (empty array, null/undefined optional properties, zero-dimension bounding boxes)
3. **Out-of-bounds / Error cases** (malformed text, invalid similarity thresholds, unexpected shapes)

### Step 3: Implement Specs using Angular `TestBed` & `Vitest`
- Import test utilities directly from `'vitest'` (`describe`, `it`, `expect`, `beforeEach`, `vi`).
- Use Angular's `TestBed.configureTestingModule` to inject services cleanly.
- Keep tests isolated, synchronous where possible, and avoid external I/O.

### Step 4: Run Verification & Check Exit Code
Execute:
```bash
npm test -- --watch=false
```
Ensure 100% of tests pass without any warnings or residual mocks leaking between tests.

---

## 4. Canonical Test Templates by Tier

### Tier 1: Pure Logic & Math Services Template
*Target Example: `src/app/services/text-detection/dictionary/weighted-levenshtein.service.ts`*

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { WeightedLevenshteinService } from './weighted-levenshtein.service';

describe('WeightedLevenshteinService', () => {
  let service: WeightedLevenshteinService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WeightedLevenshteinService],
    });
    service = TestBed.inject(WeightedLevenshteinService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return 1.0 for identical strings', () => {
    expect(service.similarity('LECHUGA', 'LECHUGA')).toBe(1.0);
  });

  it('should apply cheap substitutions for common OCR misreadings (e.g. O -> 0)', () => {
    const similarity = service.similarity('CEB0LLA', 'CEBOLLA');
    // Distance should be 0.25 instead of 1.0
    expect(similarity).toBeGreaterThan(0.9);
  });
});
```

---

### Tier 2: Postprocessor & State Mutation Template
*Target Example: `src/app/services/text-detection/detector/detector-filter.service.ts`*

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DetectorFilterService } from './detector-filter.service';
import { PipelineState } from '../../pipeline/pipeline-state';

describe('DetectorFilterService', () => {
  let service: DetectorFilterService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DetectorFilterService],
    });
    service = TestBed.inject(DetectorFilterService);
  });

  it('should filter out detections with aspect ratio < 1.2', () => {
    const state: PipelineState = {
      detections: [
        {
          boundingBoxScore: 0.9,
          boundingBox: { x: 0, y: 0, width: 10, height: 10 }, // ratio = 1.0 (invalid)
        },
        {
          boundingBoxScore: 0.9,
          boundingBox: { x: 0, y: 0, width: 20, height: 10 }, // ratio = 2.0 (valid)
        },
      ],
      processingTimeMs: 0,
    };

    service.execute(state);

    expect(state.detections.length).toBe(1);
    expect(state.detections[0].boundingBox.width).toBe(20);
  });
});
```

---

### Tier 3: Canvas 2D & Image Preprocessor Template
*Target Example: Services handling `ImageData` or Canvas elements.*

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DetectorCropperService } from './cropper.service';

describe('DetectorCropperService', () => {
  let service: DetectorCropperService;

  // Helper to construct mock ImageData in jsdom environment
  function createMockImageData(width: number, height: number): ImageData {
    const data = new Uint8ClampedArray(width * height * 4);
    return new ImageData(data, width, height);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DetectorCropperService],
    });
    service = TestBed.inject(DetectorCropperService);
  });

  it('should crop bounding box region from full image', () => {
    const mockImage = createMockImageData(100, 100);
    const state = {
      fullImage: mockImage,
      detections: [
        {
          boundingBoxScore: 0.85,
          boundingBox: { x: 10, y: 10, width: 20, height: 20 },
        },
      ],
      processingTimeMs: 0,
    };

    // Mock HTMLCanvasElement.getContext if needed for jsdom
    const mockContext = {
      drawImage: vi.fn(),
      getImageData: vi.fn().mockReturnValue(createMockImageData(20, 20)),
    };
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: vi.fn().mockReturnValue(mockContext),
        } as unknown as HTMLCanvasElement;
      }
      return document.createElement(tagName);
    });

    service.execute(state);
    expect(state.detections[0].croppedImage).toBeDefined();
  });
});
```

---

### Tier 4: ML Model Wrapper (`onnxruntime-web`) Template
*Target Example: `src/app/services/text-detection/detector/detector.service.ts`*

> [!CAUTION]
> **Never load real ONNX binary model files during unit tests.** Mock the `onnxruntime-web` module (`ort.InferenceSession.create`).

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DetectorService } from './detector.service';
import * as ort from 'onnxruntime-web';

vi.mock('onnxruntime-web', () => ({
  InferenceSession: {
    create: vi.fn(),
  },
  Tensor: vi.fn().mockImplementation(function (type: any, data: any, dims: any) {
    return { type, data, dims };
  }),
}));

describe('DetectorService', () => {
  let service: DetectorService;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [DetectorService],
    });
    service = TestBed.inject(DetectorService);
  });

  it('should initialize ONNX session with WASM path', async () => {
    const mockSession = { run: vi.fn() };
    (ort.InferenceSession.create as any).mockResolvedValue(mockSession);

    await service.initialize();

    expect(ort.InferenceSession.create).toHaveBeenCalledWith(
      '/assets/models/dbnet.onnx',
      expect.objectContaining({ executionProviders: ['webgpu', 'wasm'] })
    );
  });
});
```

---

### Tier 5: Angular Standalone Component + Signals Template
*Target Example: `src/app/features/debug/debug.component.ts`*

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DebugComponent } from './debug.component';

describe('DebugComponent', () => {
  let component: DebugComponent;
  let fixture: ComponentFixture<DebugComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DebugComponent], // Standalone component imported here
    }).compileComponents();

    fixture = TestBed.createComponent(DebugComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // Trigger initial signal evaluation & change detection
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });
});
```

---

## 5. Summary Checklist for AI Agents

Before submitting or completing a unit test task, verify:
- [ ] Spec file is co-located with target file (e.g. `foo.service.spec.ts` next to `foo.service.ts`).
- [ ] Imports `describe, it, expect, beforeEach` from `'vitest'`.
- [ ] Uses `TestBed.configureTestingModule` for injection.
- [ ] Mocked external side-effects (Canvas 2D context, ONNX Runtime Web sessions, WebRTC MediaStreams).
- [ ] Verified locally by running `npm test -- --watch=false`.
- [ ] Zero lint/type errors in the new `.spec.ts` file.
