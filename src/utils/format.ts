export function formatNaira(value: number | string): string {
  const n = Number(value || 0);
  if (Number.isNaN(n)) return '₦0';
  return `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}
