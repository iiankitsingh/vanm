/**
 * Extracts the hour of departure (0-23) from a date-time string
 */
export function getDepartureHour(dateTimeString: string): number {
  // Handles strings like "2026-07-01T06:00:00"
  const date = new Date(dateTimeString);
  if (isNaN(date.getTime())) {
    // Fallback regex parsing if Date parser is not happy with the string
    const match = dateTimeString.match(/T(\d{2}):/);
    return match ? parseInt(match[1], 10) : 0;
  }
  return date.getHours();
}
