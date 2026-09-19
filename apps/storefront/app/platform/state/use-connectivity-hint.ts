import { useSyncExternalStore } from "react";
import {
  readBrowserConnectivityHint,
  subscribeBrowserConnectivityHint,
  type ConnectivityHint,
} from "./connectivity.js";

export function useConnectivityHint(): ConnectivityHint {
  return useSyncExternalStore(
    subscribeBrowserConnectivityHint,
    readBrowserConnectivityHint,
    () => "unknown",
  );
}
