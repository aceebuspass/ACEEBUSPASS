// ============================================================
// E-PASS BACKEND SERVER
// Local + Render compatible
// ============================================================

// ------------------------------------------------------------
// 1. Fix MongoDB Atlas SRV DNS resolution
// ------------------------------------------------------------
const dns = require('node:dns');

dns.setServers([
  '8.8.8.8',
  '1.1.1.1'
]);

// ------------------------------------------------------------
// 2. Imports
// ------------------------------------------------------------
const dotenv = require('dotenv');
const path = require('path');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const http = require('http');

// ------------------------------------------------------------
// 3. Load environment variables
// ------------------------------------------------------------
try {
  dotenv.config({
    path: path.join(__dirname, '..', '.env')
  });
} catch (error) {
  console.error('Failed to load .env file:', error.message);
}

// ------------------------------------------------------------
// 4. Local imports
// IMPORTANT: DNS configuration must happen before db.js import
// ------------------------------------------------------------
const { connectDB } = require('./db.js');

const studentRoutes = require('./routes/student.js');
const adminRoutes = require('./routes/admin.js');
const notificationRoutes = require('./routes/notifications.js');
const publicRoutes = require('./routes/public.js');

// ------------------------------------------------------------
// 5. Create Express application
// ------------------------------------------------------------
const app = express();

// ------------------------------------------------------------
// 6. Basic configuration
// ------------------------------------------------------------
const isProduction = process.env.NODE_ENV === 'production';
const isVercel = !!process.env.VERCEL;

// Render provides PORT automatically.
// Local development falls back to 3001.
// ------------------------------------------------------------
const PORT = Number(process.env.PORT) || 3001;

// ------------------------------------------------------------
// 7. CORS configuration
// ------------------------------------------------------------
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3003'
];

// Add deployed frontend URL when available
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(
    process.env.FRONTEND_URL.replace(/\/$/, '')
  );
}

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests such as Postman/server-to-server requests
    if (!origin) {
      return callback(null, true);
    }

    // Development: allow local frontend
    if (!isProduction && allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Production: allow configured frontend
    if (
      isProduction &&
      process.env.FRONTEND_URL &&
      origin === process.env.FRONTEND_URL.replace(/\/$/, '')
    ) {
      return callback(null, true);
    }

    // Keep compatibility with your existing application
    // while avoiding throwing a CORS exception.
    return callback(null, true);
  },

  methods: [
    'GET',
    'POST',
    'PUT',
    'DELETE',
    'OPTIONS'
  ],

  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization'
  ],

  exposedHeaders: [
    'Content-Disposition'
  ],

  credentials: true,

  optionsSuccessStatus: 200
};

// ------------------------------------------------------------
// 8. Middleware
// ------------------------------------------------------------
app.use(cors(corsOptions));

app.use(
  express.json({
    limit: '10mb'
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb'
  })
);

// ------------------------------------------------------------
// 9. Request logger
// ------------------------------------------------------------
app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()} - ${req.method} ${req.originalUrl}`
  );

  next();
});

// ------------------------------------------------------------
// 10. MongoDB connection cache
// ------------------------------------------------------------
let mongodb = null;

let dbConnectionPromise = null;

// ------------------------------------------------------------
// 11. Get MongoDB connection
// ------------------------------------------------------------
async function getDatabase() {
  try {
    if (mongodb) {
      return mongodb;
    }

    if (!dbConnectionPromise) {
      console.log('Creating MongoDB connection...');

      dbConnectionPromise = connectDB();
    }

    mongodb = await dbConnectionPromise;

    console.log('MongoDB connection is ready.');

    return mongodb;
  } catch (error) {
    dbConnectionPromise = null;

    console.error(
      'MongoDB connection failed:',
      error.message
    );

    throw error;
  }
}

// ------------------------------------------------------------
// 12. Database middleware
// ------------------------------------------------------------
app.use(async (req, res, next) => {
  try {
    const database = await getDatabase();

    req.mongo = database;

    req.getCollection = (name) => {
      if (!mongodb) {
        return null;
      }

      return mongodb.collection(name);
    };

    next();
  } catch (error) {
    console.error(
      'Database middleware error:',
      error
    );

    res.status(503).json({
      error: 'Database connection failed.',
      message: isProduction
        ? 'Please try again soon.'
        : error.message
    });
  }
});

// ------------------------------------------------------------
// 13. API routes
// ------------------------------------------------------------
app.use(
  '/api/student',
  studentRoutes
);

app.use(
  '/api/admin',
  adminRoutes
);

app.use(
  '/api/notifications',
  notificationRoutes
);

app.use(
  '/api/public',
  publicRoutes
);

// ------------------------------------------------------------
// 14. Health check
// ------------------------------------------------------------
app.get(
  '/api/health',
  async (req, res) => {
    try {
      const database = await getDatabase();

      res.json({
        status: 'OK',
        db: database ? 'Connected' : 'Disconnected',
        env: process.env.NODE_ENV || 'development',
        vercel: isVercel,
        platform: process.env.RENDER
          ? 'render'
          : 'local'
      });
    } catch (error) {
      console.error(
        'Health check failed:',
        error.message
      );

      res.status(503).json({
        status: 'Error',
        db: 'Disconnected',
        error: error.message
      });
    }
  }
);

// ------------------------------------------------------------
// 15. Static upload directories
// ------------------------------------------------------------
const backendUploads = path.join(
  __dirname,
  'uploads'
);

const rootUploads = path.join(
  __dirname,
  '..',
  'uploads'
);

const tmpUploads = '/tmp/uploads';

// Make sure local upload directory exists
try {
  if (!fs.existsSync(backendUploads)) {
    fs.mkdirSync(
      backendUploads,
      {
        recursive: true
      }
    );
  }
} catch (error) {
  console.error(
    'Could not create upload directory:',
    error.message
  );
}

// Serve uploads
app.use(
  '/uploads',
  express.static(backendUploads)
);

app.use(
  '/uploads',
  express.static(rootUploads)
);

app.use(
  '/uploads',
  express.static(tmpUploads)
);

app.use(
  '/api/uploads',
  express.static(backendUploads)
);

app.use(
  '/api/uploads',
  express.static(rootUploads)
);

app.use(
  '/api/uploads',
  express.static(tmpUploads)
);

// ------------------------------------------------------------
// 16. React build path
// ------------------------------------------------------------
const buildPath = path.join(
  __dirname,
  '..',
  'build'
);

// ------------------------------------------------------------
// 17. Local React fallback
// ------------------------------------------------------------
// This is useful when running the complete application locally.
// Vercel handles the frontend separately in your deployment.
// ------------------------------------------------------------
if (!isVercel) {
  app.get(
    '/{*path}',
    (req, res) => {
      // Never treat API routes as React routes
      if (req.path.startsWith('/api')) {
        return res.status(404).json({
          error: 'API route not found'
        });
      }

      // Serve real files normally
      if (
        req.path.includes('.') &&
        !req.path.endsWith('.html')
      ) {
        return res.status(404).json({
          error: 'File not found'
        });
      }

      // Check whether React build exists
      const indexFile = path.join(
        buildPath,
        'index.html'
      );

      if (!fs.existsSync(indexFile)) {
        return res.status(404).json({
          error:
            'React build not found. Run npm run build first.'
        });
      }

      return res.sendFile(indexFile);
    }
  );
}

// ------------------------------------------------------------
// 18. 404 handler for APIs
// ------------------------------------------------------------
app.use(
  '/api',
  (req, res) => {
    res.status(404).json({
      error: 'API endpoint not found',
      path: req.originalUrl
    });
  }
);

// ------------------------------------------------------------
// 19. Global error handler
// ------------------------------------------------------------
app.use(
  (
    err,
    req,
    res,
    next
  ) => {
    console.error(
      'SERVER ERROR:',
      {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
      }
    );

    const status =
      err.status || 500;

    res.status(status).json({
      error:
        err.message ||
        'Internal server error',

      details:
        !isProduction
          ? err.stack
          : undefined
    });
  }
);

// ------------------------------------------------------------
// 20. Start server
// ------------------------------------------------------------
async function startServer() {
  try {
    // Connect to MongoDB before accepting requests
    await getDatabase();

    console.log(
      'Connected to MongoDB successfully.'
    );

    console.log(
      'MongoDB is READY.'
    );

    // IMPORTANT:
    // Render requires listening on the PORT it provides.
    // Local development uses 3001 by default.
    const server = http.createServer(
      {
        maxHeaderSize: 65536
      },
      app
    );

    server.on(
      'error',
      (error) => {
        console.error(
          'HTTP SERVER ERROR:',
          error
        );

        if (
          error.code === 'EADDRINUSE'
        ) {
          console.error(
            `Port ${PORT} is already in use.`
          );
        }
      }
    );

    server.listen(
      PORT,
      '0.0.0.0',
      () => {
        console.log('');
        console.log(
          '======================================'
        );
        console.log(
          '       E-PASS BACKEND STARTED'
        );
        console.log(
          '======================================'
        );
        console.log(
          `Environment : ${
            process.env.NODE_ENV ||
            'development'
          }`
        );
        console.log(
          `Port        : ${PORT}`
        );
        console.log(
          `MongoDB     : Connected`
        );
        console.log(
          `Vercel      : ${isVercel}`
        );
        console.log(
          `Render      : ${
            !!process.env.RENDER
          }`
        );
        console.log(
          '======================================'
        );
        console.log('');
      }
    );

    // Graceful shutdown
    const shutdown = async (
      signal
    ) => {
      console.log(
        `\n${signal} received. Shutting down...`
      );

      server.close(
        async () => {
          try {
            if (
              mongodb &&
              typeof mongodb.close === 'function'
            ) {
              await mongodb.close();
            }
          } catch (error) {
            console.error(
              'MongoDB close error:',
              error.message
            );
          }

          console.log(
            'Server stopped.'
          );

          process.exit(0);
        }
      );
    };

    process.on(
      'SIGINT',
      () => shutdown('SIGINT')
    );

    process.on(
      'SIGTERM',
      () => shutdown('SIGTERM')
    );

  } catch (error) {
    console.error('');
    console.error(
      '======================================'
    );
    console.error(
      '   FAILED TO START E-PASS BACKEND'
    );
    console.error(
      '======================================'
    );
    console.error(
      error
    );
    console.error(
      '======================================'
    );
    console.error('');

    process.exit(1);
  }
}

// ------------------------------------------------------------
// 21. Start the server
// ------------------------------------------------------------
// Render needs the server to listen.
// Local development needs it too.
// If this file is imported by a serverless environment such
// as Vercel, don't create a listener there.
// ------------------------------------------------------------
if (!isVercel) {
  startServer();
}

// ------------------------------------------------------------
// 22. Export Express application
// ------------------------------------------------------------
module.exports = app;