import { Router } from 'express';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const { name, description, price, category } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO products (name, description, price, category) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description, price, category]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create product' });
  }
});

export default router;
