import type { UserSummary } from '@gabinete-plus/shared';
import type { LockedRefreshToken, NewSession, SessionRepository } from './session.repository.js';

interface SessionState {
  id: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export class MemorySessions implements SessionRepository {
  readonly sessions = new Map<string, SessionState>();
  readonly tokens = new Map<string, { sessionId: string; consumedAt: Date | null }>();
  private pending = Promise.resolve();

  constructor(public user: UserSummary) {}

  create(session: NewSession): Promise<void> {
    this.sessions.set(session.id, { id: session.id, expiresAt: session.expiresAt, revokedAt: null });
    this.tokens.set(session.tokenHash, { sessionId: session.id, consumedAt: null });
    return Promise.resolve();
  }

  async withToken<T>(hash: string, operation: (record: LockedRefreshToken | null) => Promise<T>): Promise<T> {
    const previous = this.pending;
    let release: (() => void) | undefined;
    this.pending = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try {
      const token = this.tokens.get(hash);
      const session = token ? this.sessions.get(token.sessionId) : undefined;
      if (!token || !session) return await operation(null);
      return await operation({
        sessionId: session.id, expiresAt: session.expiresAt, revokedAt: session.revokedAt,
        consumedAt: token.consumedAt, user: this.user,
        revoke: (now) => { session.revokedAt ??= now; return Promise.resolve(); },
        rotate: (nextHash, now) => {
          token.consumedAt = now;
          this.tokens.set(nextHash, { sessionId: session.id, consumedAt: null });
          return Promise.resolve();
        },
      });
    } finally {
      release?.();
    }
  }
}
