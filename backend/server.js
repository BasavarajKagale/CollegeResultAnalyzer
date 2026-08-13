const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
const resultRoutes = require('./routes/resultRoutes');

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'DELETE', 'PUT']
    }
});

app.set('io', io);

io.on('connection', (socket) => {
    console.log(`[Socket.io] Real-time client connected: ${socket.id}`);
    socket.on('disconnect', () => {
        console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
});

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/results', resultRoutes);

// Health Check
app.get('/health', (req, res) => res.send('API is running'));

// Serve Static Frontend Assets & Fallback SPA Client Routes
const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path === '/health') return next();
        res.sendFile(path.join(frontendDist, 'index.html'));
    });
}

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('MongoDB Connected');
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT} with real-time Socket.IO enabled`);
        });
    })
    .catch(err => console.error('DB Connection Error:', err));
