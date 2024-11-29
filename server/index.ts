import express from 'express';
import { setupSecurity } from './middleware/security';
import { errorHandler } from './middleware/errorHandler';
import winston from 'winston';
import expressWinston from 'express-winston';

// Initialize express app
const app = express();

// Parse JSON bodies
app.use(express.json());

// Setup security middleware
setupSecurity(app);

// Request logging middleware
app.use(expressWinston.logger({
  transports: [
    new winston.transports.Console()
  ],
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  ),
  meta: process.env.NODE_ENV === 'development',
  msg: 'HTTP {{req.method}} {{req.url}}',
  expressFormat: true,
  colorize: true,
}));

// API Routes (to be implemented)
app.use('/api', (req, res) => {
  res.json({ message: 'API route placeholder' });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
