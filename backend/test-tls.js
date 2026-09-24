
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const uri = process.env.MONGODB_URI;

async function test() {
  console.log("Testing with explicit TLS options...");
  const client = new MongoClient(uri, {
    tls: true,
    connectTimeoutMS: 5000,
    serverSelectionTimeoutMS: 5000,
  });
  try {
    console.log("Attempting to connect...");
    await client.connect();
    console.log("Successfully connected!");
    await client.db("ebuspass").command({ ping: 1 });
  } catch (err) {
    console.error("Failed with error:");
    console.error(err);
  } finally {
    await client.close();
  }
}

test();
