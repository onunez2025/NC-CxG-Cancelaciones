const { fsmApiService } = require('./dist/services/fsmApiService.js');
const dotenv = require('dotenv');

dotenv.config();

async function run() {
    try {
        console.log('Testing fsmApiService with ticket 1283338...');
        const map = await fsmApiService.getTechniciansForTickets(['1283338']);
        console.log('Result:', map);
    } catch (e) {
        console.error('Error:', e);
    }
}
run();
