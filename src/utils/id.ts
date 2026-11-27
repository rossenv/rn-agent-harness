let counter = 0;

// An id that's unique on this device: the time, plus a counter for ids made in the same millisecond.
export function createId(): string {
  counter += 1;
  return `${Date.now().toString(36)}-${counter.toString(36)}`;
}
