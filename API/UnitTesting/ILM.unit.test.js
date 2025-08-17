const { ILM } = require("../src/IncidentLocationMapping/IncidentLocationMapping");

describe('Incident Location Mapping unit tests', () => {
    let ilm;

    beforeEach(() => {
        ilm = new ILM();
    });

    test('should initialize regions correctly', () => {
        expect(ilm.regions.size).toBe(ilm.regionNames.length);
        const rosebank = ilm.regions.get('Rosebank');
        expect(rosebank.location).toBe('Rosebank');
        expect(rosebank.coordinates).toEqual({
            latitude: '-26.1438',
            longitude: '28.0406'
        });
        expect(rosebank.incidents).toEqual([]);
    });

    test('should add a new incident to a region', () => {
        const incident = { type: 'accident', severity: 'high' };
        ilm.addNewIncident('Rosebank', incident);
        expect(ilm.regions.get('Rosebank').incidents).toContain(incident);
    });

    test('addNewIncident should handle unknown region gracefully', () => {
        expect(() => ilm.addNewIncident('Unknown', { type: 'test' })).toThrow();
    });

    test('should update traffic for multiple regions', () => {
        const trafficData = [
            { location: 'Rosebank', incidents: [{ type: 'jam' }] },
            { location: 'Sandton', incidents: [{ type: 'accident' }] }
        ];
        ilm.updateTraffic(trafficData);
        expect(ilm.regions.get('Rosebank').incidents).toEqual([{ type: 'jam' }]);
        expect(ilm.regions.get('Sandton').incidents).toEqual([{ type: 'accident' }]);
    });

    test('updateTraffic should skip unknown regions', () => {
        const trafficData = [
            { location: 'Rosebank', incidents: [{ type: 'jam' }] },
            { location: 'Nowhere', incidents: [{ type: 'ghost' }] }
        ];
        ilm.updateTraffic(trafficData);
        expect(ilm.regions.get('Rosebank').incidents).toEqual([{ type: 'jam' }]);
        expect(ilm.regions.has('Nowhere')).toBe(false);
    });

    test('should add and update users', () => {
        ilm.addUser('user1', { latitude: '-26.1438', longitude: '28.0406' });
        expect(ilm.users.has('user1')).toBe(true);

        const incidents = [{ type: 'flood' }];
        ilm.updateUserIncidents('user1', incidents);
        expect(ilm.users.get('user1').incidents).toEqual(incidents);

        ilm.updateUserLocation('user1', { latitude: '-26.1500', longitude: '28.0500' });
        expect(ilm.users.get('user1').coordinates).toEqual({ latitude: '-26.1500', longitude: '28.0500' });
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
        ilm.addUser('u1', { latitude: '-26.1438', longitude: '28.0406' });
        ilm.updateTraffic([{ location: 'Rosebank', incidents: [{ type: 'crash' }] }]);
        const notifications = ilm.notifyUsers();
        expect(notifications.length).toBeGreaterThan(0);
        expect(notifications[0].userID).toBe('u1');
        expect(notifications[0].notification.incidents).toEqual([{ type: 'crash' }]);
    });

    test('notifyUsers should return empty if no new incidents', () => {
        ilm.addUser('u1', { latitude: '-26.1438', longitude: '28.0406' });
        // First update to set baseline
        ilm.updateTraffic([{ location: 'Rosebank', incidents: [{ type: 'crash' }] }]);
        ilm.notifyUsers(); // baseline
        // Same incidents again → no new notifications
        const notifications = ilm.notifyUsers();
        expect(notifications).toEqual([]);
    });

    test('notifyUsersIncident should emit only to nearby users', () => {
        const fakeIo = { to: jest.fn().mockReturnThis(), emit: jest.fn() };
        ilm.addUser('u1', { latitude: '-26.1438', longitude: '28.0406' });
        ilm.notifyUsersIncident({
            Incidents_Latitude: '-26.1438',
            Incidents_Longitude: '28.0406'
        }, fakeIo);
        expect(fakeIo.to).toHaveBeenCalledWith('u1');
        expect(fakeIo.emit).toHaveBeenCalled();
    });

    test('emptyObject should work correctly', () => {
        expect(ilm.emptyObject({})).toBe(true);
        expect(ilm.emptyObject({ key: 1 })).toBe(false);
    });
});