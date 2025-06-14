const app = require('./app');
const db = require('./config/db');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');
require('dotenv').config({
  override: true,
  path: path.join(__dirname, '../../development.env'),
});

const server = http.createServer(app);

const io = new Server(server, {
  cors : {
    origin: process.env.CORS_ORIGIN || '*',
    methods : ['GET', 'POST'],
    credentials: true
  }
});

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

    var regions = ['-26.1438,28.0406', 'Sandton', '-25.9819,28.1329', '-25.8347,28.1127', '-25.7566,28.1914', '-26.2678,27.8658', '-26.0936,27.9931', '-26.2259,28.1598', '-26.6667,27.9167', '-26.3333,28.1667', '-25.7487,28.2380'];
    var weatherCurrent = [];
    var johannesburgCount = 0;
    async function getWeather(){
      johannesburgCount = 0;
      console.log(regions.length);
      for(var i=0; i< regions.length; i++){
        const form = new FormData();
        form.append('key', process.env.WEATHERAPI);
        form.append('q',regions[i]);
        try{
        var response = await axios.post('https://api.weatherapi.com/v1/current.json',form);
          weatherCurrent.push(response.data);
        }catch(error){
          console.log(error);
        }
      }

      
     for(var i=0; i< weatherCurrent.length; i++){
      if(weatherCurrent[i].location.name == 'Johannesburg'){
        johannesburgCount++;
      }

      if(johannesburgCount == 2 && weatherCurrent[i].location.name == 'Johannesburg'){
        weatherCurrent[i].location.name = 'Rosebank';
      }

      if(johannesburgCount == 3 && weatherCurrent[i].location.name == 'Johannesburg'){
        weatherCurrent[i].location.name = 'Marlboro';
      }
     }

      weatherCurrent.forEach((w)=>{
        console.log(w);
      })
    }

    getWeather();
    setInterval(getWeather, 60*60*1000); //1hr interval


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
  })
  .catch(err => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });