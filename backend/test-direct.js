
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const directUri = "mongodb://sathishepass:sathish%40epass@ac-cbkk77k-shard-00-01.licrup0.mongodb.net:27017/ebuspass?ssl=true&authSource=admin&directConnection=true";

async function test() {
  console.log("Testing direct node connection...");
  const client = new MongoClient(directUri, {
    connectTimeoutMS: 5000,
    serverSelectionTimeoutMS: 5000,
  });
  try {
    console.log("Attempting to connect to shard-00-01...");
    await client.connect();
    console.log("Successfully connected!");
    await client.db("ebuspass").command({ ping: 1 });
    console.log("Ping successful!");
  } catch (err) {
    console.error("Direct connection failed:");
    console.error(err);
  } finally {
    try {
      await client.close();
    } catch (e) {}
  }
}

test();
