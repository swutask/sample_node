const { apiClient } = require('./common/api-client');

describe('health', () => {
  it('/ 200', async () => {
    const resp = await apiClient.get('/health');

    expect(resp.status).toBe(200);
    expect(resp.data).toBe('OK');
  });
});
