const axios = require('axios');

async function testSecurity() {
    const API_URL = 'http://localhost:3000/api';

    console.log('🔒 Testing Security Protocols...');
    console.log('===============================');

    // 1. Test GET Request (Should be allowed for everyone)
    try {
        console.log('\n[TEST 1] GET Request (Public Access)...');
        const res = await axios.get(`${API_URL}/sensors`);
        console.log('✅ Success: GET request allowed (Status:', res.status, ')');
    } catch (error) {
        console.log('❌ Failed:', error.response ? error.response.status : error.message);
    }

    // 2. Test POST Request (Should be BLOCKED in Prod if not whitelisted)
    try {
        console.log('\n[TEST 2] POST Request (Restricted Access)...');
        const res = await axios.post(`${API_URL}/sensors`, {
            sensor_id: 'TEST1',
            sensor_type: 'temperature',
            value: 25.5,
            unit: 'C',
            status: 'active'
        });

        console.log('⚠️  Result: POST request ACCEPTED (Status:', res.status, ')');
        console.log('   (This is expected in DEV mode, but should fail in PROD unless whitelisted)');
    } catch (error) {
        if (error.response && error.response.status === 403) {
            console.log('✅ Success: POST request BLOCKED (403 Forbidden)');
            console.log('   Message:', error.response.data.message);
        } else {
            console.log('❌ Failed with unexpected error:', error.response ? error.response.status : error.message);
        }
    }
}

testSecurity();
