const app = require('./app');
const db = require('./config/db');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');
const FormData = require('form-data');
const weather = require('../src/Weather/weather');
const traffic = require('../src/Traffic/traffic');
const IncidentLocationMapping = require('../src/IncidentLocationMapping/IncidentLocationMapping');
const incidentModel = require('./models/incident');

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
var connectedUsers = new Map();
var incidents = new Map();

io.on('connection',(socket)=>{
  connectedUsers.set(socket.id, {});
  console.log(socket.id + ' connected');
  console.log('Number of users connected ' + connectedUsers.size);

  welcomeMsg = `Welcome this your ID ${socket.id} cherish it`;
  socket.emit('welcome', welcomeMsg);
    
    //weather prt
    weather.getWeather().then((data)=>{
      socket.emit('weatherUpdate', data);
    })
    setInterval(async()=>{
      const weatherD = await weather.getWeather();
      socket.emit('weatherUpdate',weatherD);
    }, 60*60*1000); //1hr interval

    //traffic prt
    traffic.getTraffic().then((data)=>{
      socket.emit('trafficUpdate', data);

      //critical incidents
      const res = traffic.criticalIncidents(data);
      socket.emit('criticalIncidents', res);

      //incident Category
      const res_incidentCategory = traffic.incidentCategory(data);
      socket.emit('incidentCategory', res_incidentCategory);

      //incident Locations
      const res_incidentLocations =  traffic.incidentLocations(data);
      socket.emit('incidentLocations', res_incidentLocations);
    })
    setInterval(async()=>{
      const data = await traffic.getTraffic();
      socket.emit('trafficUpdate', data);
    }, 30*60*1000); //30 min interval


    //update users location
    socket.on('new-location', async (newLocation)=>{
      connectedUsers.set(socket.id, newLocation);
      //console.log(connectedUsers);
    });

    //new incident dummy
    socket.on('new-incident-location', (newLocation)=>{
      incidents.set(new Date().getTime(), newLocation);
      console.log('Incidents : ');
      /*incidents.forEach((value, key)=>{
        console.log(`(${key} : ${JSON.stringify(value)})`);
      })*/
    })

    //notify users of incident
    setInterval(()=>{
      const data = IncidentLocationMapping.notifyUsers(connectedUsers, incidents);
      console.log(data);
    }, 5000);



  io.on('disconnect',()=>{
    console.log(socket.id + ' disconnected');
  })
});

  app.set('io', io);

 /*  server.listen(PORT, ()=>{
    console.log('Socket server running');
  }) */



// Test database connection before starting server
db.query('SELECT NOW()')
  .then(() => {
    console.log('Database connection established');
    
    // Start the server
    server.listen(PORT, () => {
      console.log(`Database connection established`);
      console.log(`Server running on port ${PORT}`);
      console.log(`API available at: http://${HOST}:${PORT}`);
      console.log(`API documentation available at: https://documenter.getpostman.com/view/34423164/2sB2qak34y`);
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
    connectedUsers
  };