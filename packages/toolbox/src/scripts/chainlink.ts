import { zeroAddress, type Address } from "viem";
import { ChainId } from "../ecosystem/chainIds";
import { writeFileSync } from "node:fs";
import { prefixWithGeneratedWarning } from "./common";

const baseUrl = "https://reference-data-directory.vercel.app/";

const chainToJson = {
  [ChainId.mainnet]: "mainnet",
  [ChainId.bnb]: "bsc-mainnet",
  [ChainId.polygon]: "matic-mainnet",
  [ChainId.gnosis]: "xdai-mainnet",
  [ChainId.avalanche]: "avalanche-mainnet",
  [ChainId.arbitrum]: "ethereum-mainnet-arbitrum-1",
  [ChainId.optimism]: "ethereum-mainnet-optimism-1",
  [ChainId.metis]: "ethereum-mainnet-andromeda-1",
  [ChainId.base]: "ethereum-mainnet-base-1",
  [ChainId.celo]: "celo-mainnet",
  [ChainId.scroll]: "ethereum-mainnet-scroll-1",
  [ChainId.linea]: "ethereum-mainnet-linea-1",
  [ChainId.zksync]: "ethereum-mainnet-zksync-1",
  [ChainId.soneium]: "soneium-mainnet",
  [ChainId.sonic]: "sonic-mainnet",
  [ChainId.mantle]: "ethereum-mainnet-mantle-1",
  [ChainId.arc]: "arc-mainnet",
};

type UpstreamFeed = {
  contractAddress: Address;
  proxyAddress: Address | null;
  path: string;
  secondaryProxyAddress?: Address;
  svrDisplayLabel?: string;
  decimals: number;
  name: string;
};

type GeneratedFeed = {
  contractAddress: Address;
  proxyAddress: Address | null;
  decimals: number;
  name: string;
  path: string;
  svrDisplayLabel?: string;
  secondaryProxyAddress?: Address;
};

// upstream tags every svr feed with the protocol it was deployed for; the feeds
// of different protocols carry the same `name`, so the label is what keeps them apart
const svrNamePrefixes: Record<string, string> = {
  "Aave SVR": "AAVE SVR",
  "Shared SVR": "SVR",
};
const ignoredSvrLabels = ["Compound SVR"];

function prefixedName(feed: UpstreamFeed) {
  const label = feed.svrDisplayLabel;
  if (!label) return feed.name;
  const prefix = svrNamePrefixes[label];
  if (!prefix)
    throw new Error(`Unhandled svrDisplayLabel "${label}" on ${feed.path}`);
  return `${prefix} ${feed.name}`;
}

/** Number of leading `-` separated path segments every path shares. */
function commonSegments(paths: string[]) {
  const [first, ...rest] = paths.map((path) => path.split("-"));
  let shared = 0;
  while (
    shared < first.length &&
    rest.every((segments) => segments[shared] === first[shared])
  )
    shared++;
  return shared;
}

/**
 * Upstream publishes variants of a feed (`-cre-backup`, `-fx`, `-2`, ...) under the
 * name of the feed they vary, so the name alone cannot key a feed. The variant keeps
 * the part of its path that the collision does not share as a qualifier, which leaves
 * the plain name on the feed whose path is exactly the shared stem.
 */
function qualifyCollidingNames(feeds: (UpstreamFeed & { name: string })[]) {
  const byName = new Map<string, (UpstreamFeed & { name: string })[]>();
  for (const feed of feeds) {
    const collisions = byName.get(feed.name);
    if (collisions) collisions.push(feed);
    else byName.set(feed.name, [feed]);
  }
  for (const [name, collisions] of byName) {
    if (collisions.length === 1) continue;
    const shared = commonSegments(collisions.map((feed) => feed.path));
    for (const feed of collisions) {
      const qualifier = feed.path
        .split("-")
        .slice(shared)
        .join(" ")
        .toUpperCase();
      if (!qualifier) continue;
      // a leading digit cannot start an identifier in the downstream generators
      feed.name = /^\d/.test(qualifier)
        ? `${name} ${qualifier}`
        : `${qualifier} ${name}`;
    }
  }
  return feeds;
}

function assertUniqueNames(chainId: string, feeds: GeneratedFeed[]) {
  const seen = new Map<string, string>();
  for (const feed of feeds) {
    const clash = seen.get(feed.name);
    if (clash)
      throw new Error(
        `Duplicate feed name "${feed.name}" on chain ${chainId}: ${clash} and ${feed.path}`,
      );
    seen.set(feed.name, feed.path);
  }
}

(async function getPriceFeeds() {
  const feeds = await Promise.all(
    Object.keys(chainToJson).map(async (key) => {
      const response = await fetch(
        `${baseUrl}feeds-${chainToJson[key as unknown as keyof typeof chainToJson]}.json`,
      );
      return response.json() as unknown as UpstreamFeed[];
    }),
  );
  const formattedFeeds = Object.keys(chainToJson).reduce(
    (acc, key, ix) => {
      const relevant = feeds[ix]
        .filter((feed) => feed.contractAddress !== zeroAddress)
        .filter(
          (feed) => !ignoredSvrLabels.includes(feed.svrDisplayLabel ?? ""),
        )
        .map((feed) => ({ ...feed, name: prefixedName(feed) }));
      const formatted = qualifyCollidingNames(relevant).map((feed) => ({
        contractAddress: feed.contractAddress,
        proxyAddress: feed.proxyAddress,
        decimals: feed.decimals,
        name: feed.name,
        path: feed.path,
        ...(feed.svrDisplayLabel
          ? { svrDisplayLabel: feed.svrDisplayLabel }
          : {}),
        ...(feed.secondaryProxyAddress
          ? { secondaryProxyAddress: feed.secondaryProxyAddress }
          : {}),
      }));
      assertUniqueNames(key, formatted);
      acc[key as unknown as number] = formatted;
      return acc;
    },
    {} as Record<number, GeneratedFeed[]>,
  );
  writeFileSync(
    "src/ecosystem/generated/chainlinkFeeds.ts",
    prefixWithGeneratedWarning(
      `export const chainlinkFeeds = ${JSON.stringify(formattedFeeds, null, 2)} as const;`,
    ),
  );
})();
