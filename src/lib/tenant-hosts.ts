const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

function normalizeHost(host: string): string {
  return host.toLowerCase().split(":")[0];
}

export function resolveTenantSlugFromHost(hostHeader: string | null): string | null {
  if (!hostHeader) {
    return null;
  }

  const host = normalizeHost(hostHeader);
  if (LOCAL_HOSTS.has(host)) {
    return null;
  }

  if (host.endsWith(".localhost")) {
    return host.replace(".localhost", "");
  }

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.toLowerCase();
  if (rootDomain && host.endsWith(`.${rootDomain}`)) {
    return host.replace(`.${rootDomain}`, "");
  }

  return null;
}
