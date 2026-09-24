import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db('ebuspass');

const fees = await db.collection('route_fees').find({}).toArray();

for (const fee of fees) {
  console.log('---ROUTE FEE---');
  console.log('route:', fee.route);
  console.log('from:', fee.from);
  console.log('to:', fee.to);
  console.log('fee_amount:', fee.fee_amount, '(type:', typeof fee.fee_amount, ')');
  console.log('is_active:', fee.is_active, '(type:', typeof fee.is_active, ')');
  console.log('description:', fee.description);

  // Fix: update is_active and fee_amount types
  await db.collection('route_fees').updateOne(
    { _id: fee._id },
    {
      $set: {
        is_active: 1,
        fee_amount: Number(fee.fee_amount),
      }
    }
  );
  console.log('✅ Fixed is_active -> 1 and fee_amount ->', Number(fee.fee_amount));
}

await client.close();
console.log('\nDone! All route fees fixed.');
