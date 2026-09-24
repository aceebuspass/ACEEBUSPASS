const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: 'e:/E-PASS/.env' });

async function checkPass() {
    const client = new MongoClient(process.env.MONGODB_URI);
    try {
        await client.connect();
        const db = client.db('ebuspass');
        const user = await db.collection('admin_users').findOne({ username: 'admin' });
        if (user) {
            const isMatch = await bcrypt.compare('Admin@ace', user.password);
            console.log(`Password 'Admin@ace' matches for 'admin': ${isMatch}`);
        } else {
            console.log('Admin user not found in DB');
        }
    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

checkPass();
