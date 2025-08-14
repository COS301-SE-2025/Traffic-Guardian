const axios = require('axios');
const artifacts = require('./artifacts.json');
const Seeding = require('./Seeding.json');
const config = require('./testConfig');
const yeah = Seeding.hmmmm;

// Increase the default timeout for all tests to handle CI/CD network latency
jest.setTimeout(60000);

// API base URL from config
const API_BASE_URL = config.apiBaseUrl;
describe('User endpoints', ()=>{

    test('Login User', async ()=>{
        const payload = artifacts[1];
        const response = await axios.post(`http://localhost:5000/api/auth/login`, payload, {
            headers: {
            "Content-Type": "application/json",
            "X-API-KEY": yeah
            }
        });

        //expect(response.data).toMatchObject(seeding[0]);
        expect(response.status).toBe(200);
    }, 60000); // Increased timeout to 60 seconds for CI/CD
    
    test('Get User preferences', async ()=>{
        const response = await axios.get(`http://localhost:5000/api/user/preferences`, {
        headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': yeah
            }
        });


        //expect(response.data).toMatchObject(seeding[1]);
        expect(response.status).toBe(200);
    }, 30000); // Increased timeout to 30 seconds

    test('Update user preferences', async ()=>{
        const payload = artifacts[2];
        const response = await axios.put(`http://localhost:5000/api/user/preferences`,payload ,{
        headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': yeah
            }
        });
// 
        //expect(response.data).toMatchObject(seeding[0]);
        expect(response.status).toBe(200);
    }, 30000); // Increased timeout to 30 seconds
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
    }, 30000); // Increased timeout to 30 seconds


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
    }, 30000); // Increased timeout to 30 seconds
});

