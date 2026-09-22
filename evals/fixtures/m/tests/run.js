import { charge } from '../src/billing.js';
const r = charge('c1', 100); if (r.status !== 'charged') { console.error('FAIL'); process.exit(1); } console.log('1 test ok');
