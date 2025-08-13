const { io } = require('socket.io-client');

describe('Socket.IO Server', () => {
  let socket;

  beforeAll((done) => {
    socket = io('http://localhost:5000');
    socket.on('connect', () => {
      console.log('Connected with ID:', socket.id);
      done();
    });
    socket.on('connect_error', (err) => {
      console.error('Connection error:', err);
      done(err);
    });
  });

  afterAll(() => {
    if (socket.connected) {
      socket.disconnect();
    }
  });

  test('should receive welcome message', (done) => {
    socket.onAny((event, ...args) => {
      console.log('Received event:', event, args);
    });

    socket.on('welcome', (msg) => {
      console.log('Received welcome message:', msg);
      try {
        expect(msg).toContain(socket.id);
        done();
      } catch (err) {
        done(err);
      }
    });

    socket.on('disconnect', () => {
      done(new Error('Socket disconnected prematurely'));
    });
  }, 15000);
});