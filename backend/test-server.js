import express from 'express';
import cors from 'cors';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Test routes
app.get('/', (req, res) => {
  res.json({ message: 'Test server is running!' });
});

app.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint working!' });
});

app.post('/test', (req, res) => {
  res.json({ message: 'POST test working!', body: req.body });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`🧪 Test server running on port ${PORT}`);
  console.log(`🌐 Test URL: http://localhost:${PORT}`);
}); 