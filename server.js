import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// API proxy - forward /api requests to backend (MUST be before static files)
app.use('/api', async (req, res) => {
  const backendUrl = process.env.VITE_API_BASE_URL || 'https://agent-dashboard-backend-production.up.railway.app/api';
  try {
    const response = await fetch(`${backendUrl}${req.url}`, {
      method: req.method,
      headers: {
        ...req.headers,
        host: undefined,
      },
    });
    
    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'content-encoding') {
        res.setHeader(key, value);
      }
    });
    
    const data = await response.text();
    res.send(data);
  } catch (error) {
    res.status(502).json({ error: 'Backend unavailable' });
  }
});

// Serve static files from dist
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback: all routes to index.html
app.use('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
