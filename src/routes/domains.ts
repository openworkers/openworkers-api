import { Hono } from 'hono';
import { domainsService } from '../services/domains';
import { DomainFullSchema, DomainCreateInputSchema } from '../types';
import { jsonResponse, jsonArrayResponse } from '../utils/validate';

const domains = new Hono();

// GET /domains - List all domains
domains.get('/', async (c) => {
    const userId = c.get('userId');
    try {
        const domains = await domainsService.findAll(userId);
        return jsonArrayResponse(c, DomainFullSchema, domains);
    } catch (error) {
        console.error('Failed to fetch domains:', error);
        return c.json({ error: 'Failed to fetch domains' }, 500);
    }
});

// POST /domains - Create domain
domains.post('/', async (c) => {
    const userId = c.get('userId');
    const body = await c.req.json();

    try {
        const payload = DomainCreateInputSchema.parse(body);
        const domain = await domainsService.create(userId, payload);
        return jsonResponse(c, DomainFullSchema, domain, 201);
    } catch (error) {
        console.error('Failed to create domain:', error);
        return c.json({
            error: 'Failed to create domain',
            message: error instanceof Error ? error.message : 'Unknown error'
        }, 500);
    }
});

// DELETE /domains/:name - Delete domain
domains.delete('/:name', async (c) => {
    const userId = c.get('userId');
    const name = c.req.param('name');

    try {
        const deleted = await domainsService.delete(userId, name);
        if (deleted === 0) {
            return c.json({ error: 'Domain not found' }, 404);
        }
        return c.json({ deleted });
    } catch (error) {
        console.error('Failed to delete domain:', error);
        return c.json({ error: 'Failed to delete domain' }, 500);
    }
});

export default domains;
