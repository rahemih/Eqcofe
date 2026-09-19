export type ConnectivityHint = "unknown" | "online" | "offline";

export function connectivityHintFromOnlineFlag(
  online: boolean | undefined,
): ConnectivityHint {
  if (online === undefined) return "unknown";
  return online ? "online" : "offline";
}

export function readBrowserConnectivityHint(): ConnectivityHint {
  if (typeof navigator === "undefined") return "unknown";
  return connectivityHintFromOnlineFlag(navigator.onLine);
}

export function subscribeBrowserConnectivityHint(
  listener: () => void,
): () => void {
  if (typeof window === "undefined") return () => undefined;

  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);

  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}
