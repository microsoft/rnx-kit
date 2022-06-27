const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

const { now, parse: parseDate } = Date;
const floor = Math.floor;

export function elapsedTime(
  startTime: string,
  endTime?: string | null
): string {
  const end = endTime ? parseDate(endTime) : now();
  const elapsed = end - parseDate(startTime);

  const hours = floor(elapsed / MS_PER_HOUR);
  const minutes = floor((elapsed % MS_PER_HOUR) / MS_PER_MINUTE);
  const seconds = floor((elapsed % MS_PER_MINUTE) / MS_PER_SECOND);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}
