import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { DatasetEvaluatorService } from './dataset-evaluator.service';
import { MatrixEvaluatorService } from './matrix-evaluator.service';
import { DatasetBenchmarkRunnerService } from './dataset-benchmark-runner.service';

/**
 * Local Benchmark Suite.
 * Can be run manually locally when DOM image/canvas environment is present.
 */
describe('Grocery Local Benchmark Suite [Local Only]', () => {
  let runner: DatasetBenchmarkRunnerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DatasetEvaluatorService,
        MatrixEvaluatorService,
        DatasetBenchmarkRunnerService,
      ],
    });
    runner = TestBed.inject(DatasetBenchmarkRunnerService);
  });

  it('should verify dataset benchmark runner service is injectable', () => {
    expect(runner).toBeTruthy();
  });
});
