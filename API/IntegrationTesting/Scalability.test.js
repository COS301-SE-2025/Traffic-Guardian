const autocannon = require('autocannon');
/*
test('block out scalability testing',()=>{
  expect(1+1).toBe(2);
})
*/
/*
describe('Performance Test with Autocannon', () => {
  test('Case with 50 connections', async()=>{
    const params = {
      url: 'http://localhost:5000',
      connections: 50,
      duration: 3,
    };

    const result = await runAutoCannon(params);

    console.log('Requests/sec:', result.requests.average, 'at ', new Date());

    expect(result.requests.average).toBeGreaterThanOrEqual(0);
  });
});


function runAutoCannon(p){
    return new Promise((resolve, reject)=>{
        autocannon(p, (err, res)=>{
            if(err){
                return reject(err);
            }

            return resolve(res);
        })
    });
}
    */