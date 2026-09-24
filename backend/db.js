const { MongoClient, ServerApiVersion } = require('mongodb');
const dotenv = require('dotenv');
const path = require('path');

// Try loading .env but don't fail if it's missing (it will be missing on Vercel)
try {
  dotenv.config({ path: path.join(__dirname, '..', '.env') });
} catch (e) {
  // Silent fail
}

let cachedClient = global.mongoClient || null;
let cachedDb = global.mongoDb || null;
let cachedPromise = global.mongoPromise || null;

async function connectDB() {
  if (cachedDb) return cachedDb;
  if (cachedPromise) return cachedPromise;
  
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("CRITICAL: MONGODB_URI is not defined in environment variables!");
    throw new Error("MONGODB_URI is not defined.");
  }

  if (!cachedClient) {
    console.log("Creating new MongoClient instance...");
    cachedClient = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000,
      maxPoolSize: 10
    });
    global.mongoClient = cachedClient;
  }

  console.log("Starting MongoDB connection promise...");
  cachedPromise = cachedClient.connect()
    .then(client => {
      console.log("Connected to MongoDB Atlas successfully!");
      cachedDb = client.db("ebuspass");
      global.mongoDb = cachedDb;
      return cachedDb;
    })
    .catch(err => {
      console.error("Failed to connect to MongoDB:", err.message);
      global.mongoPromise = null; // Reset promise on failure
      cachedPromise = null;
      throw err;
    });

  global.mongoPromise = cachedPromise;
  return cachedPromise;
}

function getDB() {
  if (!cachedDb) throw new Error("Database not connected. Call connectDB first.");
  return cachedDb;
}

module.exports = {
  connectDB,
  getDB
};
