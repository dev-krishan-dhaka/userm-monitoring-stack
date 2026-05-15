require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');
const userRoutes = require('./routes/userRoutes');
const client = require('prom-client');
const responseTime = require('response-time');

const PORT = process.env.PORT || 5000;

const app = express();

// Clear and setup metrics
client.register.clear();
collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register });

const activeUsers = new client.Gauge({
  name: 'active_users',
  help: 'Number of active users in last hour',
  labelNames: ['status']
});

// === 3 USEFUL METRICS ===



// 1. Track user registrations (business metric)
const userRegistrations = new client.Counter({
  name: 'user_registrations_total',
  help: 'Total number of user signups',
  labelNames: ['status'] // success or failed
});

// 2. Track login attempts (security metric)
const userLogins = new client.Counter({
  name: 'user_logins_total',
  help: 'Total login attempts',
  labelNames: ['result'] // success, failed
});

// 3. Track API response time (performance metric)
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'endpoint', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

// Response time middleware
app.use(responseTime((req, res, time) => {
  const endpoint = req.route ? req.route.path : req.path;
  httpRequestDuration.labels(req.method, endpoint, res.statusCode).observe(time / 1000);
}));

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
app.use(express.json());

// Make metrics available to routes
app.set('metrics', { userRegistrations, userLogins, httpRequestDuration });

// Routes
app.use('/api/users', userRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'OK', uptime: process.uptime() }));

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.setHeader('Content-Type', client.register.contentType);
  const metrics = await client.register.metrics();
  res.send(metrics);
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Something went wrong!' });
});

// Start server
sequelize.authenticate()
  .then(() => {
    console.log("Database connected");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database connection failed:", err);
  });

module.exports = { userRegistrations, userLogins, httpRequestDuration };
