import { Hono } from 'hono';
import { findUserById } from '../services/db';
import { SelfSchema } from '../types';
import { jsonResponse } from '../utils/validate';

const users = new Hono();

// GET /profile - Get current user profile
users.get('/profile', async (c) => {
  const userId = c.get('userId');

  try {
    const user = await findUserById(userId);

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    return jsonResponse(c, SelfSchema, user);
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    return c.json({ error: 'Failed to fetch user profile' }, 500);
  }
});

export default users;
