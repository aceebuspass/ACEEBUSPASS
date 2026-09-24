
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const uri = process.env.MONGODB_URI;


process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

async function test() {
  console.log("Testing connection string:", uri.replace(/:([^@]+)@/, ":****@"));
  const client = new MongoClient(uri, {
    connectTimeoutMS: 5000,
    serverSelectionTimeoutMS: 5000,
  });
  try {
    console.log("Attempting to connect...");
    await client.connect();
    console.log("Successfully connected!");
    await client.db("admin").command({ ping: 1 });
    console.log("Ping successful!");
  } catch (err) {
    console.error("Connection failed with error:");
    console.error(err);
  } finally {
    try {
      await client.close();
    } catch (e) {}
  }
}


test();
