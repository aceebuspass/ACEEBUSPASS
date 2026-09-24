const { MongoClient } = require('mongodb');
require('dotenv').config({ path: 'e:/E-PASS/.env' });

const SEED_COLLEGES = [
  { name: 'Adhiyamaan college of engineering', departments: ['CSE','EEE','ECE','MECH','CIVIL','IT','AIDS','AIML'] },
  { name: 'Adhiyamaan polytechnic college', departments: ['MECH','EEE','CIVIL','ECE','CSE'] },
  { name: 'M.G.R college', departments: ['CSE','EEE','ECE','MECH','CIVIL'] },
  { name: 'St.Peters medical college and hospital', departments: ['MBBS','Nursing','Pharmacy','Physiotherapy','Radiology'] },
];

async function seedColleges() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('ebuspass');
    const col = db.collection('colleges');

    for (const college of SEED_COLLEGES) {
      const existing = await col.findOne({ name: { $regex: new RegExp(`^${college.name}$`, 'i') } });
      if (!existing) {
        await col.insertOne({ ...college, createdAt: new Date().toISOString() });
        console.log(`✅ Added: ${college.name}`);
      } else {
        console.log(`⏭ Already exists: ${college.name}`);
      }
    }
    console.log('\nDone!');
  } finally {
    await client.close();
  }
}
seedColleges().catch(console.error);
