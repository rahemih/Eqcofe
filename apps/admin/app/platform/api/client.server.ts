import { readAdminServerApiConfig } from "../config/api.server.js";
import { createApiClient } from "./request.server.js";
export function createAdminServerApiClient(){ return createApiClient(readAdminServerApiConfig()); }
