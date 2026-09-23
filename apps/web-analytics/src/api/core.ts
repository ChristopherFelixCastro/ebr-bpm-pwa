import { CoreClient } from '@ebr-bpm/core-client';

export const core = new CoreClient({
  onSessionExpired: () => globalThis.window?.dispatchEvent(new Event('core-session-expired')),
});
