const axios = require('axios');
const artifacts = require('./artifacts.json');
const seeding = require('./Seeding.json');

/* test('Register User', async ()=>{
    const payload = artifacts[2];
    console.log(artifacts[0]);
    console.log(payload);
    const response = await axios.post('http://localhost:5000/api/auth/register', payload, artifacts[0]);
    console.log(response);

    expect(1).toBe(1);
}); */

test('Login User', async ()=>{
    const payload = artifacts[3];
    const response = await axios.post('http://localhost:5000/api/auth/login', payload, artifacts[0]);

    expect(response.data).toMatchObject(seeding[0]);
    expect(response.status).toBe(200);
});

test('Get User preferences', async ()=>{
    const payload = artifacts[3];
    const headers = artifacts[1];
    const response = await axios.get('http://localhost:5000/api/user/preferences', headers);

    expect(response.data).toMatchObject(seeding[1]);
    expect(response.status).toBe(200);
});


test('Update user preferences', async ()=>{
    const payload = artifacts[3];
    const headers = artifacts[1];
    const response = await axios.get('http://localhost:5000/api/incidents', headers);

    expect(response.data).toMatchObject(seeding[0]);
    expect(response.status).toBe(200);
});

