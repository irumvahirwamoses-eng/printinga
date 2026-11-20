export function maskNationalId(nationalId: string): string {
  if (!nationalId || nationalId.length < 4) return '****';
  return `****${nationalId.slice(-4)}`;
}
