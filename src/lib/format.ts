export function formatCurrency(usd: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(usd);
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function formatMb(mb: number): string {
  return `${Math.round(mb).toLocaleString()} MB`;
}
