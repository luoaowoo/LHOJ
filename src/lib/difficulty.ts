export function difficultyColor(value: string): string {
  const normalized = value.toLowerCase();
  if (/入门|easy|1|2/.test(normalized)) return '#42d392';
  if (/普及|medium|3|4/.test(normalized)) return '#ffc247';
  if (/提高|hard|5|6/.test(normalized)) return '#63d4eb';
  return '#c77dff';
}
