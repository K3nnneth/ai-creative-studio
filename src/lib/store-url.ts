import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const blockedHostnames = new Set(["localhost", "localhost.localdomain"]);

function isPrivateIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return true;

  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

function isPrivateIpv6(address: string) {
  const normalized = address.toLowerCase();
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb") ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.")
  );
}

function isPrivateAddress(address: string) {
  const version = isIP(address);
  if (version === 4) return isPrivateIpv4(address);
  if (version === 6) return isPrivateIpv6(address);
  return true;
}

export type NormalizedStoreUrl = {
  canonicalDomain: string;
  normalizedUrl: string;
};

export async function normalizePublicStoreUrl(input: string): Promise<NormalizedStoreUrl> {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 2048) throw new Error("Enter a valid store URL.");

  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;

  try {
    url = new URL(candidate);
  } catch {
    throw new Error("Enter a valid store URL.");
  }

  if (!['http:', 'https:'].includes(url.protocol)) throw new Error("Only HTTP and HTTPS store URLs are supported.");
  if (url.username || url.password) throw new Error("Store URLs cannot contain credentials.");
  if (url.port && !['80', '443'].includes(url.port)) throw new Error("That URL uses an unsupported port.");

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (
    !hostname ||
    blockedHostnames.has(hostname) ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new Error("Enter a public store URL.");
  }

  if (isIP(hostname) && isPrivateAddress(hostname)) throw new Error("Enter a public store URL.");

  let addresses: Array<{ address: string; family: number }>;
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error("We couldn’t reach that store. Check the URL and try again.");
  }

  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("Enter a public store URL.");
  }

  url.hostname = hostname;
  url.hash = "";
  if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) url.port = "";

  return {
    canonicalDomain: hostname.replace(/^www\./, ""),
    normalizedUrl: url.toString(),
  };
}
