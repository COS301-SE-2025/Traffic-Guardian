const app = require('./app');
const db = require('./config/db');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');
const FormData = require('form-data');
const weather = require('../src/Weather/weather');
const traffic = require('../src/Traffic/traffic');
const IncidentLocationMapping = require('../src/IncidentLocationMapping/IncidentLocationMapping');

const server = http.createServer(app);

const io = new Server(server, {
  cors : {
    origin: process.env.CORS_ORIGIN || '*',
    methods : ['GET', 'POST'],
    credentials: true
  }
});

// Configuration - will use GitHub secrets in production, .env for local development

const PORT = 5000;
const HOST = process.env.HOST || 'localhost';

var welcomeMsg;
var ILM = new IncidentLocationMapping.ILM;

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
    
    return minDistance < 20 ? closestRegion : null; // Within ~20km
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
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
    return this.userTimeline.slice(-20); // Return last 20 entries
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

const userStatsManager = new UserStatsManager();

async function getTodaysIncidents() {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    const query = `
      SELECT COUNT(*) as count 
      FROM "Incidents" 
      WHERE "Incidents_DateTime" >= $1 AND "Incidents_DateTime" <= $2
    `;
    
    const { rows } = await db.query(query, [startOfDay, endOfDay]);
    return parseInt(rows[0].count) || 0;
  } catch (error) {
    console.error('Error fetching today\'s incidents:', error);
    return 0;
  }
}

function emitUserStats() {
  const userStats = userStatsManager.getUserStats();
  io.emit('userStatsUpdate', userStats);
}

async function emitTodaysIncidents() {
  const count = await getTodaysIncidents();
  io.emit('todaysIncidentsUpdate', { count, date: new Date().toISOString().split('T')[0] });
}

 