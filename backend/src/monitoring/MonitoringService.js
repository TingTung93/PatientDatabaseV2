const os = require('os');
const fs = require('fs');
const path = require('path');
const { metrics } = require('./metrics');
const errorHandler = require('../utils/ErrorHandler');

class MonitoringService {
  constructor(config = {}) {
    this.config = {
      uploadDir: process.env.UPLOAD_DIR || 'uploads',
      metricsInterval: 15000, // 15 seconds
      alertThresholds: {
        errorRate: 0.1, // 10% error rate threshold
        diskUsagePercent: 85, // 85% disk usage warning
        memoryUsagePercent: 80, // 80% memory warning
        uploadDurationThreshold: 10, // 10 seconds
        ocrAccuracyThreshold: 0.8, // 80% minimum accuracy
      },
      ...config
    };

    this.setupMetricsCollection();
    this.setupErrorHandling();
  }

  setupMetricsCollection() {
    // Set up periodic metrics collection
    this.metricsInterval = setInterval(() => {
      this.collectResourceMetrics();
    }, this.config.metricsInterval);

    // Collect initial metrics
    this.collectResourceMetrics();
  }

  setupErrorHandling() {
    // Subscribe to error handler events
    errorHandler.subscribe((errorInfo) => {
      metrics.errorRate.inc({
        type: errorInfo.context || 'unknown',
        code: errorInfo.code || 'unknown'
      });
      this.checkErrorRateThreshold();
    });
  }

  async collectResourceMetrics() {
    // Disk usage
    try {
      const stats = await fs.promises.statfs(this.config.uploadDir);
      const usedBytes = (stats.blocks - stats.bfree) * stats.bsize;
      metrics.diskUsage.set(usedBytes);
      
      const usagePercent = (usedBytes / (stats.blocks * stats.bsize)) * 100;
      if (usagePercent > this.config.alertThresholds.diskUsagePercent) {
        this.triggerAlert('disk_usage', `Disk usage at ${usagePercent.toFixed(2)}%`);
      }
    } catch (error) {
      errorHandler.logWarning('Failed to collect disk metrics', { error: error.message });
    }

    // Memory usage
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    metrics.memoryUsage.set(usedMem);

    const memoryPercent = (usedMem / totalMem) * 100;
    if (memoryPercent > this.config.alertThresholds.memoryUsagePercent) {
      this.triggerAlert('memory_usage', `Memory usage at ${memoryPercent.toFixed(2)}%`);
    }
  }

  trackUpload(duration, success) {
    metrics.uploadAttempts.inc({ status: success ? 'success' : 'failure' });
    metrics.uploadDuration.observe(duration);

    if (duration > this.config.alertThresholds.uploadDurationThreshold) {
      this.triggerAlert('upload_duration', `Upload took ${duration.toFixed(2)} seconds`);
    }
  }

  trackOCRProcess(accuracy, duration, fileType) {
    metrics.ocrAccuracy.set({ file_type: fileType }, accuracy);
    metrics.ocrProcessingTime.observe(duration);

    if (accuracy < this.config.alertThresholds.ocrAccuracyThreshold) {
      this.triggerAlert('ocr_accuracy', `Low OCR accuracy (${(accuracy * 100).toFixed(2)}%) for ${fileType}`);
    }
  }

  checkErrorRateThreshold() {
    const total = metrics.uploadAttempts.get().values.reduce((acc, val) => acc + val, 0);
    const failures = metrics.uploadAttempts.get().values.find(v => v.labels.status === 'failure') || 0;
    
    if (total > 0) {
      const errorRate = failures / total;
      if (errorRate > this.config.alertThresholds.errorRate) {
        this.triggerAlert('error_rate', `High error rate: ${(errorRate * 100).toFixed(2)}%`);
      }
    }
  }

  triggerAlert(type, message) {
    const alertInfo = {
      type,
      message,
      timestamp: new Date().toISOString(),
      severity: this.getAlertSeverity(type)
    };

    // Log alert
    errorHandler.logWarning(`Alert: ${message}`, alertInfo);

    // Notify subscribers
    if (this.config.alertCallback) {
      this.config.alertCallback(alertInfo);
    }
  }

  getAlertSeverity(type) {
    const severityMap = {
      error_rate: 'critical',
      disk_usage: 'warning',
      memory_usage: 'warning',
      upload_duration: 'warning',
      ocr_accuracy: 'warning'
    };
    return severityMap[type] || 'info';
  }

  cleanup() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
  }
}

module.exports = MonitoringService;