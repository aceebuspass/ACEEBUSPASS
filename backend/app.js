const dotenv = require('dotenv');
const path = require('path');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');

// Load .env before local imports
try {
  dotenv.config({ path: path.join(__dirname, '..', '.env') });
} catch (e) {
  // Silent fail
}

const { connectDB } = require('./db.js');
const studentRoutes = require('./routes/student.js');
const adminRoutes = require('./routes/admin.js');
const notificationRoutes = require('./routes/notifications.js');
const publicRoutes = require('./routes/public.js');

const app = express();

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    callback(null, true); 
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  exposedHeaders: ['Content-Disposition'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Enable CORS
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Basic request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

let mongodb = null;

// Database Connection Middleware
app.use(async (req, res, next) => {
  try {
    if (!mongodb) {
      mongodb = await connectDB();
    }
    req.mongo = mongodb;
    
    req.getCollection = (name) => {
      if (mongodb) return mongodb.collection(name);
      return null;
    };

    next();
  } catch (err) {
    console.error("Database middleware error:", err);
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      res.status(503).json({ error: "Database connection failed. Please try again soon." });
    } else {
      next(err);
    }
  }
});

// Routes
app.use('/api/student', studentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/public', publicRoutes);

app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = req.mongo ? 'Connected' : 'Disconnected';
    res.json({ 
      status: 'OK', 
      db: dbStatus, 
      env: process.env.NODE_ENV,
      vercel: !!process.env.VERCEL
    });
  } catch (err) {
    res.status(500).json({ status: 'Error', error: err.message });
  }
});

// Static files (React build)
const buildPath = path.join(__dirname, '..', 'build');

// Serve uploaded images statically
const backendUploads = path.join(__dirname, 'uploads');
const rootUploads = path.join(__dirname, '..', 'uploads');
const tmpUploads = '/tmp/uploads';

app.use('/uploads', express.static(backendUploads));
app.use('/uploads', express.static(rootUploads));
app.use('/uploads', express.static(tmpUploads));
app.use('/api/uploads', express.static(backendUploads));
app.use('/api/uploads', express.static(rootUploads));
app.use('/api/uploads', express.static(tmpUploads));

// Catch-all to serve React's index.html (Only in local)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.get('/{*path}', (req, res) => {
    if (req.path.includes('.') && !req.path.endsWith('.html')) {
      return res.status(404).json({ error: 'File not found' });
    }
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'API route not found' });
    }
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('SERVER ERROR:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  
  const status = err.status || 500;
  res.status(status).json({ 
    error: err.message || 'Internal server error',
    details: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  });
});

// Initialize and start listening
async function startServer() {
  try {
    mongodb = await connectDB();
    console.log("MongoDB is READY.");

    const PORT = process.env.PORT || 3001;
    const http = require('http');
    const server = http.createServer({ maxHeaderSize: 65536 }, app);
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 EVERYTHING RUNNING ON PORT ${PORT}`);
    });
  } catch (err) {
    console.error("\n❌ CRITICAL: Failed to start the server.");
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
}

// Only listen if not in serverless
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  startServer();
}

module.exports = app;
