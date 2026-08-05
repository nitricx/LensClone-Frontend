const { Worker } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(PROJECT_ROOT, 'public/assets/test-fixtures/grocery/manifest.json');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'dist/benchmark-reports');

// --- Parameter Matrix Grid ---
const PARAMETER_MATRIX = {
  detectorThresholds: [0.2, 0.25, 0.3, 0.35, 0.4, 0.5],
  detectorMinAreas: [5, 10, 15, 25],
  detectorMinAspectRatios: [1.0, 1.2, 1.4, 1.6],
  detectorMaxSides: [0, 384, 480, 640],
  detectorScaleFactors: [0.5, 0.65, 0.75, 1.0],
  cropperPaddings: [0, 2, 4, 6, 8],
  dictionarySimilarityThresholds: [0.65, 0.7, 0.75, 0.8, 0.85],
  lineGroupingMaxScores: [0.8, 1.0, 1.2, 1.5],
  lineGroupingVerticalWeights: [0.3, 0.5, 0.7, 0.9],
};

const BASE_CONFIG = {
  detector: { thresholdValue: 0.3, minArea: 10, minAspectRatio: 1.2, maxSide: 0, scaleFactor: 0.5 },
  cropper: { padding: 4, paddingMode: 'fixed' },
  recognizer: { targetHeight: 48 },
  lineGrouping: { maxScore: 1.0, weights: { vertical: 0.6, height: 0.25, horizontal: 0.1, confidence: 0.05 }, limits: { maxVertical: 1.0, maxHeightRatio: 2.0 } },
  dictionary: { similarityThreshold: 0.75, priceMin: 1000, priceMax: 9999 },
  tracking: { enabled: true, iouThreshold: 0.3, maxMisses: 3, smoothingFactor: 0.6, refreshIntervalFrames: 30 },
};

/**
 * Generates Cartesian product permutations of parameter matrix.
 */
function* generatePermutations(matrix) {
  const dt = matrix.detectorThresholds || [BASE_CONFIG.detector.thresholdValue];
  const ma = matrix.detectorMinAreas || [BASE_CONFIG.detector.minArea];
  const ar = matrix.detectorMinAspectRatios || [BASE_CONFIG.detector.minAspectRatio];
  const ms = matrix.detectorMaxSides || [BASE_CONFIG.detector.maxSide];
  const sf = matrix.detectorScaleFactors || [BASE_CONFIG.detector.scaleFactor];
  const cp = matrix.cropperPaddings || [BASE_CONFIG.cropper.padding];
  const ds = matrix.dictionarySimilarityThresholds || [BASE_CONFIG.dictionary.similarityThreshold];
  const lgm = matrix.lineGroupingMaxScores || [BASE_CONFIG.lineGrouping.maxScore];
  const lgv = matrix.lineGroupingVerticalWeights || [BASE_CONFIG.lineGrouping.weights.vertical];

  for (const thresholdValue of dt) {
    for (const minArea of ma) {
      for (const minAspectRatio of ar) {
        for (const maxSide of ms) {
          for (const scaleFactor of sf) {
            for (const padding of cp) {
              for (const similarityThreshold of ds) {
                for (const maxScore of lgm) {
                  for (const verticalWeight of lgv) {
                    yield {
                      ...BASE_CONFIG,
                      detector: { ...BASE_CONFIG.detector, thresholdValue, minArea, minAspectRatio, maxSide, scaleFactor },
                      cropper: { ...BASE_CONFIG.cropper, padding },
                      dictionary: { ...BASE_CONFIG.dictionary, similarityThreshold },
                      lineGrouping: { ...BASE_CONFIG.lineGrouping, maxScore, weights: { ...BASE_CONFIG.lineGrouping.weights, vertical: verticalWeight } },
                    };
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

/**
 * Renders dynamic CLI progress bar in stdout.
 */
function renderProgressBar(current, total, startTime, bestScore, threadCount) {
  const percent = Math.min(100, Math.floor((current / total) * 100));
  const barLength = 30;
  const filledLength = Math.floor((barLength * percent) / 100);
  const bar = '█'.repeat(filledLength) + '-'.repeat(barLength - filledLength);
  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
  const memoryMb = (process.memoryUsage().heapUsed / (1024 * 1024)).toFixed(1);

  process.stdout.write(
    `\r[${bar}] ${percent}% | ${current.toLocaleString()}/${total.toLocaleString()} configs | ${threadCount} Workers | Best: ${bestScore.toFixed(4)} | Time: ${elapsedSec}s | Heap: ${memoryMb}MB   `,
  );
}

async function runParallelBenchmark() {
  const numCores = os.cpus().length;
  console.log(`\n===============================================================`);
  console.log(`  LensClone Multi-Threaded Node.js Parallel Benchmark Suite`);
  console.log(`===============================================================`);
  console.log(`Detected CPU Threads  : ${numCores} Logical Cores (${os.cpus()[0].model})`);
  console.log(`Manifest File Path    : ${MANIFEST_PATH}`);

  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error(`ERROR: Manifest file not found at ${MANIFEST_PATH}`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  console.log(`Dataset Name          : ${manifest.datasetName}`);
  console.log(`Fixture Sample Count  : ${manifest.samples.length} images`);

  // Collect permutations
  console.log(`\nGenerating parameter permutations...`);
  const allConfigs = Array.from(generatePermutations(PARAMETER_MATRIX));
  const totalConfigs = allConfigs.length;
  console.log(`Total Matrix Size     : ${totalConfigs.toLocaleString()} parameter combinations`);
  console.log(`Total Model Operations: ${(totalConfigs * manifest.samples.length).toLocaleString()} image inferences`);

  // Partition configs into equal chunks for worker threads
  const chunkSize = Math.ceil(totalConfigs / numCores);
  const workerChunks = [];
  for (let i = 0; i < numCores; i++) {
    const chunk = allConfigs.slice(i * chunkSize, (i + 1) * chunkSize);
    if (chunk.length > 0) {
      workerChunks.push(chunk);
    }
  }

  const activeWorkersCount = workerChunks.length;
  console.log(`\nLaunching ${activeWorkersCount} Parallel Worker Threads across ${numCores} CPU Cores...`);

  const startTime = Date.now();
  let totalEvaluated = 0;
  let overallBestScore = 0;
  const aggregatedResults = [];

  const workerPromises = workerChunks.map((chunk, workerIdx) => {
    return new Promise((resolve, reject) => {
      const worker = new Worker(path.join(__dirname, 'benchmark-worker.js'), {
        workerData: {
          workerId: workerIdx + 1,
          configChunk: chunk,
          samples: manifest.samples,
          projectRoot: PROJECT_ROOT,
        },
      });

      worker.on('message', (msg) => {
        if (msg.type === 'PROGRESS') {
          totalEvaluated += msg.evaluatedDelta;
          if (msg.currentBestScore > overallBestScore) {
            overallBestScore = msg.currentBestScore;
          }
          renderProgressBar(totalEvaluated, totalConfigs, startTime, overallBestScore, activeWorkersCount);
        } else if (msg.type === 'COMPLETE') {
          aggregatedResults.push(...msg.topKResults);
          resolve();
        } else if (msg.type === 'ERROR') {
          reject(new Error(`Worker ${workerIdx + 1} Error: ${msg.error}`));
        }
      });

      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0) reject(new Error(`Worker ${workerIdx + 1} stopped with exit code ${code}`));
      });
    });
  });

  await Promise.all(workerPromises);

  const totalDurationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  renderProgressBar(totalConfigs, totalConfigs, startTime, overallBestScore, activeWorkersCount);
  console.log('\n');

  // Rank overall Top-K results
  aggregatedResults.sort((a, b) => b.overallScore - a.overallScore);
  const topKFinal = aggregatedResults.slice(0, 20);
  const bestResult = topKFinal[0];

  console.log(`===============================================================`);
  console.log(`  BENCHMARK COMPLETE IN ${totalDurationSec} SECONDS`);
  console.log(`===============================================================`);
  console.log(`Tested Configurations : ${totalConfigs.toLocaleString()}`);
  console.log(`Throughput            : ${((totalConfigs * manifest.samples.length) / totalDurationSec).toFixed(1)} inferences / sec`);
  console.log(`Best Overall Score    : ${bestResult.overallScore.toFixed(4)}`);
  console.log(`\nBest Configuration Hyperparameters:`);
  console.log(` - DBNet Threshold   : ${bestResult.config.detector.thresholdValue}`);
  console.log(` - Min Area           : ${bestResult.config.detector.minArea} px`);
  console.log(` - Min Aspect Ratio   : ${bestResult.config.detector.minAspectRatio}`);
  console.log(` - Max Side Length    : ${bestResult.config.detector.maxSide || 'Original'}`);
  console.log(` - Scale Factor       : ${bestResult.config.detector.scaleFactor}`);
  console.log(` - Cropper Padding    : ${bestResult.config.cropper.padding} px`);
  console.log(` - Dict Similarity    : ${bestResult.config.dictionary.similarityThreshold}`);
  console.log(` - Line Max Score     : ${bestResult.config.lineGrouping.maxScore}`);
  console.log(` - Line Vert Weight   : ${bestResult.config.lineGrouping.weights.vertical}`);

  // Create output directory if needed
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonReportPath = path.join(OUTPUT_DIR, `matrix-report-${timestamp}.json`);
  const mdReportPath = path.join(OUTPUT_DIR, `matrix-report-${timestamp}.md`);

  const fullReport = {
    timestamp: new Date().toISOString(),
    cpuThreadsUsed: activeWorkersCount,
    durationSeconds: parseFloat(totalDurationSec),
    totalCombinationsTested: totalConfigs,
    throughputInferencesPerSec: parseFloat(((totalConfigs * manifest.samples.length) / totalDurationSec).toFixed(1)),
    bestConfig: bestResult.config,
    bestScore: bestResult.overallScore,
    topResults: topKFinal,
  };

  fs.writeFileSync(jsonReportPath, JSON.stringify(fullReport, null, 2));

  // Generate Markdown summary table
  let mdContent = `# Parallel Matrix Benchmark Report\n\n`;
  mdContent += `- **Timestamp**: ${fullReport.timestamp}\n`;
  mdContent += `- **CPU Workers**: ${activeWorkersCount} Threads\n`;
  mdContent += `- **Total Duration**: ${totalDurationSec}s\n`;
  mdContent += `- **Combinations Tested**: ${totalConfigs.toLocaleString()}\n`;
  mdContent += `- **Throughput**: ${fullReport.throughputInferencesPerSec} inf/s\n\n`;
  mdContent += `## Top 5 Winning Hyperparameter Configurations\n\n`;
  mdContent += `| Rank | Score | DBNet Thresh | Max Side | Padding | Dict Sim | Line Vert Wt |\n`;
  mdContent += `| :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n`;

  topKFinal.slice(0, 5).forEach((item, idx) => {
    mdContent += `| #${idx + 1} | **${item.overallScore.toFixed(4)}** | ${item.config.detector.thresholdValue} | ${item.config.detector.maxSide || 'orig'} | ${item.config.cropper.padding}px | ${item.config.dictionary.similarityThreshold} | ${item.config.lineGrouping.weights.vertical} |\n`;
  });

  fs.writeFileSync(mdReportPath, mdContent);

  console.log(`\nReports Saved Successfully:`);
  console.log(` - JSON Report: ${jsonReportPath}`);
  console.log(` - MD Report  : ${mdReportPath}\n`);
}

runParallelBenchmark().catch((err) => {
  console.error(`\nParallel Benchmark Failed:`, err);
  process.exit(1);
});
