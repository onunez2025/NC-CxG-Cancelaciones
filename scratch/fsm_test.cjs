const fetch = require('node-fetch');

const clientId = 'b68e0bb1-e741-4ace-94da-56477815389f';
const clientSecret = '36cab74d-cf61-491a-b953-a63b4fcbd7cf';
const tokenUrl = 'https://eu.coresuite.com/api/oauth2/v1/token';
const queryUrl = 'https://us.coresuite.com/api/query/v1?account=sole.com_T1&company=sole_prd_c4&dtos=ServiceCall.20;Activity.20;Person.20';
const account = 'sole.com_T1';
const company = 'sole_prd_c4';

const ticketId = '1266020';

async function run() {
    try {
        console.log('Fetching token from EU...');
        const authHeader = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        let tokenRes = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        });

        let tokenData;
        if (!tokenRes.ok) {
            console.log('Trying token from US...');
            tokenRes = await fetch('https://us.coresuite.com/api/oauth2/v1/token', {
                method: 'POST',
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: 'grant_type=client_credentials'
            });
            if (!tokenRes.ok) {
                console.error('Failed to get token from US:', tokenRes.status, await tokenRes.text());
                return;
            }
            tokenData = await tokenRes.json();
        } else {
            tokenData = await tokenRes.json();
        }

        const accessToken = tokenData.access_token;
        console.log('Token acquired. Running query for ServiceCall...');

        const queryReqParams = {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Client-ID': 'Postman',
                'X-Client-Version': '1.0',
                'X-Account-Name': account,
                'X-Company-Name': company
            }
        };

        const queryRes = await fetch(queryUrl, {
            ...queryReqParams,
            body: JSON.stringify({
                query: `SELECT it.id, it.code, it.subject FROM ServiceCall it WHERE it.code LIKE '%${ticketId}%'`
            })
        });

        if (!queryRes.ok) {
            console.error('Query failed:', queryRes.status, await queryRes.text());
            return;
        }

        const queryData = await queryRes.json();
        console.log('ServiceCall Results:', JSON.stringify(queryData, null, 2));

        console.log('Running query for Activity...');
        const actRes = await fetch(queryUrl, {
            ...queryReqParams,
            body: JSON.stringify({
                query: `SELECT it.id, it.code, it.subject, it.responsibles FROM Activity it WHERE it.code LIKE '%${ticketId}%' OR it.subject LIKE '%${ticketId}%'`
            })
        });

        const actData = await actRes.json();
        console.log('Activity Results:', JSON.stringify(actData, null, 2));
        
        if (actData.data && actData.data.length > 0) {
             const personId = actData.data[0].assignedPerson || (actData.data[0].responsibles && actData.data[0].responsibles[0]);
             if (personId) {
                  const personRes = await fetch(queryUrl, {
                      ...queryReqParams,
                      body: JSON.stringify({
                          query: `SELECT it.id, it.firstName, it.lastName FROM Person it WHERE it.id = '${personId}'`
                      })
                  });
                  const personData = await personRes.json();
                  console.log('Person Results:', JSON.stringify(personData, null, 2));
             }
        }

    } catch (e) {
        console.error('Exception:', e);
    }
}

run();
