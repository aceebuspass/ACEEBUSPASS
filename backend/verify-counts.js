const path = require('path');
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function verifyCounts() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('ebuspass');
    
    const count = await db.collection('student_applications').countDocuments({
        $or: [
            { busNumber: '15' },
            { bus_number: '15' }
        ],
        status: { $nin: ['rejected', 'cancelled'] }
    });
    console.log(`Verified count for Bus 15 in student_applications: ${count}`);

    const bus = await db.collection('bus_routes').findOne({ bus_number: '15' });
    console.log(`Bus 15 details: ${JSON.stringify(bus)}`);

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

verifyCounts();
