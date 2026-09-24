const { MongoClient } = require('mongodb');
require('dotenv').config({ path: 'e:/E-PASS/.env' });

async function checkCollections() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('ebuspass');
    
    console.log('--- checking "applications" ---');
    const apps = await db.collection('applications').find({}).toArray();
    console.log(JSON.stringify(apps, null, 2));

    console.log('\n--- checking "student_applications" ---');
    const s_apps = await db.collection('student_applications').find({}).toArray();
    console.log(JSON.stringify(s_apps, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

checkCollections();
