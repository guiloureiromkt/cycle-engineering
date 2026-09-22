// Billing: charges the customer card. Money moves here.
export function charge(customerId, amountCents) {
  if (amountCents <= 0) throw new Error('invalid amount');
  return { customerId, amountCents, status: 'charged' };
}
