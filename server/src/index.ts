import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import clientsRouter from './api/clients';
import offersRouter from './api/offers';
import productsRouter from './api/products';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/clients', clientsRouter);
app.use('/api/offers', offersRouter);
app.use('/api/products', productsRouter);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
