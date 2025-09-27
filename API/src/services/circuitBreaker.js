class CircuitBreaker {
  constructor(options = {}) {
    this.name = options.name || 'CircuitBreaker';
    this.threshold = options.threshold || 5; // Number of failures before opening
    this.timeout = options.timeout || 60000; // Time in ms before attempting reset
    this.monitor = options.monitor || false; // Enable monitoring

    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.stats = {
      requests: 0,
      successes: 0,
      failures: 0,
      fallbacks: 0
    };
  }

  async call(fn, fallback = null) {
    this.stats.requests++;

    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime < this.timeout) {
        if (this.monitor) {
          console.log(`[${this.name}] Circuit OPEN - using fallback`);
        }
        this.stats.fallbacks++;
        return fallback ? await fallback() : this._getDefaultFallback();
      } else {
        this.state = 'HALF_OPEN';
        if (this.monitor) {
          console.log(`[${this.name}] Circuit moving to HALF_OPEN`);
        }
      }
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (error) {
      this._onFailure();

      if (fallback) {
        this.stats.fallbacks++;
        return await fallback();
      }

      throw error;
    }
  }

  _onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.stats.successes++;

    if (this.monitor) {
      console.log(`[${this.name}] Request successful - Circuit CLOSED`);
    }
  }

  _onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.stats.failures++;

    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      if (this.monitor) {
        console.log(`[${this.name}] Circuit OPENED after ${this.failureCount} failures`);
      }
    }
  }

  _getDefaultFallback() {
    return {
      error: true,
      message: `Service ${this.name} temporarily unavailable`,
      circuitOpen: true,
      fallback: true
    };
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      stats: { ...this.stats }
    };
  }

  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = null;
    if (this.monitor) {
      console.log(`[${this.name}] Circuit manually reset`);
    }
  }
}

// Pre-configured circuit breakers for different services
const circuitBreakers = {
  // Third-party API circuit breakers
  tomtomTraffic: new CircuitBreaker({
    name: 'TomTom-Traffic',
    threshold: 3,
    timeout: 30000, // 30 seconds
    monitor: true
  }),

  californiaTraffic: new CircuitBreaker({
    name: 'California-Traffic',
    threshold: 5,
    timeout: 60000, // 1 minute
    monitor: true
  }),

  weather: new CircuitBreaker({
    name: 'Weather-API',
    threshold: 3,
    timeout: 45000, // 45 seconds
    monitor: true
  }),

  pems: new CircuitBreaker({
    name: 'PEMS-API',
    threshold: 4,
    timeout: 120000, // 2 minutes
    monitor: true
  }),

  // Database circuit breaker
  database: new CircuitBreaker({
    name: 'Database',
    threshold: 10,
    timeout: 5000, // 5 seconds
    monitor: true
  }),

  // AI model circuit breaker
  aiModel: new CircuitBreaker({
    name: 'AI-Model',
    threshold: 3,
    timeout: 30000, // 30 seconds
    monitor: true
  })
};

// Fallback data providers
const fallbackData = {
  traffic: () => ({
    fallback: true,
    data: [],
    message: 'Traffic data temporarily unavailable',
    timestamp: new Date()
  }),

  weather: () => ({
    fallback: true,
    data: {
      temperature: 'N/A',
      conditions: 'Unknown',
      message: 'Weather data temporarily unavailable'
    },
    timestamp: new Date()
  }),

  incidents: () => ({
    fallback: true,
    data: [],
    message: 'Incident detection temporarily unavailable',
    timestamp: new Date()
  })
};

// Enhanced API call wrapper with circuit breaker
const withCircuitBreaker = (breakerName, fallbackData = null) => {
  return (target, propertyName, descriptor) => {
    const method = descriptor.value;
    const breaker = circuitBreakers[breakerName];

    if (!breaker) {
      throw new Error(`Circuit breaker '${breakerName}' not found`);
    }

    descriptor.value = async function(...args) {
      return breaker.call(
        () => method.apply(this, args),
        fallbackData
      );
    };

    return descriptor;
  };
};

// Health check for all circuit breakers
const getCircuitBreakerHealth = () => {
  const health = {};

  for (const [name, breaker] of Object.entries(circuitBreakers)) {
    const state = breaker.getState();
    health[name] = {
      status: state.state === 'CLOSED' ? 'healthy' : 'degraded',
      state: state.state,
      failureCount: state.failureCount,
      stats: state.stats,
      uptime: state.lastFailureTime ?
        ((Date.now() - state.lastFailureTime) / 1000).toFixed(1) + 's since last failure' :
        'No recent failures'
    };
  }

  return health;
};

// Middleware to expose circuit breaker status
const circuitBreakerMiddleware = (req, res, next) => {
  req.circuitBreakers = circuitBreakers;
  req.circuitBreakerHealth = getCircuitBreakerHealth;
  next();
};

module.exports = {
  CircuitBreaker,
  circuitBreakers,
  fallbackData,
  withCircuitBreaker,
  getCircuitBreakerHealth,
  circuitBreakerMiddleware
};