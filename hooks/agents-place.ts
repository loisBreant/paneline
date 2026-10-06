export type Place = { root: string; branch: string };

const FILE_FIELDS = ["file_path", "notebook_path"];
const LEADING_CD = /^\s*cd\s+"?(\/[^\s"&;|]+)/;

export function directoryOf(call: object): string | undefined {
  const fields = call as Record<string, unknown>;
  const command = fields.command;
  const moved = typeof command === "string" ? LEADING_CD.exec(command)?.[1] : undefined;
  if (moved) return moved;
  const file = FILE_FIELDS.map((name) => fields[name]).find(
    (value): value is string => typeof value === "string" && value.startsWith("/"),
  );
  return file?.slice(0, file.lastIndexOf("/")) || undefined;
}
