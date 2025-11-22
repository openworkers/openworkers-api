import { Hono } from 'hono';
import { cronsService } from '../services/crons';
import { workersService } from '../services/workers';

const crons = new Hono();

// PUT /crons/:id - Update cron
crons.put('/:id', async (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id');
    const body = await c.req.json();

    if (!body.value) {
        return c.json({ error: 'Missing required field: value' }, 400);
    }

    try {
        const cron = await cronsService.update(userId, id, {
            value: body.value,
        });

        return c.json(cron);
    } catch (error) {
        console.error('Failed to update cron:', error);
        return c.json({
            error: 'Failed to update cron',
            message: error instanceof Error ? error.message : 'Unknown error'
        }, 500);
    }
});

// DELETE /crons/:id - Delete cron
crons.delete('/:id', async (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id');

    try {
        // Get cron first to know which worker it belongs to
        const cron = await cronsService.findById(userId, id);
        if (!cron) {
            return c.json({ error: 'Cron not found' }, 404);
        }

        const deleted = await cronsService.delete(userId, id);

        if (deleted === 0) {
            return c.json({ error: 'Cron not found' }, 404);
        }

        // Return updated worker
        const updatedWorker = await workersService.findById(userId, cron.workerId);
        return c.json(updatedWorker);
    } catch (error) {
        console.error('Failed to delete cron:', error);
        return c.json({ error: 'Failed to delete cron' }, 500);
    }
});

// POST /crons - Create cron
crons.post('/', async (c) => {
    const userId = c.get('userId');
    const body = await c.req.json();

    if (!body.workerId || !body.value) {
        return c.json({ error: 'Missing required fields: workerId, value' }, 400);
    }

    try {
        const cron = await cronsService.create(userId, {
            workerId: body.workerId,
            value: body.value
        });
        return c.json(cron, 201);
    } catch (error) {
        console.error('Failed to create cron:', error);
        return c.json({
            error: 'Failed to create cron',
            message: error instanceof Error ? error.message : 'Unknown error'
        }, 500);
    }
});

export default crons;
