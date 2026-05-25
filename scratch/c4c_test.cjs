const dotenv = require('dotenv');
const fetch = require('node-fetch');

dotenv.config();

const sapBaseUrl = process.env.SAP_BASE_URL || 'https://my361897.crm.ondemand.com/sap/c4c/odata/v1/c4codataapi';
const authString = Buffer.from(`${process.env.SAP_USER}:${process.env.SAP_PASSWORD}`).toString('base64');
const ticketId = '1266020'; // From screenshot

async function run() {
    try {
        console.log(`Querying C4C for ticket: ${ticketId}`);
        const response = await fetch(`${sapBaseUrl}/ServiceRequestCollection?$filter=ID eq '${ticketId}'&$expand=ServiceRequestParty`, {
            headers: {
                'Authorization': `Basic ${authString}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            console.log('Error:', response.status, response.statusText);
            return;
        }

        const data = await response.json();
        const results = data.d.results;
        
        if (results.length === 0) {
            console.log('Ticket not found');
            return;
        }

        const ticket = results[0];
        console.log('--- Ticket Info ---');
        console.log('ID:', ticket.ID);
        console.log('Status:', ticket.ServiceRequestLifeCycleStatusCodeText);
        console.log('Processor (Main):', ticket.Processor);
        console.log('ProcessorName (Main):', ticket.ProcessorName);
        console.log('ServiceTechnician (Main):', ticket.ServiceTechnician);
        console.log('ServiceTechnicianName (Main):', ticket.ServiceTechnicianName);
        
        console.log('\n--- Parties ---');
        if (ticket.ServiceRequestParty && ticket.ServiceRequestParty.results) {
            ticket.ServiceRequestParty.results.forEach(party => {
                console.log(`Role: ${party.RoleCode} (${party.RoleCategoryCodeText}) - Name: ${party.PartyName}`);
            });
        } else {
            console.log('No parties found or expand failed.');
        }

    } catch (e) {
        console.error('Exception:', e);
    }
}

run();
