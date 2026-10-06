let shown = "";
let isEntering = false;

export function noteShownTab(id: string): void {
  isEntering = shown !== id;
  shown = id;
}

export function isShownTab(id: string): boolean {
  return shown === id;
}

export function justEntered(id: string): boolean {
  return isEntering && shown === id;
}

export function forgetShownTab(): void {
  shown = "";
  isEntering = false;
}
