const { MongoClient } = require('mongodb');
const fs = require('fs');
require('dotenv').config({ path: 'e:/E-PASS/.env' });

async function checkUsers() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('ebuspass');
    const users = await db.collection('admin_users').find({}).toArray();
    fs.writeFileSync('e:/E-PASS/users_plain.txt', JSON.stringify(users, null, 2));
    console.log('Done');
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

checkUsers();
