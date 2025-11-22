import { Hono } from "hono";
import { cronsService } from "../services/crons";
import { workersService } from "../services/workers";
import {
  CronCreateInputSchema,
  CronUpdateInputSchema,
  CronSchema,
  WorkerSchema,
} from "../types";
import { jsonResponse } from "../utils/validate";

const crons = new Hono();

// PUT /crons/:id - Update cron
crons.put("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const body = await c.req.json();

  try {
    const payload = CronUpdateInputSchema.parse(body);
    const cron = await cronsService.update(userId, id, payload);

    // Return updated worker
    const updatedWorker = await workersService.findById(userId, cron.workerId);

    return jsonResponse(c, WorkerSchema, updatedWorker);
  } catch (error) {
    console.error("Failed to update cron:", error);
    return c.json(
      {
        error: "Failed to update cron",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// DELETE /crons/:id - Delete cron
crons.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  try {
    // Get cron first to know which worker it belongs to
    const cron = await cronsService.findById(userId, id);
    if (!cron) {
      return c.json({ error: "Cron not found" }, 404);
    }

    const deleted = await cronsService.delete(userId, id);

    if (deleted === 0) {
      return c.json({ error: "Cron not found" }, 404);
    }

    // Return updated worker
    const updatedWorker = await workersService.findById(userId, cron.workerId);
    return c.json(updatedWorker);
  } catch (error) {
    console.error("Failed to delete cron:", error);
    return c.json({ error: "Failed to delete cron" }, 500);
  }
});

// POST /crons - Create cron
crons.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();

  try {
    const payload = CronCreateInputSchema.parse(body);
    const cron = await cronsService.create(userId, payload);
    return jsonResponse(c, CronSchema, cron, 201);
  } catch (error) {
    console.error("Failed to create cron:", error);
    return c.json(
      {
        error: "Failed to create cron",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

export default crons;
