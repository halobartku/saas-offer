import { Router } from 'express';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM offers ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const { clientId, products, totalAmount, validUntil } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO offers (client_id, products, total_amount, valid_until) VALUES ($1, $2, $3, $4) RETURNING *',
      [clientId, JSON.stringify(products), totalAmount, validUntil]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create offer' });
  }
});

export default router;
