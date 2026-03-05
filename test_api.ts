import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

async function testEndpoint() {
    console.log("-> Autenticando as admin...");
    const loginRes = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: 'admin',
            password: 'admin123'
        })
    });
    const loginData: any = await loginRes.json();
    if (!loginData.token) {
        console.error("Login falló:", loginData);
        process.exit(1);
    }
    const token = loginData.token;

    // Payload ME2K
    const payload = {
        id: 'test_1234_' + Date.now(),
        transaction_type: 'ME2K',
        upload_date: new Date().toISOString(),
        uploaded_by: 'admin',
        data: [{
            po_number: '123456',
            cost_center: 'MT050002',
            order_value: 100
        }]
    };

    console.log("-> Llamando a API de subida...");
    const res = await fetch('http://localhost:3001/api/sap/uploads', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(payload)
    });

    const body = await res.text();
    console.log("-> RESPONSE STATUS:", res.status);
    console.log("-> BODY:", body);
    process.exit(0);
}
testEndpoint();
