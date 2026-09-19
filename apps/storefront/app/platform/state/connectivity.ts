export type ConnectivityHint = "unknown" | "online" | "offline";

type BrowserRuntime = typeof globalThis & {
  navigator?: {
    onLine?: boolean;
  };
  addEventListener?: (type: "online" | "offline", listener: () => void) => void;
  removeEventListener?: (type: "online" | "offline", listener: () => void) => void;
};

export function connectivityHintFromOnlineFlag(
  online: boolean | undefined,
): ConnectivityHint {
  if (online === undefined) return "unknown";
  return online ? "online" : "offline";
}

export function readBrowserConnectivityHint(): ConnectivityHint {
  const runtime = globalThis as BrowserRuntime;
  return connectivityHintFromOnlineFlag(runtime.navigator?.onLine);
}

export function subscribeBrowserConnectivityHint(
  listener: () => void,
): () => void {
  const runtime = globalThis as BrowserRuntime;
  if (!runtime.addEventListener || !runtime.removeEventListener) return () => undefined;

  runtime.addEventListener("online", listener);
  runtime.addEventListener("offline", listener);

  return () => {
    runtime.removeEventListener?.("online", listener);
    runtime.removeEventListener?.("offline", listener);
  };
}
