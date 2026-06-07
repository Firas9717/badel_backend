async function testRegistration() {
  const payload = {
    firstName: "Firas",
    lastName: "Sfaxi",
    email: `firas.test.${Date.now()}@example.com`,
    phone: `2${Math.floor(Math.random() * 90000000 + 10000000).toString().substring(0, 7)}`,
    password: "Pass1234",
    passwordConfirm: "Pass1234",
    location: {
      governorate: "Tunis",
      city: "Tunis City"
    }
  };

  try {
    console.log('Sending registration request...');
    const response = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response Body:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Registration Failed:', err.message);
  }
}

testRegistration();
