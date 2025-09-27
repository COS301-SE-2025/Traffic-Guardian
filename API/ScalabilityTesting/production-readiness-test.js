const autocannon = require('autocannon');

// Test configuration for production readiness
const productionTests = [
  {
    name: '50 Concurrent Users - Health Check',
    params: {
      url: 'http://localhost:5000/api/health',
      connections: 50,
      duration: 30, // 30 seconds to simulate real usage
      headers: {
        'User-Agent': 'TrafficGuardian-LoadTest/1.0'
      }
    },
    target: {
      minRPS: 500, // Minimum requests per second expected
      maxLatency: 200, // Maximum acceptable latency in ms
      errorRate: 0.01 // Maximum 1% error rate
    }
  },
  {
    name: '100 Incident Detections Per Minute',
    params: {
      url: 'http://localhost:5000/api/incidents',
      method: 'GET',
      connections: 10, // Simulate AI models
      duration: 60, // 1 minute
      headers: {
        'X-AI-Model-ID': 'test-model-01',
        'Content-Type': 'application/json'
      }
    },
    target: {
      minRPS: 100, // 100 incident detections per minute
      maxLatency: 500,
      errorRate: 0.05 // 5% error rate acceptable for AI processing
    }
  },
  {
    name: 'Mixed Workload - Dashboard Usage',
    params: {
      url: 'http://localhost:5000',
      connections: 25, // Half the concurrent users
      duration: 20,
      headers: {
        'User-Agent': 'TrafficGuardian-Dashboard/1.0'
      }
    },
    target: {
      minRPS: 200,
      maxLatency: 300,
      errorRate: 0.02
    }
  },
  {
    name: 'Sustained Load - 50 Users for 5 Minutes',
    params: {
      url: 'http://localhost:5000/api/health',
      connections: 50,
      duration: 300, // 5 minutes
      headers: {
        'User-Agent': 'TrafficGuardian-Sustained/1.0'
      }
    },
    target: {
      minRPS: 400,
      maxLatency: 250,
      errorRate: 0.01
    }
  }
];

async function runProductionReadinessTests() {
  console.log('🎯 PRODUCTION READINESS TESTING');
  console.log('================================');
  console.log('Testing against specification:');
  console.log('• 50 concurrent users');
  console.log('• 100 incident detections per minute');
  console.log('• Cloud-ready performance\n');

  const results = [];
  let overallScore = 100;

  for (const test of productionTests) {
    console.log(`🔬 ${test.name}`);
    console.log(`   Connections: ${test.params.connections}`);
    console.log(`   Duration: ${test.params.duration}s`);
    console.log(`   Target RPS: ≥${test.target.minRPS}`);
    console.log(`   Target Latency: ≤${test.target.maxLatency}ms`);
    console.log(`   Max Error Rate: ≤${(test.target.errorRate * 100).toFixed(1)}%`);

    try {
      const result = await runTest(test.params);
      const analysis = analyzeResult(result, test.target);

      results.push({
        name: test.name,
        result,
        analysis,
        passed: analysis.passed
      });

      console.log(`   📊 Results:`);
      console.log(`      RPS: ${result.requests.average} (${analysis.rpsStatus})`);
      console.log(`      Latency: ${result.latency.average}ms (${analysis.latencyStatus})`);
      console.log(`      Success Rate: ${analysis.successRate.toFixed(2)}% (${analysis.errorStatus})`);
      console.log(`      Throughput: ${result.throughput.average} bytes/sec`);
      console.log(`   ${analysis.passed ? '✅ PASSED' : '❌ FAILED'}\n`);

      if (!analysis.passed) {
        overallScore -= 20;
      }

    } catch (error) {
      console.error(`   ❌ Test failed: ${error.message}\n`);
      results.push({
        name: test.name,
        error: error.message,
        passed: false
      });
      overallScore -= 25;
    }

    // Wait between tests
    if (test !== productionTests[productionTests.length - 1]) {
      console.log('   ⏳ Waiting 10 seconds before next test...\n');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  // Final assessment
  console.log('🏆 PRODUCTION READINESS ASSESSMENT');
  console.log('===================================');

  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;

  console.log(`Tests Passed: ${passedTests}/${totalTests}`);
  console.log(`Overall Score: ${Math.max(0, overallScore)}/100`);

  if (overallScore >= 80) {
    console.log('🟢 STATUS: READY FOR DEPLOYMENT');
  } else if (overallScore >= 60) {
    console.log('🟡 STATUS: NEEDS OPTIMIZATION');
  } else {
    console.log('🔴 STATUS: NOT READY FOR DEPLOYMENT');
  }

  // Recommendations
  console.log('\n📋 RECOMMENDATIONS:');
  results.forEach(result => {
    if (!result.passed && result.analysis) {
      console.log(`• ${result.name}: ${result.analysis.recommendations.join(', ')}`);
    }
  });

  return {
    overallScore,
    passedTests,
    totalTests,
    results,
    deploymentReady: overallScore >= 80
  };
}

function analyzeResult(result, target) {
  const actualRPS = result.requests.average;
  const actualLatency = result.latency.average;
  const totalRequests = result.requests.total;
  const errors = result.errors?.length || 0;
  const non2xx = result.non2xx || 0;
  const successfulRequests = totalRequests - errors - non2xx;
  const successRate = (successfulRequests / totalRequests) * 100;

  const rpsPass = actualRPS >= target.minRPS;
  const latencyPass = actualLatency <= target.maxLatency;
  const errorPass = (1 - successRate/100) <= target.errorRate;

  const recommendations = [];
  if (!rpsPass) recommendations.push('Increase server capacity or optimize request handling');
  if (!latencyPass) recommendations.push('Optimize response time and reduce processing overhead');
  if (!errorPass) recommendations.push('Investigate and fix error sources, adjust rate limiting');

  return {
    passed: rpsPass && latencyPass && errorPass,
    actualRPS,
    actualLatency,
    successRate,
    rpsStatus: rpsPass ? 'PASS' : 'FAIL',
    latencyStatus: latencyPass ? 'PASS' : 'FAIL',
    errorStatus: errorPass ? 'PASS' : 'FAIL',
    recommendations
  };
}

function runTest(params) {
  return new Promise((resolve, reject) => {
    autocannon(params, (err, result) => {
      if (err) {
        return reject(err);
      }
      resolve(result);
    });
  });
}

// Run if called directly
if (require.main === module) {
  runProductionReadinessTests()
    .then((assessment) => {
      console.log('\n🎉 Production readiness testing completed!');
      if (assessment.deploymentReady) {
        console.log('✅ API is ready for deployment with current specifications.');
      } else {
        console.log('❌ API requires optimization before deployment.');
      }
      process.exit(assessment.deploymentReady ? 0 : 1);
    })
    .catch(error => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { runProductionReadinessTests };