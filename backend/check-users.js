const { MongoClient } = require('mongodb');
require('dotenv').config({ path: 'e:/E-PASS/.env' });

async function checkUsers() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('ebuspass');
    const users = await db.collection('admin_users').find({}).toArray();
    console.log(JSON.stringify(users, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

checkUsers();
