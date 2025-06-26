const axios = require('axios');
const artifacts = require('./artifacts.json');
const Seeding = require('./Seeding.json');
const config = require('./testConfig');
const yeah = Seeding.hmmmm;

// Increase the default timeout for all tests
jest.setTimeout(15000);

// API base URL from config
const API_BASE_URL = config.apiBaseUrl;
describe('User endpoints', ()=>{

    test('Login User', async ()=>{
        const payload = artifacts[1];
        const response = await axios.post(`${API_BASE_URL}/api/auth/login`, payload, {
            header: {
            "Content-Type": "application/json",
            "X-API-KEY": yeah
            }
        });

        //expect(response.data).toMatchObject(seeding[0]);
        expect(response.status).toBe(200);
    }, 15000); // Increased timeout to 15 seconds
    
    test('Get User preferences', async ()=>{
        const response = await axios.get(`${API_BASE_URL}/api/user/preferences`, {
        headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': yeah
            }
        });


        //expect(response.data).toMatchObject(seeding[1]);
        expect(response.status).toBe(200);
    }, 15000); // Increased timeout to 15 seconds

    test('Update user preferences', async ()=>{
        const payload = artifacts[2];
        const response = await axios.put(`${API_BASE_URL}/api/user/preferences`,payload ,{
        headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': yeah
            }
        });

        //expect(response.data).toMatchObject(seeding[0]);
        expect(response.status).toBe(200);
    }, 15000); // Increased timeout to 15 seconds
});

describe('Incident endpoints', ()=>{
    /*
     test('Create incident', async ()=>{
        const payload = artifacts[3];
        const response = await axios.post('http://localhost:5000/api/incidents', payload ,{
        headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': yeah
            }
        });

        //expect(response.data).toMatchObject(seeding[0]);
        expect(response.status).toBe(201);
    }); 
*/
    test('Get specific incident', async ()=>{
        const payload = artifacts[3];
        const response = await axios.get('http://localhost:5000/api/incidents/75',{
        headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': yeah
            }
        });

        //expect(response.data).toMatchObject(seeding[0]);
        expect(response.status).toBe(200);
    }, 15000); // Increased timeout to 15 seconds


    test('Update incident', async ()=>{
        const payload = artifacts[4];
        const response = await axios.put('http://localhost:5000/api/incidents/75', payload ,{
        headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': yeah
            }
        });

        //expect(response.data).toMatchObject(seeding[0]);
        expect(response.status).toBe(200);
    }, 15000); // Increased timeout to 15 seconds
});

/*
describe('Alerts endpoints', ()=>{
    test('Create alert', async ()=>{
        const payload = artifacts[5];
        const response = await axios.post('http://localhost:5000/api/alerts',payload, {
        headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': yeah
            }
        });

        //expect(response.data).toMatchObject(seeding[0]);
        expect(response.status).toBe(201);
    });

    test('Get specific alert', async ()=>{
        const payload = artifacts[4];
        const response = await axios.get('http://localhost:5000/api/incidents/1/alerts', {
        headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': yeah
            }
        });

        //expect(response.data).toMatchObject(seeding[0]);
        expect(response.status).toBe(200);
    });

    test('Update alert', async ()=>{
        const payload = artifacts[6];
        const response = await axios.put('http://localhost:5000/api/alerts/1/status',payload, {
        headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': yeah
            }
        });

        //expect(response.data).toMatchObject(seeding[0]);
        expect(response.status).toBe(200);
    });
    */
    /*
    test('Get all alerts', async ()=>{
        const payload = artifacts[6];
        const response = await axios.get('http://localhost:5000/api/user/alerts',{
        headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': yeah
            }
        });

        //expect(response.data).toMatchObject(seeding[0]);
        expect(response.status).toBe(200);
    });
});
*/