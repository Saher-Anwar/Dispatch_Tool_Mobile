const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Serve static files
app.use(express.static('.'));

// Route for tracking links - serve index.html for any /track/* route
app.get('/track/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Default route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🌐 Web viewer running at http://localhost:${PORT}`);
    console.log(`📱 Test tracking links: http://localhost:${PORT}/track/YOUR_TRIP_ID`);
});