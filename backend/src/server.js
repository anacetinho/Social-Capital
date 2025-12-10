const app = require('./app');
const config = require('./config');

const PORT = config.port || 3000;

const server = app.listen(PORT, () => {
  console.log('🚀 Social Capital CRM Server');
  console.log(`✓ Server listening on port ${PORT}`);
  console.log(`  - API: http://localhost:${PORT}/api/v1`);
  console.log(`  - Health: http://localhost:${PORT}/api/v1/health`);
  console.log(`  - Environment: ${config.env}`);
  console.log('');
});

// Set server timeout to 35 minutes (longer than Concordia simulation timeout)
// This prevents Express from killing long-running simulation requests
server.timeout = 35 * 60 * 1000;
server.keepAliveTimeout = 35 * 60 * 1000;
