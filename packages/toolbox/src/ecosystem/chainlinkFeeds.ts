import { Address } from "viem";
import { chainlinkFeeds } from "./generated/chainlinkFeeds";

export type ChainlinkFeed = {
  contractAddress: Address;
  proxyAddress: Address;
  secondaryProxyAddress?: Address;
  decimals: number;
  name: string;
};

export type ChainlinkFeedMatch = ChainlinkFeed & {
  matchedOn: "proxy" | "secondary";
};

// upstream lists some feeds without a proxy, so the generated type is wider than it looks
type GeneratedFeed = Omit<ChainlinkFeed, "proxyAddress"> & {
  proxyAddress: Address | null;
};

const indexes = new Map<number, Map<string, ChainlinkFeedMatch>>();

function getIndex(chainId: number) {
  const cached = indexes.get(chainId);
  if (cached) return cached;

  const feeds = chainlinkFeeds[
    String(chainId) as keyof typeof chainlinkFeeds
  ] as readonly GeneratedFeed[] | undefined;
  const index = new Map<string, ChainlinkFeedMatch>();
  if (feeds) {
    const withProxy = feeds.filter(
      (feed): feed is ChainlinkFeed => feed.proxyAddress !== null,
    );
    for (const feed of withProxy) {
      index.set(feed.proxyAddress.toLowerCase(), {
        ...feed,
        matchedOn: "proxy",
      });
    }
    // a proxy of one feed can never be shadowed by the secondary of another
    for (const feed of withProxy) {
      if (!feed.secondaryProxyAddress) continue;
      const key = feed.secondaryProxyAddress.toLowerCase();
      if (index.has(key)) continue;
      index.set(key, { ...feed, matchedOn: "secondary" });
    }
  }
  indexes.set(chainId, index);
  return index;
}

/**
 * Resolves a feed from any address it answers to. Chainlink sometimes demotes a
 * standalone feed to the `secondaryProxyAddress` of an SVR entry, which keeps
 * the address live while removing it as a `proxyAddress`, so `matchedOn` tells
 * the caller which of the two contracts it actually asked about.
 * @param chainId Id of the chain the address lives on
 * @param address Feed proxy or secondary proxy address
 */
export function getChainlinkFeed({
  chainId,
  address,
}: {
  chainId: number;
  address: Address;
}): ChainlinkFeedMatch | undefined {
  return getIndex(chainId).get(address.toLowerCase());
}
