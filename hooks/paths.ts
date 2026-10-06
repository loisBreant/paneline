export function isInside(path: string, root: string): boolean {
  return path === root || path.startsWith(`${root}/`);
}

export function folderName(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

export function relativePath(path: string, cwd: string): string {
  const root = trimmedRoot(cwd);
  return root !== "" && path.startsWith(`${root}/`) ? path.slice(root.length + 1) : path;
}

export function tildePath(path: string, home: string | undefined): string {
  const root = trimmedRoot(home ?? "");
  return root !== "" && isInside(path, root) ? `~${path.slice(root.length)}` : path;
}

function trimmedRoot(path: string): string {
  return path.replace(/\/+$/, "");
}
