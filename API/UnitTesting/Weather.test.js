const weather = require('../src/Weather/weather');

test('Basic weather retrieval', async ()=>{
    const response = await weather.getWeather();

  expect(Array.isArray(response)).toBe(true);
  expect(response.length).toBeGreaterThan(1);
})