const { MongoClient } = require('mongodb');
require('dotenv').config({ path: 'e:/E-PASS/.env' });

async function fixDB() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('ebuspass');
    
    // Check bus_routes
    const bus15 = await db.collection('bus_routes').findOne({ bus_number: '15' });
    if (!bus15) {
        console.log('Adding Bus 15 to bus_routes...');
        await db.collection('bus_routes').insertOne({
            bus_number: '15',
            driver_name: 'Default',
            capacity: '60',
            route: 'Default Route'
        });
    } else {
        console.log('Bus 15 already exists.');
    }

    // Check application collections
    const appCount = await db.collection('applications').countDocuments();
    const sAppCount = await db.collection('student_applications').countDocuments();
    console.log(`applications count: ${appCount}`);
    console.log(`student_applications count: ${sAppCount}`);

    if (appCount > 0 && sAppCount === 0) {
        console.log('Migrating applications -> student_applications...');
        const apps = await db.collection('applications').find({}).toArray();
        await db.collection('student_applications').insertMany(apps);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

fixDB();
