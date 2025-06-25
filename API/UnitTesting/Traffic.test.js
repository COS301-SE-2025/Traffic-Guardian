const traffic = require('../src/Traffic/traffic');

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
    test('Converts distance to longitude degrees at equator (lat=0)', () => {
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