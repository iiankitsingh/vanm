/**
 * Parses an ISO 8601 duration (e.g. PT2H30M) into total number of minutes
 */
export function parseISODuration(duration: string): number {
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?/;
  const matches = duration.match(regex);
  if (!matches) return 0;

  const hours = matches[1] ? parseInt(matches[1], 10) : 0;
  const minutes = matches[2] ? parseInt(matches[2], 10) : 0;

  return hours * 60 + minutes;
}
