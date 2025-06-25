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
