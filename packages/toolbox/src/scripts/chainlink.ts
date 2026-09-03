import { isAddressEqual, zeroAddress, type Address } from "viem";
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

// Chains listed here only expose the feeds below, everything else is skipped
const chainFeedAllowlist: Partial<Record<number, Address[]>> = {
  [ChainId.arc]: [
    "0x84EA90AC252Dc437031461836DB5164219147905", // USDC / USD
    "0xDd5B15443cd733D3966a50a3E48cB7DF9Fb5DE0D", // EUR / USD
    "0x361b95c10b76Ca3f35C686d423e43A951755Bf23", // EURC / USD
    "0xa109B535C70C8Be9995be64Bb6751AcDB27e03De", // BTC / USD
    "0x50FCDD99D6762D1C170DC6A9111db944AEE6D364", // ETH / USD
  ],
};

(async function getPriceFeeds() {
  const feeds = await Promise.all(
    Object.keys(chainToJson).map(async (key) => {
      const response = await fetch(
        `${baseUrl}feeds-${chainToJson[key as unknown as keyof typeof chainToJson]}.json`,
      );
      return response.json() as unknown as {
        contractAddress: Address;
        proxyAddress: Address;
        path: string;
        // seems to be always svr
        secondaryProxyAddress?: Address;
        decimals: number;
        name: string;
      }[];
    }),
  );
  const formattedFeeds = Object.keys(chainToJson).reduce(
    (acc, key, ix) => {
      const allowlist = chainFeedAllowlist[key as unknown as number];
      acc[key as unknown as number] = feeds[ix]
        .map((f) => {
          let name = f.name;
          if (/.*-shared-svr/.test(f.path)) {
            name = `SVR ${name}`;
          } else if (/.*-svr/.test(f.path)) {
            name = `AAVE SVR ${name}`;
          }
          return {
            contractAddress: f.contractAddress,
            proxyAddress: f.proxyAddress,
            decimals: f.decimals,
            name: name,
            ...(f.secondaryProxyAddress
              ? { secondaryProxyAddress: f.secondaryProxyAddress }
              : {}),
          };
        })
        .filter(
          (feed) =>
            feed.contractAddress !== zeroAddress &&
            (allowlist === undefined ||
              allowlist.some((address) =>
                isAddressEqual(address, feed.proxyAddress),
              )),
        );
      return acc;
    },
    {} as Record<
      number,
      {
        contractAddress: Address;
        proxyAddress: Address;
        secondaryProxyAddress?: Address;
        decimals: number;
        name: string;
      }[]
    >,
  );
  writeFileSync(
    "src/ecosystem/generated/chainlinkFeeds.ts",
    prefixWithGeneratedWarning(
      `export const chainlinkFeeds = ${JSON.stringify(formattedFeeds, null, 2)} as const;`,
    ),
  );
})();
