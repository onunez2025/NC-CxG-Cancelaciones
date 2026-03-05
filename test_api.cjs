const fs = require('fs');
async function test() {
    // 1. Login
    const loginRes = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'dmoncada', password: 'password123' }) // Using default seed credentials usually
    });
    const info = await loginRes.json();
    if (!info.token) {
        console.log('Login failed:', info);
        return;
    }

    // 2. Fetch tracking
    const trackRes = await fetch('http://localhost:3001/api/sap/cross-reference/tracking', {
        headers: { 'Authorization': 'Bearer ' + info.token }
    });
    const data = await trackRes.json();
    console.log(`Transactions from API: ${data.transactions?.length}`);
    fs.writeFileSync('api_response.json', JSON.stringify(data, null, 2));
}
test();
