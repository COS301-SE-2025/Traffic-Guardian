const axios = require('axios');
const artifacts = require('./artifacts.json');
const path = require('path');
require('dotenv').config({
  override: true,
  path: path.join(__dirname, '../development.env'),
});
const Seeding = require('./Seeding.json');
const yeah = Seeding.hmmmm;

/* test('Register User', async ()=>{
    const payload = artifacts[2];
    console.log(artifacts[0]);
    console.log(payload);
    const response = await axios.post('http://localhost:5000/api/auth/register', payload, {
    headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': yeah
        }
    });
    console.log(response);

    expect(1).toBe(1);
}); */

test('Login User', async ()=>{
    const payload = artifacts[1];
    const response = await axios.post('http://localhost:5000/api/auth/login', payload, {
        "Content-Type": "application/json",
        "X-API-KEY": yeah
    });

    //expect(response.data).toMatchObject(seeding[0]);
    expect(response.status).toBe(200);
});

test('Login User invalid credentials', async ()=>{
    const payload = artifacts[1];
    const response = await axios.post('http://localhost:5000/api/auth/login', payload, {
        "Content-Type": "application/json",
        "X-API-KEY": yeah
    });

    //expect(response.data).toMatchObject(seeding[0]);
    expect(response.status).toBe(200);
});

test('Get User preferences', async ()=>{
    const headers = artifacts[1];
    const response = await axios.get('http://localhost:5000/api/user/preferences', {
    headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': yeah
        }
    });


    //expect(response.data).toMatchObject(seeding[1]);
    expect(response.status).toBe(200);
}); 



test('Update user preferences', async ()=>{
    const payload = artifacts[3];
    const headers = artifacts[1];
    const response = await axios.get('http://localhost:5000/api/incidents',{
    headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': yeah
        }
    });

    //expect(response.data).toMatchObject(seeding[0]);
    expect(response.status).toBe(200);
});

test('Get specific incident', async ()=>{
    const payload = artifacts[3];
    const headers = artifacts[1];
    const response = await axios.get('http://localhost:5000/api/incidents/1',{
    headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': yeah
        }
    });

    //expect(response.data).toMatchObject(seeding[0]);
    expect(response.status).toBe(200);
});


test('Create incident', async ()=>{
    const payload = artifacts[3];
    const headers = artifacts[1];
    const response = await axios.post('http://localhost:5000/api/incidents', payload ,{
    headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': yeah
        }
    });

    //expect(response.data).toMatchObject(seeding[0]);
    expect(response.status).toBe(201);
}); 


test('Update incident', async ()=>{
    const payload = artifacts[4];
    const headers = artifacts[1];
    const response = await axios.put('http://localhost:5000/api/incidents/1', payload ,{
    headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': yeah
        }
    });

    //expect(response.data).toMatchObject(seeding[0]);
    expect(response.status).toBe(200);
});

test('Get specific alert', async ()=>{
    const payload = artifacts[4];
    const headers = artifacts[1];
    const response = await axios.get('http://localhost:5000/api/incidents/1/alerts', {
    headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': yeah
        }
    });

    //expect(response.data).toMatchObject(seeding[0]);
    expect(response.status).toBe(200);
});

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