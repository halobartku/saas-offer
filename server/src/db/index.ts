import { pool } from '../config/database';
import fs from 'fs';
import path from 'path';

export async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const migrationPath = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationPath).sort();
    
    for (const file of files) {
      if (file.endsWith('.sql')) {
        const migration = fs.readFileSync(path.join(migrationPath, file), 'utf8');
        await client.query(migration);
        console.log(`Executed migration: ${file}`);
      }
    }
    
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}