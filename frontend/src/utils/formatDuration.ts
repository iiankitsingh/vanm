/**
 * Formats an ISO 8601 duration string (e.g., PT2H30M) into a user-friendly string (e.g., "2h 30m")
 */
export function formatDuration(duration: string): string {
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?/;
  const matches = duration.match(regex);
  if (!matches) return duration;

  const hours = matches[1] ? parseInt(matches[1], 10) : 0;
  const minutes = matches[2] ? parseInt(matches[2], 10) : 0;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h 0m`;
  } else {
    return `${minutes}m`;
  }
}
