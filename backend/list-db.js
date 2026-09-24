const { MongoClient } = require('mongodb');
require('dotenv').config({ path: 'e:/E-PASS/.env' });

async function listCollections() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('ebuspass');
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    for (const coll of collections) {
        const count = await db.collection(coll.name).countDocuments();
        console.log(`- ${coll.name}: ${count} documents`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

listCollections();
