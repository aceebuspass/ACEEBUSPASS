import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Simple test routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Bus Pass Backend API (Simple)',
    version: '1.0.0',
    status: 'running'
  });
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'API test endpoint working!' });
});

// Basic admin route without database
app.post('/api/admin/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const ADMIN_USERNAME = 'admin';
    const ADMIN_PASSWORD = 'S3cureP@ssw0rd2025!';
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      res.json({ 
        message: 'Login successful',
        user: { username: ADMIN_USERNAME, role: 'admin' }
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Simple server running on port ${PORT}`);
  console.log(`🌐 API Base: http://localhost:${PORT}/api`);
}); 