import { describe, test, expect } from 'bun:test';
import { workerUrl } from './worker-url';

describe('workerUrl', () => {
  test('a production dashboard links to workers.rocks', () => {
    expect(workerUrl('hello', 'dash.openworkers.com')).toBe('https://hello.workers.rocks');
  });

  test('a dev dashboard links to the dev worker domain', () => {
    expect(workerUrl('hello', 'dash.dev.localhost')).toBe('https://hello.workers.dev.localhost');
    expect(workerUrl('hello', 'dash.dev.localhost:5173')).toBe('https://hello.workers.dev.localhost');
  });
});
