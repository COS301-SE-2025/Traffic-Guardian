const autocannon = require('autocannon');
const endpoints = require('../IntegrationTesting/artifacts.json');

const BASE_URL = 'http://localhost:5000';

/* router.get('/stats', adminController.getAdminStats);
router.get('/cache/stats', adminController.getCacheStats);
router.get('/database/stats', adminController.getDatabaseStats);
router.get('/deduplication/stats', adminController.getDeduplicationStats);

router.get('/', archivesController.getArchives);
router.get('/stats', archivesController.getArchiveStats);
router.get('/:id', archivesController.getArchiveById);
router.get('/profile', authMiddleware.authenticate, authController.getProfile);

//pems
router.get('/high-risk-areas')
router.get('/dashboard-summary')
router.get('/alerts')

//health
router.get('/health')
router.get('/jobs/stats')

//users
router.get('/preferences') */

/*
test('block out scalability testing',()=>{
  expect(1+1).toBe(2);
})
*/
function runAutocannon(path, opts = {}) {
  return new Promise((resolve, reject) => {
    const instance = autocannon(
      {
        url: `${BASE_URL}${path}`,
        connections: opts.connections || 5,       
        duration: opts.duration || 15,            
        overallRate: opts.overallRate || 20,      
        pipelining: 1,                           
        method: 'GET'
      },
      (err, result) => {
        if (err) reject(err);
        else resolve(result);
      }
    );

    autocannon.track(instance, { renderProgressBar: true });
  });
}

describe('Performance & Scalability Tests', () => {
  jest.setTimeout(60000);

  Object.entries(endpoints).forEach(([group, routes]) => {
    describe(`${group} endpoints`, () => {
      routes.forEach(({ path, thresholds, rateLimit }) => {
        test(`GET ${path} should meet performance thresholds`, async () => {
          const result = await runAutocannon(path, {
            connections: 1,
            overallRate: 1,
            duration: 10
          });

          console.log(`\nResults for ${path}`);
          console.table({
            'Avg Latency (ms)': result.latency.average,
            'Req/sec': result.requests.average,
            'Throughput (MB/s)': result.throughput.average
          });

          if (thresholds?.latency) {
            expect(result.latency.average).toBeLessThan(expect.latency);
          }
          if (thresholds?.requests) {
            expect(result.requests.average).toBeGreaterThan(expect.requests);
          }
        });
      });
    });
  });
});
