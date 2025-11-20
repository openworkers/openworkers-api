import { getDb } from './db';
import type { Worker } from '../types';

export class WorkersService {
  async findAll(userId: string): Promise<Worker[]> {
    const db = getDb();

    const result = await db.query<Worker>(
      `SELECT id, name, script, language, user_id, environment_id, created_at, updated_at
       FROM workers
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  async findById(userId: string, id: string): Promise<Worker | null> {
    const db = getDb();

    const result = await db.query<Worker>(
      `SELECT w.id, w.name, w.script, w.language, w.user_id, w.environment_id,
              w.created_at, w.updated_at
       FROM workers w
       WHERE w.id = $1 AND w.user_id = $2`,
      [id, userId]
    );

    return result.rows[0] || null;
  }

  async create(userId: string, input: {
    name: string;
    script: string;
    language: 'javascript' | 'typescript';
    environment_id?: string;
  }): Promise<Worker> {
    const db = getDb();

    const result = await db.query<Worker>(
      `INSERT INTO workers (name, script, language, user_id, environment_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [input.name, input.script, input.language, userId, input.environment_id || null]
    );

    return result.rows[0];
  }

  async update(userId: string, id: string, input: {
    name?: string;
    script?: string;
    language?: 'javascript' | 'typescript';
    environment_id?: string;
  }): Promise<Worker> {
    const db = getDb();

    // Build dynamic update query
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (input.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(input.name);
    }
    if (input.script !== undefined) {
      fields.push(`script = $${paramCount++}`);
      values.push(input.script);
    }
    if (input.language !== undefined) {
      fields.push(`language = $${paramCount++}`);
      values.push(input.language);
    }
    if (input.environment_id !== undefined) {
      fields.push(`environment_id = $${paramCount++}`);
      values.push(input.environment_id);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id, userId);

    const result = await db.query<Worker>(
      `UPDATE workers
       SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Worker not found or unauthorized');
    }

    return result.rows[0];
  }

  async delete(userId: string, id: string): Promise<number> {
    const db = getDb();

    const result = await db.query(
      `DELETE FROM workers
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    return result.rowCount;
  }
}

export const workersService = new WorkersService();
