/** Format integer rupees with Indian digit grouping: 123456 → "₹1,23,456". */
export function formatINR(amount: number): string {
  return "₹" + amount.toLocaleString("en-IN");
}

/** Mask a phone number for display: +919876543210 → "+91 98••• •••10". */
export function maskPhone(phone: string): string {
  if (phone.length < 8) return phone;
  return `${phone.slice(0, 5)}••• •••${phone.slice(-2)}`;
}
