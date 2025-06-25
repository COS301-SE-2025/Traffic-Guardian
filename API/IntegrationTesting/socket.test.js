const ioClient = require('socket.io-client');

let clientSocket;
///
jest.mock('../src/Traffic/traffic', () => ({
  getTraffic: jest.fn(() => Promise.resolve([
    { location: 'Pretoria', severity: 'high', type: 'Accident' },
  ])),
  criticalIncidents: jest.fn((data) => ({ Amount: 1, Data: 'Amount of critical Incidents' })),
  incidentCategory: jest.fn((data) => ['Accident']),
  incidentLocations: jest.fn((data) => ['Pretoria']),
}));

///


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
      test('receives trafficUpdate from server', (done) => {
    clientSocket.on('trafficUpdate', (data) => {
      try {
        expect(Array.isArray(data)).toBe(true);
        done();
      } catch (e) {
        done(e);
      }
    });
  });

    test('receives criticalIncidents from server', (done) => {
    clientSocket.on('criticalIncidents', async (data) => {
      try {
        expect(data).toHaveProperty('Data');
        done();
      } catch (e) {
        done(e);
      }
    });
  });
})
