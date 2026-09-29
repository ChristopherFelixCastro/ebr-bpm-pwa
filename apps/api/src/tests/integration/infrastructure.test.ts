import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.fn();
vi.mock('../../db/client.js', () => ({ pool: { query } }));
const { app } = await import('../../app.js');

describe('infrastructure', () => {
  beforeEach(() => query.mockReset());

  it('live avoids database', async () => {
    const response = await request(app).get('/health/live');
    expect(response.status).toBe(200);
    expect(query).not.toHaveBeenCalled();
    expect(response.body.meta.correlationId).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('ready uses pool', async () => {
    query.mockResolvedValue({});
    const response = await request(app).get('/health/ready');
    expect(response.status).toBe(200);
    expect(query).toHaveBeenCalledWith('SELECT 1');
    expect(response.body.data.status).toBe('ready');
  });

  it('handles correlation ids', async () => {
    const id = '123e4567-e89b-42d3-a456-426614174000';
    expect((await request(app).get('/health/live').set('X-Correlation-Id', id)).headers['x-correlation-id']).toBe(id);
    expect((await request(app).get('/health/live').set('X-Correlation-Id', 'bad')).headers['x-correlation-id']).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('formats 404 and limits cors', async () => {
    expect((await request(app).get('/health/live').set('Origin', 'http://localhost:5173')).headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect((await request(app).get('/health/live').set('Origin', 'https://bad.test')).headers['access-control-allow-origin']).toBeUndefined();
    const response = await request(app).get('/missing');
    expect(response.status).toBe(404);
    expect(response.body.meta.correlationId).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('publishes the auth OpenAPI contract and Swagger UI', async () => {
    const specification = await request(app).get('/openapi.json');
    expect(specification.status).toBe(200);
    expect(specification.body.openapi).toBe('3.1.0');
    expect(specification.body.paths['/v1/auth/login'].post.requestBody).toBeDefined();
    expect(specification.body.components.securitySchemes.bearerAuth).toBeDefined();

    const docs = await request(app).get('/docs/');
    expect(docs.status).toBe(200);
    expect(docs.text).toContain('<title>EBR/BPM API</title>');
  });
});
