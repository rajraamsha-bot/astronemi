import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { SharedArray } from 'k6/data';

/**
 * AstroNemi Production Load Test (k6)
 * 
 * Simulates real-world user behavior under heavy load.
 * Target: 10,000 Concurrent Users (Simulated via Ramp-up)
 */

const BASE_URL = __ENV.BASE_URL || 'https://api.astronemi.app'; // Change to staging/prod URL

// Configuration: Ramping VUs (Virtual Users) to simulate traffic peaks
export const options = {
  scenarios: {
    constant_load: {
      executor: 'constant-arrival-rate',
      rate: 100, // 100 iterations per second
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 50,
      maxVUs: 500,
    },
    stress_peak: {
      executor: 'ramping-arrival-rate',
      startRate: 0,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 2000, // Scale up to 2000 Requests/Sec for high traffic events
      stages: [
        { duration: '2m', target: 500 },  // Ramp up to 500 req/s
        { duration: '3m', target: 500 },  // Hold at 500 req/s
        { duration: '2m', target: 1000 }, // Peak ramp
        { duration: '1m', target: 0 },    // Cool down
      ],
    },
  },
  thresholds: {
    // 🛡️ Performance SLA
    http_req_duration: ['p(95)<250', 'p(99)<500'], // 95% < 250ms, 99% < 500ms
    http_req_failed: ['rate<0.01'],               // Error rate < 1%
    'http_req_duration{type:heavy}': ['p(95)<1500'], // Heavy tasks like PDF generation
  },
};

// Simulated User Data
const USERS = new SharedArray('users', function () {
  return Array.from({ length: 1000 }, (_, i) => ({ 
    phone: `98000${String(i).padStart(5, '0')}`,
    sign: ['ares', 'taurus', 'gemini', 'cancer', 'leo', 'virgo'][i % 6]
  }));
});

export default function () {
  const user = USERS[Math.floor(Math.random() * USERS.length)];
  const headers = { 'Content-Type': 'application/json' };

  group('User Journey: Daily Horoscope', function () {
    const res = http.get(`${BASE_URL}/horoscopes/${user.sign}`, {
      tags: { name: 'Get Horoscope' },
    });
    check(res, {
      'status is 200': (r) => r.status === 200,
      'horoscope present': (r) => r.json('prediction') !== undefined,
    });
    sleep(1);
  });

  group('User Journey: Auth Flow', function () {
    // Simulate Login
    const loginRes = http.post(`${BASE_URL}/auth/otp-request`, 
      JSON.stringify({ phone: user.phone }), 
      { headers, tags: { name: 'Login Request' } }
    );
    check(loginRes, { 'login 200': (r) => r.status === 200 });

    // Simulate OTP Verify (Mocked)
    const verifyRes = http.post(`${BASE_URL}/auth/otp-verify`, 
      JSON.stringify({ phone: user.phone, otp: '123456' }), 
      { headers, tags: { name: 'OTP Verify' } }
    );
    check(verifyRes, { 'verify 200': (r) => r.status === 200 });
    sleep(Math.random() * 3 + 2); // Random dwell time
  });

  group('User Journey: Kundli Generation (Heavy)', function () {
    const payload = JSON.stringify({
      name: 'LoadTest',
      dob: '1990-01-01',
      tob: '12:00:00',
      lat: 19.0760,
      lng: 72.8777,
      tz: 5.5
    });
    
    const kundliRes = http.post(`${BASE_URL}/api/v1/kundli`, payload, {
      headers,
      tags: { name: 'Generate Kundli', type: 'heavy' },
    });
    
    check(kundliRes, {
      'kundli created': (r) => r.status === 201,
      'lagnam found': (r) => r.json('lagnam') !== undefined,
    });
    sleep(2);
  });

  group('User Journey: Astrologer Search', function () {
    const searchRes = http.get(`${BASE_URL}/astrologers/search?skill=vedic&language=hi`, {
      tags: { name: 'Search Astrologer' },
    });
    check(searchRes, { 'search 200': (r) => r.status === 200 });
  });
}
