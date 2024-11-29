import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { runMigrations } from './db';

// Routes
import authRouter from './api/auth';
import clientsRouter from './api/clients';
import offersRouter from './api/offers';
import productsRouter from './api/products';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/offers', offersRouter);
app.use('/api/products', productsRouter);

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Something broke!' });
});

const PORT = process.env.PORT || 3001;

// Initialize database and start server
(async () => {
  try {
    // Run migrations
    await runMigrations();
    console.log('Database migrations completed successfully');

    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start the server:', error);
    process.exit(1);
  }
})();

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
