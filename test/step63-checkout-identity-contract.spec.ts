import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const openapi = readFileSync("contracts/http/openapi.yaml", "utf8");
const generated = readFileSync("src/generated/openapi.ts", "utf8");
const controller = readFileSync("src/modules/identity/presentation/auth.controller.ts", "utf8");
const service = readFileSync("src/modules/identity/application/auth.service.ts", "utf8");

const auth = openapi.slice(openapi.indexOf("  /auth/otp/request:"), openapi.indexOf("  /cart:"));
assert.match(controller, /@Post\('auth\/otp\/request'\)[\s\S]*return this\.auth\.requestOtp/);
assert.match(service, /return \{challenge_id:id,expires_at:expiresAt\}/);
assert.match(auth, /\/auth\/otp\/request:[\s\S]*'201':[\s\S]*challenge_id:[\s\S]*expires_at:/);
assert.match(auth, /\/auth\/otp\/request:[\s\S]*'401':[\s\S]*Unauthorized/);
assert.match(auth, /\/auth\/otp\/request:[\s\S]*'429':[\s\S]*TooManyRequests/);
assert.doesNotMatch(auth.slice(0, auth.indexOf("  /auth/otp/verify:")), /'202':/);

assert.match(controller, /@Post\('auth\/otp\/verify'\)[\s\S]*session_id:s\.session_id,expires_at:s\.expires_at/);
assert.match(service, /OTP_INVALID/);
assert.match(service, /OTP_EXPIRED_OR_CONSUMED/);
assert.match(service, /OTP_ATTEMPTS_EXCEEDED/);
assert.match(auth, /\/auth\/otp\/verify:[\s\S]*'200':[\s\S]*session_id:[\s\S]*expires_at:/);
assert.match(auth, /\/auth\/otp\/verify:[\s\S]*pattern: ["']\^\[0-9\]\{6\}\$["']/);
assert.match(auth, /\/auth\/otp\/verify:[\s\S]*'401':[\s\S]*Unauthorized/);
assert.match(auth, /\/auth\/otp\/verify:[\s\S]*'429':[\s\S]*TooManyRequests/);

assert.match(generated, /requestOtp:[\s\S]*201:[\s\S]*challenge_id: components\["schemas"\]\["EntityId"\]/);
assert.match(generated, /verifyOtp:[\s\S]*200:[\s\S]*session_id: components\["schemas"\]\["EntityId"\]/);
assert.doesNotMatch(generated, /requestOtp:[\s\S]{0,1800}202:/);
assert.doesNotMatch(generated, /verifyOtp:[\s\S]{0,1800}422:/);

const dir = mkdtempSync(join(tmpdir(), "eqcofe-step63-e-openapi-"));
const output = join(dir, "openapi.ts");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
try {
  execFileSync(pnpm, ["exec", "openapi-typescript", "contracts/http/openapi.yaml", "-o", output], { stdio: "pipe" });
  assert.equal(generated, readFileSync(output, "utf8"), "STEP63_E_GENERATED_OPENAPI_DRIFT");
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log(JSON.stringify({
  status: "PASS",
  stage: "63-E",
  otpRequestStatus: 201,
  otpRequestTyped: true,
  otpVerifyTyped: true,
  backendMutation: false,
  generatedParity: true
}));
