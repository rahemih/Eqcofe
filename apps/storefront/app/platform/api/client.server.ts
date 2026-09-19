import { readServerApiConfig } from "../config/api.server.js";
import { createApiClient } from "./request.js";

export function createServerApiClient() {
  return createApiClient(readServerApiConfig());
}
