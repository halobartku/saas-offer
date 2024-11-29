import { Router } from 'express';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clients ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const { name, email, phone, address, notes } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO clients (name, email, phone, address, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, email, phone, address, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create client' });
  }
});

export default router;
