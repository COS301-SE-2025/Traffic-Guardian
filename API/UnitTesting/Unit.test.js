const axios = require('axios');
const artifacts = require('./artifacts.json');
const Seeding = require('./Seeding.json');
const config = require('./testConfig');
const yeah = Seeding.hmmmm;

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
    });
    
    test('Get User preferences', async ()=>{
        const response = await axios.get(`${API_BASE_URL}/api/user/preferences`, {
        headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': yeah
            }
        });


        //expect(response.data).toMatchObject(seeding[1]);
        expect(response.status).toBe(200);
    }); 

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
    });
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
    });


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
    });
});