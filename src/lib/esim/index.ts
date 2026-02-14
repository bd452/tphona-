import { OneGlobalProvider } from "@/lib/esim/one-global-provider";
import type { EsimProvider } from "@/lib/esim/types";
import type { ProviderName } from "@/lib/types";

const oneGlobalProvider = new OneGlobalProvider();

export function getEsimProvider(providerName: ProviderName): EsimProvider {
  switch (providerName) {
    case "1global":
      return oneGlobalProvider;
    default: {
      const exhaustiveCheck: never = providerName;
      throw new Error(`Unsupported provider: ${exhaustiveCheck}`);
    }
  }
}
