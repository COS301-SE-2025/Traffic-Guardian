const app = require('./app');
const db = require('./config/db');
const http = require('http');
const { Server } = require('socket.io');

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