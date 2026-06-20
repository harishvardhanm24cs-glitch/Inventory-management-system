const port = process.env.PORT || 5000;
const baseURL = `http://localhost:${port}/api`;

async function runTests() {
  const email = `test_ai_predict_${Date.now()}@example.com`;
  const password = 'TestPassword123';
  const name = 'AI Predict Tester';
  
  const createdMaterialIds = [];
  let authHeaders = {};
  let token = null;

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
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    console.log('=== Step 2: Creating Test Material ===');
    const barcode = `BAR-AI-${Date.now()}`;
    const materialName = `AI Paint Material ${Date.now()}`;
    console.log(`Creating material: ${materialName}...`);
    const matRes = await fetch(`${baseURL}/materials`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        barcode: barcode,
        material_name: materialName,
        quantity: 100.00,
        threshold_limit: 20.00,
        unit: 'KG',
        batch_number: 'B-AI-TEST'
      })
    });
    const matData = await matRes.json();
    if (!matRes.ok) throw new Error(`Failed to create Material: ${JSON.stringify(matData)}`);
    const materialId = matData.material.id;
    createdMaterialIds.push(materialId);
    console.log(`Material created with ID: ${materialId}\n`);

    console.log('=== Step 3: Simulating Usage (Outward Transactions) ===');
    // Transaction 1: 10 KG Outward
    console.log('Posting outward transaction 1: 10 KG...');
    const tx1Res = await fetch(`${baseURL}/materials/${materialId}/stock`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        transaction_type: 'outward',
        quantity: 10.00
      })
    });
    if (!tx1Res.ok) throw new Error(`TX1 failed: ${await tx1Res.text()}`);

    // Transaction 2: 10 KG Outward
    console.log('Posting outward transaction 2: 10 KG...');
    const tx2Res = await fetch(`${baseURL}/materials/${materialId}/stock`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        transaction_type: 'outward',
        quantity: 10.00
      })
    });
    if (!tx2Res.ok) throw new Error(`TX2 failed: ${await tx2Res.text()}`);

    console.log('Simulated outward usage successfully.\n');

    console.log('=== Step 4: Fetching Predictions ===');
    const predictRes = await fetch(`${baseURL}/ai/predictions`, {
      headers: authHeaders
    });
    const predictData = await predictRes.json();
    
    console.log('Response Status:', predictRes.status);
    console.log('Predictions Response:', JSON.stringify(predictData, null, 2));

    if (predictRes.ok && predictData.status === 'success') {
      const targetPredict = predictData.data.find(p => p.material_name === materialName);
      if (targetPredict) {
        console.log('\n=== Calculation Verification ===');
        console.log('Material:', targetPredict.material_name);
        console.log('Current Stock (Expected 80):', targetPredict.current_stock);
        console.log('Threshold (Expected 20):', targetPredict.threshold_limit);
        console.log('Avg Daily Usage (Expected 20):', targetPredict.avg_daily_usage);
        console.log('Days Until Threshold (Expected 3):', targetPredict.days_until_threshold);
        console.log('Risk Level (Expected MEDIUM):', targetPredict.risk_level);
        
        if (targetPredict.current_stock === 80 && 
            targetPredict.avg_daily_usage === 20 && 
            targetPredict.days_until_threshold === 3 && 
            targetPredict.risk_level === 'MEDIUM') {
          console.log('\n✓ AI Stock Prediction logic verified successfully! All values match expected forecasts.');
        } else {
          console.error('\n✗ Calculation mismatch occurred.');
        }
      } else {
        console.error(`\n✗ Created material ${materialName} was not found in predictions list.`);
      }
    } else {
      throw new Error(`Failed to retrieve predictions: ${JSON.stringify(predictData)}`);
    }

  } catch (err) {
    console.error('Test run failed with error:', err);
    process.exit(1);
  } finally {
    if (token) {
      console.log('\n=== Cleanup: Deleting Test Material ===');
      for (const matId of createdMaterialIds) {
        try {
          console.log(`Deleting Material ID: ${matId}...`);
          await fetch(`${baseURL}/materials/${matId}`, { method: 'DELETE', headers: authHeaders });
        } catch (e) {
          console.error(`Cleanup failed for material ${matId}:`, e.message);
        }
      }
    }
  }
}

runTests();
