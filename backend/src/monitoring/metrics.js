const promClient = require('prom-client');
const register = new promClient.Registry();

// Upload Metrics
const uploadAttempts = new promClient.Counter({
  name: 'caution_card_upload_attempts_total',
  help: 'Total number of caution card upload attempts',
  labelNames: ['status']
});

const uploadDuration = new promClient.Histogram({
  name: 'caution_card_upload_duration_seconds',
  help: 'Upload processing duration in seconds',
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

// OCR Metrics
const ocrAccuracy = new promClient.Gauge({
  name: 'caution_card_ocr_accuracy_score',
  help: 'OCR confidence score for processed documents',
  labelNames: ['file_type']
});

const ocrProcessingTime = new promClient.Histogram({
  name: 'caution_card_ocr_processing_seconds',
  help: 'OCR processing time in seconds',
  buckets: [1, 2, 5, 10, 20, 30]
});

// Resource Metrics
const diskUsage = new promClient.Gauge({
  name: 'caution_card_disk_usage_bytes',
  help: 'Current disk usage for uploads directory in bytes'
});

const memoryUsage = new promClient.Gauge({
  name: 'caution_card_memory_usage_bytes',
  help: 'Current memory usage during processing'
});

const redisConnections = new promClient.Gauge({
  name: 'caution_card_redis_connections',
  help: 'Current number of Redis connections'
});

// Error Metrics
const errorRate = new promClient.Counter({
  name: 'caution_card_errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'code']
});

// WebSocket Metrics
const wsConnections = new promClient.Gauge({
  name: 'caution_card_websocket_connections',
  help: 'Current number of WebSocket connections'
});

// Register all metrics
[
  uploadAttempts,
  uploadDuration,
  ocrAccuracy,
  ocrProcessingTime,
  diskUsage,
  memoryUsage,
  redisConnections,
  errorRate,
  wsConnections
].forEach(metric => register.registerMetric(metric));

module.exports = {
  register,
  metrics: {
    uploadAttempts,
    uploadDuration,
    ocrAccuracy,
    ocrProcessingTime,
    diskUsage,
    memoryUsage,
    redisConnections,
    errorRate,
    wsConnections
  }
};