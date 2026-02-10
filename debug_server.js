const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config({ path: './server/.env' });

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', debug: true });
});

// Try to load routes
try {
    const noteRoutes = require('./server/src/routes/notes');
    app.use('/api/notes', noteRoutes);
    console.log('✅ Note routes loaded');
} catch (err) {
    console.error('❌ Error loading note routes:', err);
}

const PORT = 3001; // Use a different port
app.listen(PORT, () => {
    console.log(`🚀 Debug server listening on port ${PORT}`);
});
