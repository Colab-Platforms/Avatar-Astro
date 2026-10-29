const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from current directory
app.use(express.static(path.join(__dirname)));

// Handle routing for single page application
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log('🚀 Astral 3D Server is running!');
  console.log(`📡 Local: http://localhost:${PORT}`);
  console.log(`🌌 Network: http://127.0.0.1:${PORT}`);
  console.log('');
  console.log('🏠 Main Site: http://localhost:' + PORT);
});