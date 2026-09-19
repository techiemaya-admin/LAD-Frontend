/**
 * getFullPhoneNumber — the dial-code guard must not eat the first digits of a
 * national number that happens to start with them.
 *
 * 2026-09-19: +91 / "9182573443" was sent to VOAG as "+9182573443" and the
 * call failed as "sip_trunk_auth_failure" (Sasya 401/407 on an unroutable
 * destination). Every Indian mobile beginning with 91, and every UAE number
 * beginning with 971, hit the same path.
 */
import { describe, expect, it } from "vitest";
import { callErrorMessage, getFullPhoneNumber } from "../phone";

describe("getFullPhoneNumber", () => {
  it("keeps a 10-digit Indian mobile that starts with 91", () => {
    expect(getFullPhoneNumber("9182573443", "+91")).toBe("+919182573443");
  });

  it("still recognises the same number pasted with its country code", () => {
    expect(getFullPhoneNumber("919182573443", "+91")).toBe("+919182573443");
  });

  it("tolerates spaces", () => {
    expect(getFullPhoneNumber("91825 73443", "+91")).toBe("+919182573443");
  });

  it("keeps a UAE number that starts with 971's digits", () => {
    // 9 digits: a national number, not +97 + something.
    expect(getFullPhoneNumber("971234567", "+971")).toBe("+971971234567");
    expect(getFullPhoneNumber("971501234567", "+971")).toBe("+971501234567");
  });

  it("passes through a + number untouched", () => {
    expect(getFullPhoneNumber("+919731932015", "+1")).toBe("+919731932015");
  });

  it("falls back to the prefix heuristic for a country without a known length", () => {
    expect(getFullPhoneNumber("6591234567", "+65")).toBe("+6591234567");
    expect(getFullPhoneNumber("91234567", "+65")).toBe("+6591234567");
  });

  it("does not strip anything from a number that is short for its country", () => {
    // Two digits short: still send it as typed under the chosen country so the
    // voice service can say exactly what is wrong.
    expect(getFullPhoneNumber("82573443", "+91")).toBe("+9182573443");
  });
});

describe("callErrorMessage", () => {
  it("prefers the voice service's detail over the backend's generic wrapper", () => {
    const e = Object.assign(new Error("Failed to initiate call with voice service"), {
      body: {
        error: "Failed to initiate call with voice service",
        details: { detail: "Invalid destination number '+9182573443': Indian numbers need 10 digits after +91, got 8." },
      },
    });
    expect(callErrorMessage(e)).toMatch(/Indian numbers need 10 digits/);
  });

  it("uses a string details as-is", () => {
    const e = Object.assign(new Error("x"), { body: { details: "connect ECONNREFUSED" } });
    expect(callErrorMessage(e)).toBe("connect ECONNREFUSED");
  });

  it("falls back to the error message, then the default", () => {
    expect(callErrorMessage(new Error("Please select a voice agent"))).toBe("Please select a voice agent");
    expect(callErrorMessage(undefined)).toBe("Failed to initiate call. Please try again.");
  });
});
