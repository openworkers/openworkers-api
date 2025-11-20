import { Hono } from 'hono';
import { findUserById } from '../services/db';

const users = new Hono();

// GET /profile - Get current user profile
users.get('/profile', async (c) => {
  const userId = c.get('userId');

  try {
    const user = await findUserById(userId);

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json(user);
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    return c.json({ error: 'Failed to fetch user profile' }, 500);
  }
});

export default users;
