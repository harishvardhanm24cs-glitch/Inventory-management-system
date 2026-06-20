const port = process.env.PORT || 5000;
const baseURL = `http://localhost:${port}/api`;

async function runTests() {
  const email = `test_reports_${Date.now()}@example.com`;
  const password = 'TestPassword123';
  const name = 'Reports API Tester';
  
  let authHeaders = {};
  let token = null;
  const uniqueFilename = `Test_Automation_Report_${Date.now()}.pdf`;

  try {
    console.log('=== Step 1: User Registration & Login ===');
    console.log(`Registering user: ${email}...`);
    const regRes = await fetch(`${baseURL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role: 'manager' })
    });
    if (!regRes.ok) {
      throw new Error(`Registration failed: ${await regRes.text()}`);
    }

    console.log('Logging in...');
    const loginRes = await fetch(`${baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const loginData = await loginRes.json();
    token = loginData.token;
    if (!token) throw new Error('Could not retrieve login token');
    console.log('Login successful.\n');

    authHeaders = {
      'Authorization': `Bearer ${token}`
    };

    console.log('=== Step 2: Uploading Mock PDF Report ===');
    // Generate a dummy PDF buffer
    const dummyPdfContent = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF';
    
    // We use FormData to build a multipart request
    const formData = new FormData();
    const blob = new Blob([dummyPdfContent], { type: 'application/pdf' });
    formData.append('report', blob, uniqueFilename);

    console.log(`Uploading file ${uniqueFilename}...`);
    const uploadRes = await fetch(`${baseURL}/reports/upload`, {
      method: 'POST',
      headers: {
        ...authHeaders
      },
      body: formData
    });

    const uploadData = await uploadRes.json();
    console.log('Upload Status:', uploadRes.status);
    console.log('Upload Response:', JSON.stringify(uploadData, null, 2));

    if (uploadRes.ok && uploadData.status === 'success' && uploadData.filename === uniqueFilename) {
      console.log('✓ Upload endpoint test PASSED\n');
    } else {
      throw new Error(`Upload endpoint FAILED: ${JSON.stringify(uploadData)}`);
    }

    console.log('=== Step 3: Fetching Reports List ===');
    const listRes = await fetch(`${baseURL}/reports`, {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      }
    });
    const listData = await listRes.json();
    console.log('List Status:', listRes.status);
    console.log('List Response Sample (Latest 3):', JSON.stringify(listData.data?.slice(0, 3), null, 2));

    const foundReport = (listData.data || []).find(r => r.filename === uniqueFilename);
    if (listRes.ok && listData.status === 'success' && foundReport) {
      console.log('✓ List reports endpoint test PASSED\n');
    } else {
      throw new Error(`List reports endpoint FAILED or uploaded report not in list.`);
    }

    console.log('=== Step 4: Deleting Stored Report ===');
    console.log(`Deleting file ${uniqueFilename}...`);
    const deleteRes = await fetch(`${baseURL}/reports/${uniqueFilename}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      }
    });
    const deleteData = await deleteRes.json();
    console.log('Delete Status:', deleteRes.status);
    console.log('Delete Response:', JSON.stringify(deleteData, null, 2));

    if (deleteRes.ok && deleteData.status === 'success') {
      console.log('✓ Delete report endpoint test PASSED\n');
    } else {
      throw new Error(`Delete report endpoint FAILED: ${JSON.stringify(deleteData)}`);
    }

    console.log('=== Step 5: Verify Deletion in List ===');
    const verifyRes = await fetch(`${baseURL}/reports`, {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      }
    });
    const verifyData = await verifyRes.json();
    const stillExists = (verifyData.data || []).some(r => r.filename === uniqueFilename);
    if (!stillExists) {
      console.log('✓ Disk file deletion list sync PASSED\n');
    } else {
      throw new Error('Report deletion check FAILED: file still shows up in list.');
    }

    console.log('=== ALL PDF REPORT SYSTEM API TESTS COMPLETED SUCCESSFULLY! ===');

  } catch (err) {
    console.error('Test run failed with error:', err);
    process.exit(1);
  }
}

runTests();
