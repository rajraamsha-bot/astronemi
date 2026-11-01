import * as rateLimiter from '../../utils/rate-limiter';

describe('rate-limiter shim', () => {
  it('should export rate limiter services', () => {
    expect(rateLimiter).toBeDefined();
  });
});
