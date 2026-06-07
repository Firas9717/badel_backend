async function verifyFlexibleAuth() {
  const loginPayload = {
    email: "nouveau.utilisateur@badel.tn",
    password: "SecureP4ssword"
  };

  try {
    console.log('Logging in to get token...');
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginPayload)
    });
    const loginData = await loginRes.json();
    
    if (!loginData.success) {
      console.error('Login failed:', loginData.message);
      return;
    }

    const token = loginData.token;
    console.log('Token obtained. Testing /api/auth/me with query param token...');

    const meRes = await fetch(`http://localhost:5000/api/auth/me?token=${token}`);
    const meData = await meRes.json();

    console.log('Response Status:', meRes.status);
    console.log('Response Body:', JSON.stringify(meData, null, 2));

    if (meData.success) {
      console.log('✅ Success! Flexible auth works.');
    } else {
      console.log('❌ Failure. Flexible auth did not work.');
    }
  } catch (err) {
    console.error('Verification failed:', err.message);
  }
}

verifyFlexibleAuth();
