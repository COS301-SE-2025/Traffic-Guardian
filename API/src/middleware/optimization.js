const cluster = require('cluster');
const os = require('os');

// Connection management for Socket.IO scalability
class ConnectionManager {
  constructor() {
    this.connections = new Map();
    this.userConnections = new Map(); // userId -> Set of socketIds
    this.maxConnectionsPerUser = 3; // Limit connections per user
    this.cleanupInterval = 5 * 60 * 1000; // 5 minutes
    this.startCleanup();
  }

  addConnection(socketId, userId, metadata = {}) {
    // Limit connections per user
    if (userId) {
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set());
      }

      const userSockets = this.userConnections.get(userId);
      if (userSockets.size >= this.maxConnectionsPerUser) {
        // Remove oldest connection
        const oldestSocket = Array.from(userSockets)[0];
        this.removeConnection(oldestSocket);
      }

      userSockets.add(socketId);
    }

    this.connections.set(socketId, {
      userId,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
      ...metadata
    });
  }

  removeConnection(socketId) {
    const connection = this.connections.get(socketId);
    if (connection && connection.userId) {
      const userSockets = this.userConnections.get(connection.userId);
      if (userSockets) {
        userSockets.delete(socketId);
        if (userSockets.size === 0) {
          this.userConnections.delete(connection.userId);
        }
      }
    }
    this.connections.delete(socketId);
  }

  updateActivity(socketId) {
    const connection = this.connections.get(socketId);
    if (connection) {
      connection.lastActivity = Date.now();
    }
  }

  getConnectionCount() {
    return this.connections.size;
  }

  getUserCount() {
    return this.userConnections.size;
  }

  startCleanup() {
    setInterval(() => {
      const now = Date.now();
      const staleThreshold = 30 * 60 * 1000; // 30 minutes

      for (const [socketId, connection] of this.connections.entries()) {
        if (now - connection.lastActivity > staleThreshold) {
          console.log(`Cleaning up stale connection: ${socketId}`);
          this.removeConnection(socketId);
        }
      }
    }, this.cleanupInterval);
  }

  getStats() {
    return {
      totalConnections: this.getConnectionCount(),
      uniqueUsers: this.getUserCount(),
      averageConnectionsPerUser: this.getUserCount() > 0 ? this.getConnectionCount() / this.getUserCount() : 0
    };
  }
}

// Optimized interval management for Socket.IO
class IntervalManager {
  constructor() {
    this.intervals = new Map();
    this.globalIntervals = new Map();
  }

  // Create per-socket interval with automatic cleanup
  createSocketInterval(socketId, callback, delay, name = 'unnamed') {
    if (!this.intervals.has(socketId)) {
      this.intervals.set(socketId, new Map());
    }

    const socketIntervals = this.intervals.get(socketId);

    // Clear existing interval with same name
    if (socketIntervals.has(name)) {
      clearInterval(socketIntervals.get(name));
    }

    const intervalId = setInterval(callback, delay);
    socketIntervals.set(name, intervalId);

    return intervalId;
  }

  // Create global interval shared across all sockets
  createGlobalInterval(name, callback, delay) {
    if (this.globalIntervals.has(name)) {
      clearInterval(this.globalIntervals.get(name));
    }

    const intervalId = setInterval(callback, delay);
    this.globalIntervals.set(name, intervalId);

    return intervalId;
  }

  // Clean up all intervals for a socket
  cleanupSocket(socketId) {
    const socketIntervals = this.intervals.get(socketId);
    if (socketIntervals) {
      for (const intervalId of socketIntervals.values()) {
        clearInterval(intervalId);
      }
      this.intervals.delete(socketId);
    }
  }

  // Clean up all intervals
  cleanup() {
    // Clean up socket intervals
    for (const socketIntervals of this.intervals.values()) {
      for (const intervalId of socketIntervals.values()) {
        clearInterval(intervalId);
      }
    }
    this.intervals.clear();

    // Clean up global intervals
    for (const intervalId of this.globalIntervals.values()) {
      clearInterval(intervalId);
    }
    this.globalIntervals.clear();
  }

  getStats() {
    let totalSocketIntervals = 0;
    for (const socketIntervals of this.intervals.values()) {
      totalSocketIntervals += socketIntervals.size;
    }

    return {
      socketsWithIntervals: this.intervals.size,
      totalSocketIntervals,
      globalIntervals: this.globalIntervals.size
    };
  }
}

// Request compression middleware
const requestCompression = (req, res, next) => {
  // Enable gzip compression for responses
  res.setHeader('Content-Encoding', 'gzip');

  // Set cache headers for static content
  if (req.url.includes('/api/health') || req.url.includes('/static/')) {
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
  }

  next();
};

// Request prioritization middleware
const requestPrioritizer = (req, res, next) => {
  // Set request priority based on endpoint
  if (req.url.includes('/api/incidents')) {
    req.priority = 'high';
  } else if (req.url.includes('/api/health')) {
    req.priority = 'low';
  } else {
    req.priority = 'normal';
  }

  // Add processing time header
  req.startTime = process.hrtime.bigint();

  const originalSend = res.send;
  res.send = function(data) {
    const endTime = process.hrtime.bigint();
    const processingTime = Number(endTime - req.startTime) / 1000000; // Convert to milliseconds
    res.setHeader('X-Processing-Time', `${processingTime.toFixed(2)}ms`);
    return originalSend.call(this, data);
  };

  next();
};

// Memory optimization middleware
const memoryOptimizer = (req, res, next) => {
  // Force garbage collection periodically (only in development)
  if (process.env.NODE_ENV === 'development' && global.gc) {
    if (Math.random() < 0.001) { // 0.1% chance
      global.gc();
    }
  }

  next();
};

// Process optimization
const optimizeProcess = () => {
  // Set process priority
  if (process.platform !== 'win32') {
    try {
      process.setpriority(0, -10); // Higher priority
    } catch (err) {
      console.warn('Could not set process priority:', err.message);
    }
  }

  // Optimize event loop
  process.nextTick(() => {
    // Handle uncaught exceptions gracefully
    process.on('uncaughtException', (err) => {
      console.error('Uncaught Exception:', err);
      // Don't exit in production, just log
      if (process.env.NODE_ENV === 'production') {
        console.error('Continuing despite uncaught exception...');
      } else {
        process.exit(1);
      }
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      // Don't exit in production
      if (process.env.NODE_ENV !== 'production') {
        process.exit(1);
      }
    });
  });
};

// Cluster optimization for production
const setupCluster = () => {
  if (cluster.isMaster && process.env.NODE_ENV === 'production') {
    const numCPUs = os.cpus().length;
    const numWorkers = Math.min(numCPUs, 4); // Limit to 4 workers max

    console.log(`Master ${process.pid} is running`);
    console.log(`Starting ${numWorkers} workers...`);

    // Fork workers
    for (let i = 0; i < numWorkers; i++) {
      cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
      console.log(`Worker ${worker.process.pid} died with code ${code} and signal ${signal}`);
      console.log('Starting a new worker...');
      cluster.fork();
    });

    return false; // Don't continue in master process
  }

  return true; // Continue in worker process or development
};

module.exports = {
  ConnectionManager,
  IntervalManager,
  requestCompression,
  requestPrioritizer,
  memoryOptimizer,
  optimizeProcess,
  setupCluster
};