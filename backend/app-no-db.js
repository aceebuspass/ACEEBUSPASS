import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import studentRoutes from './routes/student.js';
import adminRoutes from './routes/admin.js';

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Mock database middleware
app.use((req, res, next) => {
  req.db = {
    all: async () => [],
    get: async () => null,
    run: async () => ({ changes: 1 })
  };
  next();
});

// Routes
app.use('/api/student', studentRoutes);
app.use('/api/admin', adminRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Bus Pass Backend API (No DB)',
    version: '1.0.0',
    status: 'running'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 No-DB server running on port ${PORT}`);
  console.log(`🌐 API Base: http://localhost:${PORT}/api`);
}); 