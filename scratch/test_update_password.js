async function testUpdatePasswordFlow() {
  const baseUrl = 'http://localhost:5000/api/auth';
  const testUser = {
    firstName: "Test",
    lastName: "User",
    email: `test.update.${Date.now()}@badel.tn`,
    phone: `9${Math.floor(Math.random() * 9000000 + 1000000)}`,
    password: "InitialPassword123",
    passwordConfirm: "InitialPassword123",
    location: {
      governorate: "Tunis",
      city: "Tunis",
      coordinates: [10.1815, 36.8065]
    }
  };

  try {
    // 1. Register
    console.log('--- 1. Registering new user ---');
    const regRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    const regData = await regRes.json();
    if (!regData.success) throw new Error(`Registration failed: ${regData.message}`);
    const token = regData.token;
    console.log('✅ Registration successful.');

    // 2. Update Password
    console.log('--- 2. Updating password ---');
    const updateRes = await fetch(`${baseUrl}/update-password?token=${token}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: "InitialPassword123",
        newPassword: "NewSecurePassword456",
        newPasswordConfirm: "NewSecurePassword456"
      })
    });
    const updateData = await updateRes.json();
    if (!updateData.success) throw new Error(`Update password failed: ${updateData.message}`);
    console.log('✅ Password updated successfully.');

    // 3. Verify with Login
    console.log('--- 3. Verifying with Login (using NEW password) ---');
    const loginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: "NewSecurePassword456"
      })
    });
    const loginData = await loginRes.json();
    if (loginData.success) {
      console.log('✅ Login successful with NEW password!');
      console.log('🚀 THE FUNCTION WORKS PERFECTLY.');
    } else {
      console.log('❌ Login failed with new password.');
    }

  } catch (err) {
    console.error('❌ Test failed:', err.message);
  }
}

testUpdatePasswordFlow();
