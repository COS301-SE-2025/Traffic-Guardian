const autocannon = require('autocannon');

const tests = [
  {
    name: 'Light Load (10 connections)',
    params: {
      url: 'http://localhost:5000',
      connections: 10,
      duration: 10,
    }
  },
  {
    name: 'Medium Load (50 connections)',
    params: {
      url: 'http://localhost:5000',
      connections: 50,
      duration: 10,
    }
  },
  {
    name: 'Heavy Load (100 connections)',
    params: {
      url: 'http://localhost:5000',
      connections: 100,
      duration: 10,
    }
  },
  {
    name: 'API Health Endpoint',
    params: {
      url: 'http://localhost:5000/api/health',
      connections: 50,
      duration: 10,
    }
  },
  {
    name: 'Stress Test (200 connections)',
    params: {
      url: 'http://localhost:5000',
      connections: 200,
      duration: 15,
    }
  }
];

async function runComprehensiveTests() {
  console.log('🚀 Starting Comprehensive Load Testing...\n');

  const results = [];

  for (const test of tests) {
    console.log(`📊 Running: ${test.name}`);
    console.log(`   URL: ${test.params.url}`);
    console.log(`   Connections: ${test.params.connections}`);
    console.log(`   Duration: ${test.params.duration}s`);

    try {
      const result = await runTest(test.params);
      results.push({
        name: test.name,
        ...result
      });

      console.log(`   ✅ Requests/sec: ${result.requests.average}`);
      console.log(`   ✅ Latency avg: ${result.latency.average}ms`);
      console.log(`   ✅ Throughput: ${result.throughput.average} bytes/sec`);
      console.log(`   ✅ Errors: ${result.errors.length}`);
      console.log(`   ✅ Timeouts: ${result.timeouts}`);
      console.log(`   ✅ 2xx responses: ${result['2xx']}`);
      console.log(`   ✅ Non-2xx responses: ${result.non2xx}\n`);

    } catch (error) {
      console.error(`   ❌ Test failed: ${error.message}\n`);
      results.push({
        name: test.name,
        error: error.message
      });
    }

    // Wait between tests to let server recover
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Summary
  console.log('📋 TEST SUMMARY:');
  console.log('================');
  results.forEach(result => {
    if (result.error) {
      console.log(`❌ ${result.name}: FAILED - ${result.error}`);
    } else {
      console.log(`✅ ${result.name}:`);
      console.log(`   RPS: ${result.requests.average}`);
      console.log(`   Latency: ${result.latency.average}ms`);
      console.log(`   Errors: ${result.errors.length}`);
      console.log(`   Timeouts: ${result.timeouts}`);
    }
  });

  // Identify performance issues
  console.log('\n🔍 PERFORMANCE ANALYSIS:');
  console.log('======================');

  const issues = [];

  results.forEach(result => {
    if (result.error) {
      issues.push(`❌ ${result.name}: Test failed completely`);
      return;
    }

    if (result.requests.average < 1000) {
      issues.push(`⚠️  ${result.name}: Low throughput (${result.requests.average} RPS)`);
    }

    if (result.latency.average > 100) {
      issues.push(`⚠️  ${result.name}: High latency (${result.latency.average}ms)`);
    }

    if (result.errors.length > 0) {
      issues.push(`⚠️  ${result.name}: Has errors (${result.errors.length})`);
    }

    if (result.timeouts > 0) {
      issues.push(`⚠️  ${result.name}: Has timeouts (${result.timeouts})`);
    }

    if (result.non2xx > 0) {
      issues.push(`⚠️  ${result.name}: Non-2xx responses (${result.non2xx})`);
    }
  });

  if (issues.length === 0) {
    console.log('✅ No major performance issues detected!');
  } else {
    console.log('Issues found:');
    issues.forEach(issue => console.log(`   ${issue}`));
  }

  return results;
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
  runComprehensiveTests()
    .then(() => {
      console.log('\n🎉 Comprehensive load testing completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { runComprehensiveTests, runTest };