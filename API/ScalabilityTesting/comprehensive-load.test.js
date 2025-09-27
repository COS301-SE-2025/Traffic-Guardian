const autocannon = require('autocannon');

const tests = [
  { name: 'Light Load (10 connections)', params: { url: 'http://localhost:5000', connections: 10, duration: 10 } },
  { name: 'Medium Load (50 connections)', params: { url: 'http://localhost:5000', connections: 50, duration: 10 } },
  { name: 'Heavy Load (100 connections)', params: { url: 'http://localhost:5000', connections: 100, duration: 10 } },
  { name: 'API Health Endpoint', params: { url: 'http://localhost:5000/api/health', connections: 50, duration: 10 } },
  { name: 'Stress Test (200 connections)', params: { url: 'http://localhost:5000', connections: 200, duration: 15 } }
];

function runTest(params) {
  return new Promise((resolve, reject) => {
    autocannon(params, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

describe('Comprehensive Load Testing', () => {
for (const testConfig of tests) {
  test(`${testConfig.name}`, async () => {

    const result = await runTest(testConfig.params);

    const rps = result.requests.average;
    const latency = result.latency.average;
    const errors = result.errors?.length || 0;
    const timeouts = result.timeouts || 0;
    const non2xx = result.non2xx || 0;

    expect(errors).toBe(0);

    expect(latency).toBeGreaterThan(0);

    await new Promise(resolve => setTimeout(resolve, 2000));
  }, 10 * 60 * 1000);
}

});
