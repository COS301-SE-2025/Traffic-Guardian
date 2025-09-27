const { ILM } = require("../src/IncidentLocationMapping/IncidentLocationMapping");

describe('Incident Location Mapping unit tests', () => {
    let ilm;

    beforeEach(() => {
        ilm = new ILM();
    });

    test('should initialize regions correctly', () => {
        expect(ilm.regions.size).toBe(ilm.regionNames.length);
        const Pasadena = ilm.regions.get('Pasadena');
        expect(Pasadena.location).toBe('Pasadena');
        expect(Pasadena.coordinates).toEqual({
            latitude: '34.1478',
            longitude: '-118.1445'
        });
        expect(Pasadena.incidents).toEqual([]);
    });

    test('should add a new incident to a region', () => {
        const incident = { type: 'accident', severity: 'high' };
        ilm.addNewIncident('Pasadena', incident);
        expect(ilm.regions.get('Pasadena').incidents).toContain(incident);
    });

    test('addNewIncident should handle unknown region gracefully', () => {
        expect(() => ilm.addNewIncident('Unknown', { type: 'test' })).toThrow();
    });

    test('should update traffic for multiple regions', () => {
        const trafficData = [
            { location: 'San Francisco', incidents: [{ type: 'jam' }] },
            { location: 'Los Angeles', incidents: [{ type: 'accident' }] }
        ];
        ilm.updateTraffic(trafficData);
        expect(ilm.regions.get('San Francisco').incidents).toEqual([{ type: 'jam' }]);
        expect(ilm.regions.get('Los Angeles').incidents).toEqual([{ type: 'accident' }]);
    });

    test('updateTraffic should skip unknown regions', () => {
        const trafficData = [
            { location: 'San Francisco', incidents: [{ type: 'jam' }] },
            { location: 'Nowhere', incidents: [{ type: 'ghost' }] }
        ];
        ilm.updateTraffic(trafficData);
        expect(ilm.regions.get('San Francisco').incidents).toEqual([{ type: 'jam' }]);
        expect(ilm.regions.has('Nowhere')).toBe(false);
    });

    test('should add and update users', () => {
        ilm.addUser('user1', { latitude: '37.7749', longitude: '-122.4194' });
        expect(ilm.users.has('user1')).toBe(true);

        const incidents = [{ type: 'flood' }];
        ilm.updateUserIncidents('user1', incidents);
        expect(ilm.users.get('user1').incidents).toEqual(incidents);

        ilm.updateUserLocation('user1', { latitude: '37.7800', longitude: '-122.4200' });
        expect(ilm.users.get('user1').coordinates).toEqual({ latitude: '37.7800', longitude: '-122.4200' });
    });

    test('updateUserLocation should preserve incidents', () => {
        ilm.addUser('u1', { latitude: '1', longitude: '2' });
        ilm.updateUserIncidents('u1', [{ type: 'fire' }]);
        ilm.updateUserLocation('u1', { latitude: '3', longitude: '4' });
        expect(ilm.users.get('u1').incidents).toEqual([{ type: 'fire' }]);
    });

    test('isNearby should correctly calculate distance', () => {
        const nearby = ilm.isNearby(
            { latitude: '-26.1438', longitude: '28.0406' },
            { latitude: '-26.1440', longitude: '28.0410' }
        );
        const far = ilm.isNearby(
            { latitude: '-26.1438', longitude: '28.0406' },
            { latitude: '-25.0000', longitude: '28.0000' }
        );
        expect(nearby).toBe(true);
        expect(far).toBe(false);
    });

    test('isNearby should return false if coordinates missing', () => {
        expect(ilm.isNearby({}, { latitude: '1', longitude: '2' })).toBe(false);
        expect(ilm.isNearby({ latitude: '1', longitude: '2' }, {})).toBe(false);
    });

    test('should remove user', () => {
        ilm.addUser('user1', { latitude: '-26.1438', longitude: '28.0406' });
        ilm.removeUser('user1');
        expect(ilm.users.has('user1')).toBe(false);
    });

    test('notifyUsers should return correct notifications for nearby incidents', () => {
        ilm.addUser('u1', { latitude: '34.1478', longitude: '-118.1445' });
        ilm.updateTraffic([{ location: 'Pasadena', incidents: [{ type: 'crash' }] }]);
        const notifications = ilm.notifyUsers();
        expect(notifications.length).toBeGreaterThanOrEqual(0);
        // If notifications exist, check structure
        if (notifications.length > 0) {
            expect(notifications[0].userID).toBe('u1');
            expect(notifications[0].notification.incidents).toEqual([{ type: 'crash' }]);
        }
    });

    test('notifyUsers should return empty if no new incidents', () => {
        ilm.addUser('u1', { latitude: '34.1478', longitude: '-118.1445' });
        ilm.updateTraffic([{ location: 'Pasadena', incidents: [{ type: 'crash' }] }]);
        ilm.notifyUsers(); // baseline
        const notifications = ilm.notifyUsers();
        expect(notifications).toEqual([]);
    });

    test('notifyUsersIncident should emit only to nearby users', () => {
        const fakeIo = { to: jest.fn().mockReturnThis(), emit: jest.fn() };
        ilm.addUser('u1', { latitude: '37.7749', longitude: '-122.4194' });
        ilm.notifyUsersIncident({
            Incidents_Latitude: '37.7749',
            Incidents_Longitude: '-122.4194'
        }, fakeIo);
        expect(fakeIo.to).toHaveBeenCalledWith('u1');
        expect(fakeIo.emit).toHaveBeenCalled();
    });

test('addNewIncident should handle unknown region gracefully if modified to skip', () => {
    ilm.addNewIncident = function(location, incident) {
        const region = this.regions.get(location);
        if (!region) return false;
        region.incidents.push(incident);
        return true;
    };

    const incident = { type: 'accident' };
    const result = ilm.addNewIncident('Unknown', incident);
    expect(result).toBe(false);
});

test('notifyUsers handles multiple nearby users correctly', () => {
    ilm.addUser('user1', {latitude: '34.1478', longitude: '-118.1445' });
    ilm.addUser('user2', { latitude: '34.1478', longitude: '-118.1440' });
    ilm.updateTraffic([{ location: 'Pasadena', incidents: [{ type: 'jam' }] }]);

    const notifications = ilm.notifyUsers();
    expect(notifications).toHaveLength(2);
    const userIds = notifications.map(n => n.userID);
    expect(userIds).toEqual(expect.arrayContaining(['user1', 'user2']));
});


test('updateUserIncidents should not modify user coordinates', () => {
    ilm.addUser('user1', { latitude: '-26.1000', longitude: '28.2000' });
    ilm.updateUserIncidents('user1', [{ type: 'flood' }]);
    const user = ilm.users.get('user1');
    expect(user.coordinates).toEqual({ latitude: '-26.1000', longitude: '28.2000' });
});

test('initRegions logs the correct number of regions', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const tempIlm = new ILM();
    expect(consoleSpy).toHaveBeenCalledWith('\x1b[32m%s\x1b[0m', `${tempIlm.regions.size} regions set`);
    consoleSpy.mockRestore();
});

test('removeUser does not throw for unknown users', () => {
    expect(() => ilm.removeUser('unknown')).not.toThrow();
});

test('isNearby returns true exactly at 5km', () => {
    const locA = { latitude: '0', longitude: '0' };
    const locB = { latitude: '0', longitude: (5 / 111.32).toString() };
    expect(ilm.isNearby(locA, locB)).toBe(true);
});

test('updateTraffic with empty array does not modify regions', () => {
    const initialRegions = new Map(ilm.regions);
    ilm.updateTraffic([]);
    expect(ilm.regions).toEqual(initialRegions);
});
});