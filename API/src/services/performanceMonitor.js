const os = require('os');
const { performance } = require('perf_hooks');

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        perSecond: 0,
        averageResponseTime: 0,
        responseTimeHistory: []
      },
      system: {
        cpuUsage: 0,
        memoryUsage: 0,
        freeMemory: 0,
        loadAverage: [],
        uptime: 0
      },
      connections: {
        active: 0,
        total: 0
      },
      errors: {
        total: 0,
        perMinute: 0,
        byType: {}
      }
    };

    this.startTime = performance.now();
    this.requestHistory = [];
    this.errorHistory = [];
    this.isMonitoring = false;

    this.startMonitoring();
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;

    // Update system metrics every 5 seconds
    this.systemMetricsInterval = setInterval(() => {
      this.updateSystemMetrics();
    }, 5000);

    // Update request metrics every second
    this.requestMetricsInterval = setInterval(() => {
      this.updateRequestMetrics();
    }, 1000);

    // Clean up old data every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);

  }

  stopMonitoring() {
    if (!this.isMonitoring) return;
    this.isMonitoring = false;

    clearInterval(this.systemMetricsInterval);
    clearInterval(this.requestMetricsInterval);
    clearInterval(this.cleanupInterval);

  }

  updateSystemMetrics() {
    const memUsage = process.memoryUsage();

    this.metrics.system = {
      cpuUsage: this.getCPUUsage(),
      memoryUsage: (memUsage.heapUsed / 1024 / 1024).toFixed(2), // MB
      freeMemory: (os.freemem() / 1024 / 1024).toFixed(2), // MB
      totalMemory: (os.totalmem() / 1024 / 1024).toFixed(2), // MB
      loadAverage: os.loadavg().map(load => load.toFixed(2)),
      uptime: Math.floor(process.uptime())
    };
  }

  updateRequestMetrics() {
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    const oneMinuteAgo = now - 60000;

    // Calculate requests per second
    const recentRequests = this.requestHistory.filter(req => req.timestamp > oneSecondAgo);
    this.metrics.requests.perSecond = recentRequests.length;

    // Calculate average response time
    if (this.requestHistory.length > 0) {
      const recentRequestsWithTime = this.requestHistory
        .filter(req => req.timestamp > oneMinuteAgo && req.responseTime)
        .slice(-100); // Last 100 requests

      if (recentRequestsWithTime.length > 0) {
        const avgResponseTime = recentRequestsWithTime
          .reduce((sum, req) => sum + req.responseTime, 0) / recentRequestsWithTime.length;
        this.metrics.requests.averageResponseTime = avgResponseTime.toFixed(2);
      }
    }

    // Calculate errors per minute
    const recentErrors = this.errorHistory.filter(err => err.timestamp > oneMinuteAgo);
    this.metrics.errors.perMinute = recentErrors.length;
  }

  getCPUUsage() {
    const startUsage = process.cpuUsage();
    setTimeout(() => {
      const endUsage = process.cpuUsage(startUsage);
      const userPercent = (endUsage.user / 1000000) * 100; // Convert to percentage
      const systemPercent = (endUsage.system / 1000000) * 100;
      this.metrics.system.cpuUsage = (userPercent + systemPercent).toFixed(2);
    }, 100);

    return this.metrics.system.cpuUsage;
  }

  recordRequest(method, url, responseTime, statusCode) {
    const timestamp = Date.now();

    this.metrics.requests.total++;
    this.requestHistory.push({
      timestamp,
      method,
      url,
      responseTime,
      statusCode
    });

    // Keep response time history for trending
    this.metrics.requests.responseTimeHistory.push(responseTime);
    if (this.metrics.requests.responseTimeHistory.length > 1000) {
      this.metrics.requests.responseTimeHistory.shift();
    }
  }

  recordError(error, context = {}) {
    const timestamp = Date.now();

    this.metrics.errors.total++;
    this.errorHistory.push({
      timestamp,
      error: error.message || error,
      stack: error.stack,
      context
    });

    // Track error types
    const errorType = error.name || 'Unknown';
    this.metrics.errors.byType[errorType] = (this.metrics.errors.byType[errorType] || 0) + 1;
  }

  updateConnections(active, total) {
    this.metrics.connections.active = active;
    this.metrics.connections.total = total;
  }

  cleanup() {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

    // Clean up old request history
    this.requestHistory = this.requestHistory.filter(req => req.timestamp > fiveMinutesAgo);

    // Clean up old error history
    this.errorHistory = this.errorHistory.filter(err => err.timestamp > fiveMinutesAgo);
  }

  getMetrics() {
    return {
      ...this.metrics,
      timestamp: new Date(),
      uptime: Math.floor(process.uptime()),
      nodeVersion: process.version,
      platform: os.platform(),
      arch: os.arch()
    };
  }

  getHealthStatus() {
    const metrics = this.getMetrics();
    const issues = [];

    // Check CPU usage
    if (parseFloat(metrics.system.cpuUsage) > 80) {
      issues.push(`High CPU usage: ${metrics.system.cpuUsage}%`);
    }

    // Check memory usage
    const memoryUsagePercent = (parseFloat(metrics.system.memoryUsage) / parseFloat(metrics.system.totalMemory)) * 100;
    if (memoryUsagePercent > 80) {
      issues.push(`High memory usage: ${memoryUsagePercent.toFixed(1)}%`);
    }

    // Check response time
    if (parseFloat(metrics.requests.averageResponseTime) > 1000) {
      issues.push(`High response time: ${metrics.requests.averageResponseTime}ms`);
    }

    // Check error rate
    if (metrics.errors.perMinute > 10) {
      issues.push(`High error rate: ${metrics.errors.perMinute} errors/min`);
    }

    return {
      status: issues.length === 0 ? 'healthy' : 'warning',
      issues,
      score: Math.max(0, 100 - (issues.length * 25)) // Score out of 100
    };
  }

  // Express middleware to track requests
  middleware() {
    return (req, res, next) => {
      const startTime = performance.now();

      // Override res.end to capture response time
      const originalEnd = res.end;
      res.end = function(chunk, encoding) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        // Record the request
        monitor.recordRequest(req.method, req.url, responseTime, res.statusCode);

        originalEnd.call(this, chunk, encoding);
      };

      next();
    };
  }
}

// Global performance monitor instance
const monitor = new PerformanceMonitor();

// Error tracking middleware
const errorTrackingMiddleware = (err, req, res, next) => {
  monitor.recordError(err, {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  next(err);
};

// Health endpoint
const createHealthEndpoint = () => {
  return (req, res) => {
    const metrics = monitor.getMetrics();
    const health = monitor.getHealthStatus();

    res.json({
      ...health,
      metrics,
      scalability: {
        maxConcurrentUsers: 50,
        maxIncidentDetections: 100,
        currentConnections: metrics.connections.active,
        requestsPerSecond: metrics.requests.perSecond
      }
    });
  };
};

module.exports = {
  PerformanceMonitor,
  monitor,
  errorTrackingMiddleware,
  createHealthEndpoint
};