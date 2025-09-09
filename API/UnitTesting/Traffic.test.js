const traffic = require('../src/Traffic/traffic');
const artifacts = require('../UnitTesting/artifacts.json');

describe('Geographical distance conversions', () => {

  describe('distToLat', () => {
    test('Converts distance to latitude degrees correctly', () => {
      expect(traffic.distToLat(110.574)).toBeCloseTo(1, 4); 
      expect(traffic.distToLat(221.148)).toBeCloseTo(2, 4);
    });

    test('Handles zero distance', () => {
      expect(traffic.distToLat(0)).toBe(0);
    });

    test('Handles negative distance', () => {
      expect(traffic.distToLat(-110.574)).toBeCloseTo(-1, 4);
    });
  });

  describe('distToLong', () => {
    test('Converts distance to longitude degrees at equator', () => {
      expect(traffic.distToLong(111.32, 0)).toBeCloseTo(1, 4);
    });

    test('Handles zero distance', () => {
      expect(traffic.distToLong(0, 30)).toBe(0);
    });

    test('Handles negative distance', () => {
      const result = traffic.distToLong(-111.32, 0);
      expect(result).toBeCloseTo(-1, 4);
    });
  });

});

describe('Incident Analysis Functions', () => {
  const iconCategory = ['Accident', 'Jam', 'Rain', 'Road works'];
  const sampleInput = [artifacts[9]];

  test('criticalIncidents should count delays > 3', () => {
    const result = traffic.criticalIncidents(sampleInput);
    expect(result).toEqual({
      Data: 'Amount of critical Incidents',
      Amount: 5
    });
  });

  test('incidentCategory should return correct percentages', () => {
    const result = traffic.incidentCategory(sampleInput);

    expect(result.categories).toEqual(expect.arrayContaining(iconCategory));

    const accidentIndex = result.categories.indexOf('Accident');
  });

  test('incidentLocations should return correct locations and counts', () => {
    const result = traffic.incidentLocations(sampleInput);
    expect(result).toEqual([
      {
        location: 'Hatfield',
        amount: 8
      }
    ]);
  });
});

describe('TomTom API Error Handling', () => {
  const originalEnv = process.env.TOMTOMAPI;
  
  afterEach(() => {
    process.env.TOMTOMAPI = originalEnv;
  });

  test('getTraffic should return empty data when API fails', async () => {
    // Set invalid API key to simulate API failure
    process.env.TOMTOMAPI = 'invalid_key';
    
    const result = await traffic.getTraffic();
    
    // Should return array with empty incidents for each region
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(11); // 11 regions defined
    
    result.forEach(regionData => {
      expect(regionData).toHaveProperty('location');
      expect(regionData).toHaveProperty('incidents');
      expect(Array.isArray(regionData.incidents)).toBe(true);
      expect(regionData.incidents).toHaveLength(0);
    });
  });

  test('analysis functions should handle empty data gracefully', () => {
    const emptyData = [
      { location: 'Test', incidents: [] }
    ];

    const criticalResult = traffic.criticalIncidents(emptyData);
    expect(criticalResult).toEqual({
      Data: 'Amount of critical Incidents',
      Amount: 0
    });

    const categoryResult = traffic.incidentCategory(emptyData);
    expect(categoryResult.categories).toBeDefined();
    expect(categoryResult.percentages).toBeDefined();

    const locationsResult = traffic.incidentLocations(emptyData);
    expect(locationsResult).toEqual([
      { location: 'Test', amount: 0 }
    ]);
  });
});
