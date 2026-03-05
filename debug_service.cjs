const { getRelationalSolpedData } = require('./server/services/crossReferenceEngineRelational.cjs');
require('dotenv').config();

async function test() {
    console.log("DB_SERVER:", process.env.DB_SERVER);
    console.log("DB_DATABASE:", process.env.DB_DATABASE);
    try {
        const data = await getRelationalSolpedData();
        console.log("Total Solpeds found by Service:", data.length);
        if (data.length > 0) {
            console.log("Sample Solped:", data[0].pr_number, data[0].description);
        }
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

test();
