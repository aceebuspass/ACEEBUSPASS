const { MongoClient } = require('mongodb');
require('dotenv').config({ path: 'e:/E-PASS/.env' });

async function enableCancellations() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('ebuspass');
    const col = db.collection('system_settings');
    
    await col.updateOne(
      { key: 'cancellations_enabled' },
      { $set: { key: 'cancellations_enabled', value: '1', updated_at: new Date().toISOString() } },
      { upsert: true }
    );
    
    const check = await col.findOne({ key: 'cancellations_enabled' });
    console.log('Setting after update:', check);
    console.log('Cancellations ENABLED in DB successfully!');
  } finally {
    await client.close();
  }
}

enableCancellations().catch(console.error);
