const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./api/auth');
const peopleRoutes = require('./api/people');
const relationshipsRoutes = require('./api/relationships');
const eventsRoutes = require('./api/events');
const favorsRoutes = require('./api/favors');
const professionalHistoryRoutes = require('./api/professional-history');
const assetsRoutes = require('./api/assets');
const biographiesRoutes = require('./api/biographies');
const dashboardRoutes = require('./api/dashboard');
const networkRoutes = require('./api/network');
const settingsRoutes = require('./api/settings');
const chatsRoutes = require('./api/chats');
const summariesRoutes = require('./api/summaries');
const preferencesRoutes = require('./api/preferences');
const mapRoutes = require('./api/map');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('healthy');
});

app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', message: 'Social Capital CRM API is running' });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/people', peopleRoutes);
app.use('/api/v1/relationships', relationshipsRoutes);
app.use('/api/v1/events', eventsRoutes);
app.use('/api/v1/favors', favorsRoutes);
app.use('/api/v1/professional-history', professionalHistoryRoutes);
app.use('/api/v1/assets', assetsRoutes);
app.use('/api/v1/biographies', biographiesRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/network', networkRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/chats', chatsRoutes);
app.use('/api/v1/summaries', summariesRoutes);
app.use('/api/v1/preferences', preferencesRoutes);
app.use('/api/v1/map', mapRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested resource does not exist'
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;
