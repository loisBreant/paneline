export function failureText(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return `paneline: could not open the pane: ${message}`;
}
