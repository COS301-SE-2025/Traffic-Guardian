class UserStatsManager {
  constructor() {
    this.userTimeline = [];
    this.userLocations = new Map();
    this.regionNames = ['Rosebank', 'Sandton', 'Midrand', 'Centurion', 'Pretoria', 'Soweto', 'Randburg', 'Boksburg', 'Vereeniging', 'Alberton', 'Hatfield'];
    this.regionsCoords = ['-26.1438,28.0406', '-26.09108017449409,28.08474153621201', '-25.9819,28.1329', '-25.8347,28.1127', '-25.7566,28.1914', '-26.2678,27.8658', '-26.0936,27.9931', '-26.2259,28.1598', '-26.6667,27.9167', '-26.3333,28.1667', '-25.7487,28.2380'];
  }

  addUser(userID, location = {}) {
    const userData = {
      userID,
      location,
      connectedAt: new Date(),
      region: this.getUserRegion(location)
    };
    
    this.userLocations.set(userID, userData);
    
    this.userTimeline.push({
      timestamp: new Date(),
      action: 'connect',
      userID: userID,
      totalUsers: this.userLocations.size
    });

    if (this.userTimeline.length > 100) {
      this.userTimeline = this.userTimeline.slice(-100);
    }
  }

  removeUser(userID) {
    if (this.userLocations.has(userID)) {
      this.userLocations.delete(userID);
      
      this.userTimeline.push({
        timestamp: new Date(),
        action: 'disconnect',
        userID: userID,
        totalUsers: this.userLocations.size
      });

      if (this.userTimeline.length > 100) {
        this.userTimeline = this.userTimeline.slice(-100);
      }
    }
  }

  updateUserLocation(userID, location) {
    if (this.userLocations.has(userID)) {
      const userData = this.userLocations.get(userID);
      userData.location = location;
      userData.region = this.getUserRegion(location);
      this.userLocations.set(userID, userData);
    }
  }

  getUserRegion(location) {
    if (!location.latitude || !location.longitude) return null;
    
    let closestRegion = null;
    let minDistance = Infinity;
    
    for (let i = 0; i < this.regionNames.length; i++) {
      const coords = this.regionsCoords[i].split(",");
      const regionLat = parseFloat(coords[0]);
      const regionLon = parseFloat(coords[1]);
      
      const distance = this.calculateDistance(
        location.latitude, 
        location.longitude,
        regionLat,
        regionLon
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        closestRegion = this.regionNames[i];
      }
    }
    
    return minDistance < 20 ? closestRegion : null;
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  getTotalOnlineUsers() {
    return this.userLocations.size;
  }

  getRegionWithMostUsers() {
    const regionCounts = {};
    this.regionNames.forEach(region => regionCounts[region] = 0);
    
    for (const [userID, userData] of this.userLocations) {
      if (userData.region && regionCounts.hasOwnProperty(userData.region)) {
        regionCounts[userData.region]++;
      }
    }
    
    let maxUsers = 0;
    let topRegion = null;
    
    for (const [region, count] of Object.entries(regionCounts)) {
      if (count > maxUsers) {
        maxUsers = count;
        topRegion = region;
      }
    }
    
    return {
      region: topRegion,
      userCount: maxUsers
    };
  }

  getUserTimeline() {
    return this.userTimeline.slice(-20);
  }

  getUserStats() {
    const totalUsers = this.getTotalOnlineUsers();
    const topRegion = this.getRegionWithMostUsers();
    const timeline = this.getUserTimeline();
    
    const regionCounts = {};
    this.regionNames.forEach(region => regionCounts[region] = 0);
    
    for (const [userID, userData] of this.userLocations) {
      if (userData.region && regionCounts.hasOwnProperty(userData.region)) {
        regionCounts[userData.region]++;
      }
    }
    
    return {
      totalOnline: totalUsers,
      topRegion: topRegion,
      timeline: timeline,
      regionCounts: Object.entries(regionCounts).map(([region, userCount]) => ({
        region,
        userCount
      }))
    };
  }
}

describe('UserStatsManager', () => {
  let userStatsManager;

  beforeEach(() => {
    userStatsManager = new UserStatsManager();
  });

  describe('Constructor', () => {
    test('should initialize with correct regions', () => {
      expect(userStatsManager.regionNames).toHaveLength(11);
      expect(userStatsManager.regionsCoords).toHaveLength(11);
      expect(userStatsManager.userTimeline).toEqual([]);
      expect(userStatsManager.userLocations.size).toBe(0);
    });

    test('should have all expected regions', () => {
      const expectedRegions = ['Rosebank', 'Sandton', 'Midrand', 'Centurion', 'Pretoria', 'Soweto', 'Randburg', 'Boksburg', 'Vereeniging', 'Alberton', 'Hatfield'];
      expect(userStatsManager.regionNames).toEqual(expectedRegions);
    });
  });

  describe('addUser', () => {
    test('should add user with empty location', () => {
      userStatsManager.addUser('user1');
      
      expect(userStatsManager.userLocations.size).toBe(1);
      expect(userStatsManager.userTimeline).toHaveLength(1);
      
      const userData = userStatsManager.userLocations.get('user1');
      expect(userData.userID).toBe('user1');
      expect(userData.location).toEqual({});
      expect(userData.region).toBeNull();
      expect(userData.connectedAt).toBeInstanceOf(Date);
    });

    test('should add user with valid location', () => {
      const location = { latitude: -26.1438, longitude: 28.0406 };
      userStatsManager.addUser('user1', location);
      
      const userData = userStatsManager.userLocations.get('user1');
      expect(userData.location).toEqual(location);
      expect(userData.region).toBe('Rosebank');
    });

    test('should add timeline entry on user connect', () => {
      userStatsManager.addUser('user1');
      
      const timelineEntry = userStatsManager.userTimeline[0];
      expect(timelineEntry.action).toBe('connect');
      expect(timelineEntry.userID).toBe('user1');
      expect(timelineEntry.totalUsers).toBe(1);
      expect(timelineEntry.timestamp).toBeInstanceOf(Date);
    });

    test('should limit timeline to 100 entries', () => {
      // Add 101 users
      for (let i = 0; i < 101; i++) {
        userStatsManager.addUser(`user${i}`);
      }
      
      expect(userStatsManager.userTimeline).toHaveLength(100);
    });
  });

  describe('removeUser', () => {
    beforeEach(() => {
      userStatsManager.addUser('user1');
      userStatsManager.addUser('user2');
    });

    test('should remove existing user', () => {
      userStatsManager.removeUser('user1');
      
      expect(userStatsManager.userLocations.size).toBe(1);
      expect(userStatsManager.userLocations.has('user1')).toBe(false);
      expect(userStatsManager.userLocations.has('user2')).toBe(true);
    });

    test('should add timeline entry on user disconnect', () => {
      const initialLength = userStatsManager.userTimeline.length;
      userStatsManager.removeUser('user1');
      
      expect(userStatsManager.userTimeline).toHaveLength(initialLength + 1);
      
      const lastEntry = userStatsManager.userTimeline[userStatsManager.userTimeline.length - 1];
      expect(lastEntry.action).toBe('disconnect');
      expect(lastEntry.userID).toBe('user1');
      expect(lastEntry.totalUsers).toBe(1);
    });

    test('should not affect non-existent user', () => {
      const initialSize = userStatsManager.userLocations.size;
      const initialTimelineLength = userStatsManager.userTimeline.length;
      
      userStatsManager.removeUser('nonexistent');
      
      expect(userStatsManager.userLocations.size).toBe(initialSize);
      expect(userStatsManager.userTimeline).toHaveLength(initialTimelineLength);
    });
  });

  describe('updateUserLocation', () => {
    beforeEach(() => {
      userStatsManager.addUser('user1', {});
    });

    test('should update location for existing user', () => {
      const newLocation = { latitude: -26.1438, longitude: 28.0406 };
      userStatsManager.updateUserLocation('user1', newLocation);
      
      const userData = userStatsManager.userLocations.get('user1');
      expect(userData.location).toEqual(newLocation);
      expect(userData.region).toBe('Rosebank');
    });

    test('should not update location for non-existent user', () => {
      const initialSize = userStatsManager.userLocations.size;
      userStatsManager.updateUserLocation('nonexistent', { latitude: 1, longitude: 1 });
      
      expect(userStatsManager.userLocations.size).toBe(initialSize);
    });
  });

  describe('getUserRegion', () => {
    test('should return null for empty location', () => {
      const region = userStatsManager.getUserRegion({});
      expect(region).toBeNull();
    });

    test('should return null for location without coordinates', () => {
      const region1 = userStatsManager.getUserRegion({ latitude: -26.1438 });
      const region2 = userStatsManager.getUserRegion({ longitude: 28.0406 });
      expect(region1).toBeNull();
      expect(region2).toBeNull();
    });

    test('should return correct region for valid coordinates', () => {
      const rosebankLocation = { latitude: -26.1438, longitude: 28.0406 };
      const region = userStatsManager.getUserRegion(rosebankLocation);
      expect(region).toBe('Rosebank');
    });

    test('should return null for coordinates too far from any region', () => {
      const farLocation = { latitude: -30, longitude: 30 };
      const region = userStatsManager.getUserRegion(farLocation);
      expect(region).toBeNull();
    });
  });

  describe('calculateDistance', () => {
    test('should calculate distance between coordinates', () => {
      const distance = userStatsManager.calculateDistance(-26.1438, 28.0406, -26.1438, 28.0406);
      expect(distance).toBe(0);
    });

    test('should calculate correct distance for different coordinates', () => {
      const distance = userStatsManager.calculateDistance(-26.1438, 28.0406, -26.09108017449409, 28.08474153621201);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(10); // Should be less than 10km
    });
  });

  describe('getTotalOnlineUsers', () => {
    test('should return 0 for no users', () => {
      expect(userStatsManager.getTotalOnlineUsers()).toBe(0);
    });

    test('should return correct count for multiple users', () => {
      userStatsManager.addUser('user1');
      userStatsManager.addUser('user2');
      userStatsManager.addUser('user3');
      
      expect(userStatsManager.getTotalOnlineUsers()).toBe(3);
    });
  });

  describe('getRegionWithMostUsers', () => {
    test('should return null region for no users', () => {
      const result = userStatsManager.getRegionWithMostUsers();
      expect(result.region).toBeNull();
      expect(result.userCount).toBe(0);
    });

    test('should return correct region with most users', () => {
      userStatsManager.addUser('user1', { latitude: -26.1438, longitude: 28.0406 }); // Rosebank
      userStatsManager.addUser('user2', { latitude: -26.1438, longitude: 28.0406 }); // Rosebank
      userStatsManager.addUser('user3', { latitude: -26.09108017449409, longitude: 28.08474153621201 }); // Sandton
      
      const result = userStatsManager.getRegionWithMostUsers();
      expect(result.region).toBe('Rosebank');
      expect(result.userCount).toBe(2);
    });
  });

  describe('getUserTimeline', () => {
    test('should return empty array for no timeline', () => {
      expect(userStatsManager.getUserTimeline()).toEqual([]);
    });

    test('should return last 20 entries', () => {
      // Add 25 users to create 25 timeline entries
      for (let i = 0; i < 25; i++) {
        userStatsManager.addUser(`user${i}`);
      }
      
      const timeline = userStatsManager.getUserTimeline();
      expect(timeline).toHaveLength(20);
    });
  });

  describe('getUserStats', () => {
    test('should return complete stats for no users', () => {
      const stats = userStatsManager.getUserStats();
      
      expect(stats.totalOnline).toBe(0);
      expect(stats.topRegion.region).toBeNull();
      expect(stats.topRegion.userCount).toBe(0);
      expect(stats.timeline).toEqual([]);
      expect(stats.regionCounts).toHaveLength(11);
      expect(stats.regionCounts.every(rc => rc.userCount === 0)).toBe(true);
    });

    test('should return complete stats with users', () => {
      userStatsManager.addUser('user1', { latitude: -26.1438, longitude: 28.0406 });
      userStatsManager.addUser('user2', { latitude: -26.1438, longitude: 28.0406 });
      
      const stats = userStatsManager.getUserStats();
      
      expect(stats.totalOnline).toBe(2);
      expect(stats.topRegion.region).toBe('Rosebank');
      expect(stats.topRegion.userCount).toBe(2);
      expect(stats.timeline).toHaveLength(2);
      expect(stats.regionCounts).toHaveLength(11);
      
      const rosebankCount = stats.regionCounts.find(rc => rc.region === 'Rosebank');
      expect(rosebankCount.userCount).toBe(2);
    });
  });
});