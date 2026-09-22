// Orders: creates an order line. No coverage tool wired up in this fixture yet.
export function createOrder(sku, qty) {
  if (qty <= 0) throw new Error('invalid quantity');
  return { sku, qty, status: 'created' };
}
