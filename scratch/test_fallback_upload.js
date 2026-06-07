const fs = require('fs');
const path = require('path');

async function testFallbackUpload() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ZTM0OTdlODUxZDVhYTIyMTYwZDZlMCIsImlhdCI6MTc3NjUxNDg1MiwiZXhwIjoxNzc5MTA2ODUyfQ.eYmZ6yYqyB-zrzQ83JpjKBCcozPWCaHH-dxeDbNNwDc';
  const baseUrl = 'http://localhost:5000/api/users/profile';

  console.log('--- Starting Fallback Upload Test ---');

  const formData = new FormData();
  const dummyImage = new Blob(['fake-image-data-' + Date.now()], { type: 'image/png' });
  formData.append('photo', dummyImage, 'test_photo.png');
  formData.append('bio', 'Updated bio via fallback test');

  try {
    const response = await fetch(`${baseUrl}?token=${token}`, {
      method: 'PUT',
      body: formData
    });

    const status = response.status;
    const data = await response.json();

    console.log('Status Code:', status);
    console.log('Response Body:', JSON.stringify(data, null, 2));

    if (data.success && data.user.profilePhoto.startsWith('/uploads')) {
      console.log('✅ SUCCESS: Profile updated using local fallback!');
      
      const localPath = data.user.profilePhoto;
      const fullPath = path.join(__dirname, '..', localPath);
      if (fs.existsSync(fullPath)) {
        console.log(`✅ SUCCESS: File truly exists at ${fullPath}`);
      } else {
        console.log(`❌ ERROR: File reported at ${localPath} but not found at ${fullPath}`);
      }
    } else {
      console.log('❌ FAILED: Response did not indicate local fallback success.');
    }

  } catch (err) {
    console.error('❌ ERROR during test:', err.message);
  }
}

testFallbackUpload();
