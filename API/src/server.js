const app = require('./app');
const db = require('./config/db');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');
const FormData = require('form-data');
const traffic = require('../src/Traffic/traffic');
const caltransTraffic = require('../src/Traffic/caltransTraffic');
const archivesModel = require('./models/archives');
const ILM = require('../src/IncidentLocationMapping/ilmInstance');
const weather = require('./Weather/weather');

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

// Global socket connection tracking
let activeConnections = new Set();
let connectedUsers = new Map(); // socket.id -> user info

// Helper function to broadcast active user count
const broadcastActiveUsers = () => {
  const activeUsersCount = activeConnections.size;
  io.emit('activeUsersUpdate', {
    count: activeUsersCount,
    timestamp: new Date()
  });
  console.log(`📊 Broadcasting active users: ${activeUsersCount}`);
};

var welcomeMsg;

io.on('connection',(socket)=>{
  // Track new connection
  activeConnections.add(socket.id);
  connectedUsers.set(socket.id, {
    socketId: socket.id,
    connectedAt: new Date(),
    userAgent: socket.handshake.headers['user-agent'] || 'Unknown',
    ip: socket.handshake.address || 'Unknown'
  });
  
  ILM.addUser(socket.id, {});

  welcomeMsg = `Welcome this your ID ${socket.id} cherish it`;
  socket.emit('welcome', welcomeMsg);
  
  // Broadcast updated user count
  broadcastActiveUsers();
  
  console.log(`👤 New user connected: ${socket.id} (Total: ${activeConnections.size})`);
    
    //traffic prt - try enhanced California traffic first
    const getTrafficData = async () => {
      if (process.env.USE_CALIFORNIA_TRAFFIC === 'true') {
        console.log('🌴 Initial fetch: Using enhanced California traffic data...');
        return await caltransTraffic.getEnhancedCaliforniaTraffic();
      } else {
        console.log('🗺️  Initial fetch: Using TomTom traffic data...');
        return await traffic.getTraffic();
      }
    };
    
    getTrafficData().then((data)=>{
      if (data && Array.isArray(data)) {
        socket.emit('trafficUpdate', data);

        //update regions Traffic
        ILM.updateTraffic(data);

        //critical incidents
        const res = traffic.criticalIncidents(data);
        socket.emit('criticalIncidents', res);

        //incident Category
        const res_incidentCategory = traffic.incidentCategory(data);
        socket.emit('incidentCategory', res_incidentCategory);

        //incident Locations
        const res_incidentLocations =  traffic.incidentLocations(data);
        socket.emit('incidentLocations', res_incidentLocations);
      } else {
        console.log('⚠️  Traffic API unavailable on connection - using empty data');
        socket.emit('trafficUpdate', []);
        socket.emit('criticalIncidents', { Data: 'Amount of critical Incidents', Amount: 0 });
        socket.emit('incidentCategory', { categories: [], percentages: [] });
        socket.emit('incidentLocations', []);
      }
    }).catch((error) => {
      console.error('Traffic API error on connection:', error.message);
      // Send empty data instead of crashing
      socket.emit('trafficUpdate', []);
      socket.emit('criticalIncidents', { Data: 'Amount of critical Incidents', Amount: 0 });
      socket.emit('incidentCategory', { categories: [], percentages: [] });
      socket.emit('incidentLocations', []);
    })
    
    // Weather data on connection
    weather.getWeather().then((weatherData) => {
      socket.emit('weatherUpdate', weatherData);
    }).catch(err => {
      console.error('Error fetching initial weather data:', err);
    });
    
    setInterval(async()=>{
      try {
        let data;
        
        if (process.env.USE_CALIFORNIA_TRAFFIC === 'true') {
          console.log('🌴 Using enhanced California traffic data...');
          data = await caltransTraffic.getEnhancedCaliforniaTraffic();
        } else {
          console.log('🗺️  Using TomTom traffic data...');
          data = await traffic.getTraffic();
        }
        
        if (data && Array.isArray(data)) {
          socket.emit('trafficUpdate', data);
          
          // Update regions traffic (from Dev branch)
          ILM.updateTraffic(data);

          //critical incidents
          const res = traffic.criticalIncidents(data);
          socket.emit('criticalIncidents', res);

          //incident Category
          const res_incidentCategory = traffic.incidentCategory(data);
          socket.emit('incidentCategory', res_incidentCategory);

          //incident Locations
          const res_incidentLocations =  traffic.incidentLocations(data);
          socket.emit('incidentLocations', res_incidentLocations);
        } else {
          console.log('⚠️  Traffic API unavailable in interval update - skipping');
        }
      } catch (error) {
        console.error('Traffic API error in interval update:', error.message);
        // Continue running - don't let API failures break the interval
      }
      
      // Update weather data periodically
      try {
        const weatherData = await weather.getWeather();
        socket.emit('weatherUpdate', weatherData);
      } catch (weatherError) {
        console.error('Error fetching periodic weather data:', weatherError);
      }
    }, 30*60*1000); //30 min interval
    
    //update users location (from Dev branch)
    socket.on('new-location', async (newLocation)=>{
     ILM.updateUserLocation(socket.id, newLocation);
     const notifiedUsers = ILM.notifyUsers();
     notifiedUsers.forEach((notificationData)=>{
      io.to(notificationData.userID).emit('new-traffic', notificationData.notification);
      //console.log(notificationData.notification.incidents.length);
     })
    });

    // ==================== ARCHIVE ANALYTICS SOCKET EVENTS ====================
    
    // Send initial archive statistics on connection
    archivesModel.getArchiveStats().then((stats) => {
      socket.emit('archiveStatsUpdate', {
        stats,
        timestamp: new Date(),
        type: 'initial'
      });
    }).catch(err => {
      console.error('Error fetching initial archive stats:', err);
    });

    // Send recent archives on connection
    archivesModel.getArchives({ limit: 10, offset: 0 }).then((recentArchives) => {
      socket.emit('archiveUpdate', {
        recentArchives,
        timestamp: new Date(),
        type: 'initial'
      });
    }).catch(err => {
      console.error('Error fetching recent archives:', err);
    });

    // Periodic archive statistics updates (every 5 minutes)
    const archiveStatsInterval = setInterval(async () => {
      try {
        const stats = await archivesModel.getArchiveStats();
        const recentArchives = await archivesModel.getArchives({ limit: 10, offset: 0 });
        
        // Calculate additional metrics
        const totalArchives = stats.reduce((sum, stat) => sum + stat.count, 0);
        const thisMonth = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        
        // Get archives for this month
        const firstDayOfMonth = new Date();
        firstDayOfMonth.setDate(1);
        firstDayOfMonth.setHours(0, 0, 0, 0);
        
        const monthlyArchives = await archivesModel.getArchives({
          date_from: firstDayOfMonth.toISOString(),
          limit: 1000
        });

        const archiveAnalytics = {
          totalArchives,
          archivesThisMonth: monthlyArchives.length,
          averageArchiveSize: 2048, // Estimated in bytes
          storageUsed: totalArchives * 2048,
          statusBreakdown: {},
          severityBreakdown: {},
          typeBreakdown: {}
        };

        // Process breakdowns
        stats.forEach(stat => {
          if (!archiveAnalytics.statusBreakdown[stat.status]) {
            archiveAnalytics.statusBreakdown[stat.status] = 0;
          }
          archiveAnalytics.statusBreakdown[stat.status] += stat.count;

          if (!archiveAnalytics.severityBreakdown[stat.severity]) {
            archiveAnalytics.severityBreakdown[stat.severity] = 0;
          }
          archiveAnalytics.severityBreakdown[stat.severity] += stat.count;

          if (!archiveAnalytics.typeBreakdown[stat.type]) {
            archiveAnalytics.typeBreakdown[stat.type] = 0;
          }
          archiveAnalytics.typeBreakdown[stat.type] += stat.count;
        });

        // Emit comprehensive archive update
        socket.emit('archiveStatsUpdate', {
          ...archiveAnalytics,
          recentArchives,
          timestamp: new Date(),
          type: 'periodic'
        });

        // Also emit to all connected clients
        io.emit('archiveAnalyticsUpdate', {
          ...archiveAnalytics,
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Error in archive stats interval:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Archive trend analysis (every 30 minutes)
    const archiveTrendsInterval = setInterval(async () => {
      try {
        // Get archives from last 7 days for trend analysis
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const weeklyArchives = await archivesModel.getArchives({
          date_from: sevenDaysAgo.toISOString(),
          limit: 1000
        });

        // Process daily trends
        const dailyTrends = {};
        weeklyArchives.forEach(archive => {
          const date = new Date(archive.Archive_DateTime);
          const dayKey = date.toLocaleDateString('en-US');
          
          if (!dailyTrends[dayKey]) {
            dailyTrends[dayKey] = {
              date: dayKey,
              total: 0,
              bySeverity: { high: 0, medium: 0, low: 0 },
              byStatus: { open: 0, ongoing: 0, resolved: 0, closed: 0 }
            };
          }
          
          dailyTrends[dayKey].total++;
          dailyTrends[dayKey].bySeverity[archive.Archive_Severity] = 
            (dailyTrends[dayKey].bySeverity[archive.Archive_Severity] || 0) + 1;
          dailyTrends[dayKey].byStatus[archive.Archive_Status] = 
            (dailyTrends[dayKey].byStatus[archive.Archive_Status] || 0) + 1;
        });

        socket.emit('archiveTrendsUpdate', {
          weeklyTrends: Object.values(dailyTrends),
          totalWeeklyArchives: weeklyArchives.length,
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Error in archive trends interval:', error);
      }
    }, 30 * 60 * 1000); // 30 minutes

    // Handle socket disconnection - Add user tracking cleanup
    socket.on('disconnect', (reason) => {
      // Remove from tracking
      activeConnections.delete(socket.id);
      connectedUsers.delete(socket.id);
      
      // Clean up archive intervals
      clearInterval(archiveStatsInterval);
      clearInterval(archiveTrendsInterval);
      
      // Remove user from ILM system
      ILM.removeUser(socket.id);
      
      // Broadcast updated user count
      broadcastActiveUsers();
      
      console.log(`👋 User disconnected: ${socket.id} (Reason: ${reason}) (Total: ${activeConnections.size})`);
    });
    
    // Handle request for current stats
    socket.on('request-stats', () => {
      socket.emit('activeUsersUpdate', {
        count: activeConnections.size,
        timestamp: new Date()
      });
    });
});

// Set io instance in app for use in controllers
app.set('io', io);

// Periodic broadcast of active users count (every 30 seconds)
setInterval(() => {
  if (activeConnections.size > 0) {
    broadcastActiveUsers();
  }
}, 30000);

// ==================== ARCHIVE EVENT EMITTERS ====================

// Function to emit archive creation events (to be called when new archives are created)
const emitArchiveCreated = (archiveData) => {
  console.log('Emitting archiveCreated event:', archiveData);
  io.emit('archiveCreated', {
    archive: archiveData,
    timestamp: new Date(),
    type: 'new'
  });
};

// Function to emit archive updates (to be called when archives are modified)
const emitArchiveUpdated = (archiveData) => {
  console.log('Emitting archiveUpdated event:', archiveData);
  io.emit('archiveUpdated', {
    archive: archiveData,
    timestamp: new Date(),
    type: 'update'
  });
};

// Function to emit archive analytics refresh
const emitArchiveAnalyticsRefresh = async () => {
  try {
    const stats = await archivesModel.getArchiveStats();
    const recentArchives = await archivesModel.getArchives({ limit: 20, offset: 0 });
    
    io.emit('archiveAnalyticsRefresh', {
      stats,
      recentArchives,
      timestamp: new Date(),
      type: 'refresh'
    });
    
    console.log('Archive analytics refresh emitted to all clients');
  } catch (error) {
    console.error('Error emitting archive analytics refresh:', error);
  }
};

// Export archive event emitters for use in other parts of the application
app.set('emitArchiveCreated', emitArchiveCreated);
app.set('emitArchiveUpdated', emitArchiveUpdated);
app.set('emitArchiveAnalyticsRefresh', emitArchiveAnalyticsRefresh);

// ==================== ENHANCED INCIDENT HANDLING ====================

// Enhanced incident event handling that also considers archive implications
const originalEmitNewAlert = (incidentData) => {
  // Emit the original incident alert
  io.emit('newAlert', incidentData);
  console.log('Emitting newAlert:', incidentData);
  
  // Potentially trigger archive creation (simulating automatic archiving)
  setTimeout(async () => {
    try {
      // This would typically be done by a background archiving process
      // Here I am simulating the notification that archiving might occur
      io.emit('potentialArchiveCreation', {
        incidentId: incidentData.Incidents_ID || incidentData.id,
        timestamp: new Date(),
        reason: 'incident_reported'
      });
    } catch (error) {
      console.error('Error in potential archive creation notification:', error);
    }
  }, 5000); // 5 second delay to simulate processing time
};

app.set('emitNewAlert', originalEmitNewAlert);

// ==================== DATABASE AND SERVER STARTUP ====================

// Test database connection before starting server
db.query('SELECT NOW()')
  .then(() => {
    console.log('Database connection established');
    
    // Start the server
    server.listen(PORT, () => {
      console.log(`Database connection established`);
      console.log(`Server running on port ${PORT}`);
      console.log(`API available at: http://${HOST}:${PORT}`);
      console.log(`Socket.IO server running with archive analytics support`);
      console.log(`API documentation available at: https://documenter.getpostman.com/view/34423164/2sB2qak34y`);
      
      // Emit initial archive analytics to any early connections
      setTimeout(() => {
        emitArchiveAnalyticsRefresh();
      }, 2000);
    });
  })  .catch(err => {
    console.error('Database connection failed:', err);
    console.error('Please ensure all required GitHub Codespace secrets are properly configured:');
    console.error('- DATABASE_USERNAME');
    console.error('- DATABASE_HOST');
    console.error('- DATABASE_NAME');
    console.error('- DATABASE_PASSWORD');
    console.error('- DATABASE_PORT');
    process.exit(1);
   });

module.exports = {
  io,
  emitArchiveCreated,
  emitArchiveUpdated,
  emitArchiveAnalyticsRefresh
};