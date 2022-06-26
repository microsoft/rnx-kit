const SECONDS = 1000;
const MINUTES = 60 * SECONDS;
const HOURS = 60 * MINUTES;

const { now, parse: parseDate } = Date;
const floor = Math.floor;

export function elapsedTime(
  startTime: string,
  endTime?: string | null
): string {
  const end = endTime ? parseDate(endTime) : now();
  const elapsed = end - parseDate(startTime);

  const hours = floor(elapsed / HOURS);
  const minutes = floor((elapsed % HOURS) / MINUTES);
  const seconds = floor((elapsed % MINUTES) / SECONDS);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}
