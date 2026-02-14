#!/usr/bin/env node

import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
const distPath = path.join(__dirname, 'dist');

// Check if dist directory exists
if (!fs.existsSync(distPath)) {
  console.error(`Error: dist directory not found at ${distPath}`);
  console.error('Please run "npm run build" first');
  process.exit(1);
}

// Serve static files from dist
app.use(express.static(distPath, {
  index: 'index.html',
  maxAge: '1h'
}));

// SPA fallback - serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Serving files from: ${distPath}`);
});
