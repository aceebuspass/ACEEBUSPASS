const { MongoClient } = require('mongodb');
require('dotenv').config({ path: 'e:/E-PASS/backend/.env' });

async function check() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI is not defined in .env');
    console.log('Connecting to Mongo...');
    const client = await MongoClient.connect(uri);
    const db = client.db('ebuspass');
    const apps = db.collection('student_applications');
    console.log('Searching for student 6176AC22UCS100...');
    const student = await apps.findOne({ $or: [{ regNo: '6176AC22UCS100' }, { reg_no: '6176AC22UCS100' }] });
    if (student) {
      console.log('Student record found:');
      console.log('Payment Status:', student.payment_status);
      console.log('Status:', student.status);
      console.log('Pass Approved:', student.pass_approved);
      console.log('Pass Number:', student.passNumber);
    } else {
      console.log('Student record NOT found.');
    }
    await client.close();
  } catch (err) {
    console.error('ERROR:', err.message);
  }
}

check();
