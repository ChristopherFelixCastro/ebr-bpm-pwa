import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ clientQuery: vi.fn(), enqueueReset: vi.fn(), enqueueAlert: vi.fn(), audit: vi.fn(), hashPassword: vi.fn() }));
vi.mock('../../db/client.js', () => ({ withTransaction: (fn: (client: { query: typeof mocks.clientQuery }) => Promise<unknown>) => fn({ query: mocks.clientQuery }) }));
vi.mock('../../core/mail/mail.service.js', () => ({ enqueuePasswordReset: mocks.enqueueReset, enqueueAlert: mocks.enqueueAlert }));
vi.mock('../../core/audit/auth-audit.service.js', () => ({ writeAuthAudit: mocks.audit }));
vi.mock('../../core/auth/password.js', () => ({ hashPassword: mocks.hashPassword }));

import { env } from '../../config/env.js';
import { consumePasswordReset, requestPasswordReset } from '../../modules/auth/password-reset.js';

describe('recuperación de contraseña por correo', () => {
  beforeEach(() => { vi.clearAllMocks(); env.MAIL_MODE = 'local'; mocks.hashPassword.mockResolvedValue('HASHED_PASSWORD'); });

  it('encola un enlace sin guardar el token en claro y limita una petición repetida', async () => {
    mocks.clientQuery.mockResolvedValueOnce({ rows: [{ id: 'user-1', email: 'user@example.test' }] })
      .mockResolvedValueOnce({ rows: [{ count: 0, last: null }] })
      .mockResolvedValueOnce({ rows: [{ id: 'reset-1' }] });
    await requestPasswordReset('user@example.test', 'correlation-1');
    const insert = mocks.clientQuery.mock.calls[2];
    expect(insert[0]).toContain('INSERT INTO password_reset_tokens');
    expect(insert[1][1]).toMatch(/^[0-9a-f]{64}$/);
    const token = mocks.enqueueReset.mock.calls[0][4];
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(insert[1][1]).not.toBe(token);
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'AUTH_FORGOT_PASSWORD_REQUESTED' }));

    vi.clearAllMocks();
    mocks.clientQuery.mockResolvedValueOnce({ rows: [{ id: 'user-1', email: 'user@example.test' }] })
      .mockResolvedValueOnce({ rows: [{ count: 1, last: new Date() }] });
    await requestPasswordReset('user@example.test', 'correlation-2');
    expect(mocks.enqueueReset).not.toHaveBeenCalled();
  });

  it('consume una sola vez, cambia el hash y revoca renovaciones; rechaza un enlace usado', async () => {
    mocks.clientQuery.mockResolvedValueOnce({ rows: [{ id: 'reset-1', user_id: 'user-1' }] });
    const token = 'A'.repeat(43);
    expect(await consumePasswordReset(token, 'NuevaClaveSegura123!', 'correlation-1')).toBe(true);
    expect(mocks.clientQuery.mock.calls.some(([sql]) => String(sql).includes('UPDATE users SET password_hash'))).toBe(true);
    expect(mocks.clientQuery.mock.calls.some(([sql]) => String(sql).includes('UPDATE refresh_tokens SET revoked_at'))).toBe(true);
    expect(mocks.enqueueAlert).toHaveBeenCalledWith(expect.anything(), 'PASSWORD_CHANGED', 'user-1', 'reset-1', '/login');

    vi.clearAllMocks();
    mocks.clientQuery.mockResolvedValueOnce({ rows: [] });
    expect(await consumePasswordReset(token, 'OtraClaveSegura123!', 'correlation-2')).toBe(false);
    expect(mocks.hashPassword).not.toHaveBeenCalled();
  });
});
