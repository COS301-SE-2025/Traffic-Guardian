const { ILM } = require("../src/IncidentLocationMapping/IncidentLocationMapping");

describe('Incident Location Mapping unit tests' , ()=>{

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

    test('should update traffic for multiple regions', () => {
        const trafficData = [
            { location: 'Rosebank', incidents: [{ type: 'jam' }] },
            { location: 'Sandton', incidents: [{ type: 'accident' }] }
        ];
        ilm.updateTraffic(trafficData);
        expect(ilm.regions.get('Rosebank').incidents).toEqual([{ type: 'jam' }]);
        expect(ilm.regions.get('Sandton').incidents).toEqual([{ type: 'accident' }]);
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

    test('isNearby should correctly calculate distance', () => {
        const nearby = ilm.isNearby({ latitude: '-26.1438', longitude: '28.0406' }, { latitude: '-26.1440', longitude: '28.0410' });
        const far = ilm.isNearby({ latitude: '-26.1438', longitude: '28.0406' }, { latitude: '-25.0000', longitude: '28.0000' });
        expect(nearby).toBe(true);
        expect(far).toBe(false);
    });

    test('should remove user', () => {
        ilm.addUser('user1', { latitude: '-26.1438', longitude: '28.0406' });
        ilm.removeUser('user1');
        expect(ilm.users.has('user1')).toBe(false);
    });
})