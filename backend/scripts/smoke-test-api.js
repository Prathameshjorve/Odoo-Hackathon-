const axios = require('axios');

const API = 'http://localhost:4000';
const admin = { email: 'admin@bookfastx.com', password: 'admin123' };
const refundId = process.argv[2];

async function waitForServer() {
  for (let i = 0; i < 20; i++) {
    try {
      const r = await axios.get(`${API}/health`);
      if (r.status === 200) return;
    } catch (e) {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('Server did not become ready');
}

(async () => {
  if (!refundId) {
    console.error('Usage: node smoke-test-api.js <refundId>');
    process.exit(2);
  }

  try {
    await waitForServer();
    console.log('Server ready, logging in as admin...');
    const login = await axios.post(`${API}/auth/login`, admin);
    const token = login.data.data.accessToken;
    console.log('Received access token');

    console.log('Calling process refund endpoint for', refundId);
    const resp = await axios.post(`${API}/api/organization/refunds/${refundId}/process`, { overrideReason: 'Test run', overrideAmount: 1000 }, { headers: { Authorization: `Bearer ${token}` } });
    console.log('Process response:', resp.data);
  } catch (e) {
    if (e.response) console.error('Error response:', e.response.status, e.response.data);
    else console.error('Error:', e.message || e);
    process.exit(2);
  }
})();
