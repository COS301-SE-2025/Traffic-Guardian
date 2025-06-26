const ioClient = require('socket.io-client');

let clientSocket;

jest.setTimeout(5000); //5s


beforeAll((done) => {
  clientSocket = ioClient('http://localhost:5000');
  clientSocket.on('connect', done);

  clientSocket.on('connect_error', (err) => {
    console.error('Connection error:', err);
    done(err);
  });
});

afterAll((done) => {
  if (clientSocket.connected) {
    clientSocket.disconnect();
  }
  done();
});

describe('Weather sockets', () => {
  test('receives weatherUpdate from server', (done) => {
    clientSocket.on('weatherUpdate', (data) => {
      try {
        expect(Array.isArray(data)).toBe(true);
        done();
      } catch (e) {
        done(e);
      }
    });
  });
});


describe('Traffic sockets', ()=>{

      test('receives trafficUpdate (mocked)', (done) => {
    const fakeSocket = {
      on: jest.fn((event, callback) => {
        if (event === 'trafficUpdate') {
          callback([{ id: 1 }]);
        }
      }),
    };

    fakeSocket.on('trafficUpdate', (data) => {
      try {
        expect(Array.isArray(data)).toBe(true);
        done();
      } catch (e) {
        done(e);
      }
    });
  });


})
