const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testPut() {
  // Try logging in to get a cookie
  let cookie = '';
  try {
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'test@example.com',
      password: 'password123'
    });
    cookie = loginRes.headers['set-cookie'] ? loginRes.headers['set-cookie'][0] : '';
    console.log('Login successful');
  } catch(e) {
    console.log('Login failed, registering a user...');
    try {
      const regRes = await axios.post('http://localhost:5000/api/auth/register', {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '21111111',
        password: 'password123'
      });
      cookie = regRes.headers['set-cookie'] ? regRes.headers['set-cookie'][0] : '';
      console.log('Registration successful');
    } catch(err) {
      console.error('Registration failed', err.response?.data);
      return;
    }
  }

  // Update profile
  try {
    const form = new FormData();
    form.append('firstName', 'TestUpdated');
    form.append('lastName', 'UserUpdated');
    form.append('location', JSON.stringify({ governorate: 'Tunis', city: 'Tunis City' }));
    
    console.log('Sending PUT request...');
    const res = await axios.put('http://localhost:5000/api/users/profile', form, {
      headers: {
        ...form.getHeaders(),
        Cookie: cookie
      }
    });
    console.log('Response:', res.data);
  } catch(err) {
    console.error('PUT Error:', err.response?.data || err.message);
  }
}
testPut();
