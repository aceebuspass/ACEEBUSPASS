import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Razorpay from 'razorpay';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

console.log('RAZORPAY_KEY_ID:', keyId);
console.log('RAZORPAY_KEY_SECRET:', keySecret ? '***SET***' : 'NOT SET');

if (!keyId || !keySecret) {
  console.error('Keys not set');
  process.exit(1);
}

const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

try {
  console.log('\nCreating test order for ₹500...');
  const order = await razorpay.orders.create({
    amount: 500 * 100, // paise
    currency: 'INR',
    receipt: 'test_receipt_001'
  });
  console.log('\n✅ ORDER CREATED SUCCESSFULLY:');
  console.log('  Order ID:', order.id);
  console.log('  Amount:', order.amount, 'paise = ₹' + (order.amount / 100));
  console.log('  Currency:', order.currency);
  console.log('  Status:', order.status);
  console.log('\nRazorpay integration is working correctly!');
} catch (err) {
  console.error('\n❌ RAZORPAY ORDER CREATION FAILED:');
  console.error('  Error:', err.message || err);
  if (err.error) {
    console.error('  Description:', err.error.description);
    console.error('  Code:', err.error.code);
  }
}
