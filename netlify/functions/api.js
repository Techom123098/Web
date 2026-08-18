const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');

const authRoutes = require('../../src/routes/auth');
const adminRoutes = require('../../src/routes/admin');
const publicRoutes = require('../../src/routes/public');

const app = express();

app.use(cors());
app.use(express.json());

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', publicRoutes);

// Fallbacks
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/', publicRoutes);

module.exports.handler = serverless(app);
