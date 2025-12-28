import { Hono } from 'hono';
import { z } from 'zod';
import { tablesService } from '../services/tables';
import { ColumnDefinitionSchema, CreateTableInputSchema, type IColumnDefinition } from '../types';

const tables = new Hono();

// GET /databases/:databaseId/tables - List all tables
tables.get('/', async (c) => {
  const userId = c.get('userId');
  const databaseId = c.req.param('databaseId')!;

  try {
    const tableList = await tablesService.listTables(userId, databaseId);
    return c.json(tableList);
  } catch (error) {
    console.error('Failed to list tables:', error);

    if (error instanceof Error && error.message === 'Database not found') {
      return c.json({ error: 'Database not found' }, 404);
    }

    return c.json(
      { error: 'Failed to list tables', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

// GET /databases/:databaseId/tables/:tableName - Get table info
tables.get('/:tableName', async (c) => {
  const userId = c.get('userId');
  const databaseId = c.req.param('databaseId')!;
  const tableName = c.req.param('tableName')!;

  try {
    const columns = await tablesService.describeTable(userId, databaseId, tableName);

    if (columns.length === 0) {
      return c.json({ error: 'Table not found' }, 404);
    }

    return c.json({ name: tableName, columns });
  } catch (error) {
    console.error('Failed to describe table:', error);

    if (error instanceof Error && error.message === 'Database not found') {
      return c.json({ error: 'Database not found' }, 404);
    }

    return c.json(
      { error: 'Failed to describe table', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

// POST /databases/:databaseId/tables - Create a new table
tables.post('/', async (c) => {
  const userId = c.get('userId');
  const databaseId = c.req.param('databaseId')!;
  const body = await c.req.json();

  try {
    const { name, columns } = CreateTableInputSchema.parse(body);

    await tablesService.createTable(userId, databaseId, name, columns as IColumnDefinition[]);

    return c.json({ created: true, name }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.issues }, 400);
    }

    console.error('Failed to create table:', error);

    if (error instanceof Error && error.message === 'Database not found') {
      return c.json({ error: 'Database not found' }, 404);
    }

    return c.json(
      { error: 'Failed to create table', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

// DELETE /databases/:databaseId/tables/:tableName - Drop a table
tables.delete('/:tableName', async (c) => {
  const userId = c.get('userId');
  const databaseId = c.req.param('databaseId')!;
  const tableName = c.req.param('tableName')!;

  try {
    await tablesService.dropTable(userId, databaseId, tableName);
    return c.json({ deleted: true });
  } catch (error) {
    console.error('Failed to drop table:', error);

    if (error instanceof Error && error.message === 'Database not found') {
      return c.json({ error: 'Database not found' }, 404);
    }

    return c.json(
      { error: 'Failed to drop table', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

// POST /databases/:databaseId/tables/:tableName/columns - Add a column
tables.post('/:tableName/columns', async (c) => {
  const userId = c.get('userId');
  const databaseId = c.req.param('databaseId')!;
  const tableName = c.req.param('tableName')!;
  const body = await c.req.json();

  try {
    const column = ColumnDefinitionSchema.parse(body);
    await tablesService.addColumn(userId, databaseId, tableName, column);
    return c.json({ created: true, name: column.name }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.issues }, 400);
    }

    console.error('Failed to add column:', error);

    if (error instanceof Error && error.message === 'Database not found') {
      return c.json({ error: 'Database not found' }, 404);
    }

    return c.json(
      { error: 'Failed to add column', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

// DELETE /databases/:databaseId/tables/:tableName/columns/:columnName - Drop a column
tables.delete('/:tableName/columns/:columnName', async (c) => {
  const userId = c.get('userId');
  const databaseId = c.req.param('databaseId')!;
  const tableName = c.req.param('tableName')!;
  const columnName = c.req.param('columnName')!;

  try {
    await tablesService.dropColumn(userId, databaseId, tableName, columnName);
    return c.json({ deleted: true });
  } catch (error) {
    console.error('Failed to drop column:', error);

    if (error instanceof Error && error.message === 'Database not found') {
      return c.json({ error: 'Database not found' }, 404);
    }

    return c.json(
      { error: 'Failed to drop column', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

export default tables;
