const app = require('./app');
const db = require('./config/db');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');
const FormData = require('form-data');
const weather = require('../src/Weather/weather');
const traffic = require('../src/Traffic/traffic');

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
io.on('connection',(socket)=>{
  var incidents = [];
  console.log(socket.id + ' connected');

  welcomeMsg = `Welcome this your ID ${socket.id} cherish it`;
  socket.emit('welcome', welcomeMsg);

  socket.on('incident-location',(positition)=>{
    console.log(`${socket.id} reported incident at location = ${positition.latitude} , ${positition.latitude}`);
    incidents.push(positition);
    socket.emit('incident-recived', `I saved your incident at {${positition.latitude} , ${positition.latitude}}`);
  })

    
    weather.getWeather();
    setInterval(weather.getWeather, 60*60*1000); //1hr interval

    traffic.getTraffic();
    setInterval(traffic.getTraffic, 30*60*1000); //30 min interval


  io.on('disconnect',()=>{
    console.log(socket.id + ' disconnected');
  })
});

app.set('io', io);


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