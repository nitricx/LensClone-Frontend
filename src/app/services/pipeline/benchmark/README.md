# Pipeline Benchmark Module

The **Pipeline Benchmark Module** provides dataset evaluation and hyperparameter matrix optimization tools for evaluating the `LensClone` vision pipeline (DBNet text detector & CRNN text recognizer) against ground truth test fixtures.

## Key Components & Interfaces

- **`DatasetEvaluatorService`** ([dataset-evaluator.service.ts](file:///d:/Repositories/PoC-LensClone/src/app/services/pipeline/benchmark/dataset-evaluator.service.ts)):
  Calculates BoundingBox IoU, Precision, Recall, F1 Score, Character Error Rate (CER), Word Error Rate (WER), and edit distances.
- **`MatrixEvaluatorService`** ([matrix-evaluator.service.ts](file:///d:/Repositories/PoC-LensClone/src/app/services/pipeline/benchmark/matrix-evaluator.service.ts)):
  Generates Cartesian products for candidate parameter vectors (cropper paddings, DBNet maxSides, dictionary similarity thresholds) and computes weighted quality scores to rank configurations.
- **`DatasetBenchmarkRunnerService`** ([dataset-benchmark-runner.service.ts](file:///d:/Repositories/PoC-LensClone/src/app/services/pipeline/benchmark/dataset-benchmark-runner.service.ts)):
  Fetches dataset manifests (e.g. `/assets/test-fixtures/grocery/manifest.json`), loads static fixture images (`billboard_001.png` - `006.png`), extracts canvas `ImageData`, and runs model inference via `PipelineService`.

## Running Local Benchmarks

### 1. In the Debug UI (Browser)
When running `npm start` (`ng serve`), navigate to `http://localhost:4200/debug` and select the **Benchmark & Matrix** tab to:
- Run the Grocery benchmark suite against real `.png` static image fixtures.
- Run hyperparameter matrix permutations to find optimal pipeline settings.

### 2. Via Command Line
To run local benchmark unit specs:
```bash
npm run test:benchmark
```

CI unit tests (`npm test`) run isolated mock-based unit tests for fast automated validation.
