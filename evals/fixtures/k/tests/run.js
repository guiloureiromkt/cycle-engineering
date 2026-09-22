import { createOrder } from '../src/orders.js';
const r = createOrder('sku1', 2); if (r.status !== 'created') { console.error('FAIL'); process.exit(1); } console.log('1 test ok');
