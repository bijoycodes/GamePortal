import { isValidHttpUrl } from "@/lib/format";

/** Game files must live on a different origin from the portal (docs/02 and docs/09). */
export function isSafePlayerUrl(url: string, appOrigin?: string): boolean {
  if (!isValidHttpUrl(url)) return false;
  try {
    const player = new URL(url);
    if (!appOrigin) return true;
    return player.origin !== new URL(appOrigin).origin;
  } catch {
    return false;
  }
}
