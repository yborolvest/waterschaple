export function formatGlobalSolveText(count: number): string {
  if (count === 0) return 'Nog niemand heeft de puzzel vandaag opgelost';
  if (count === 1) return 'Vandaag <strong>1×</strong> opgelost door een speler';
  return `Vandaag <strong>${count.toLocaleString('nl-NL')}×</strong> opgelost door spelers`;
}
