import { describe, expect, it } from "vitest";
import { getChainlinkFeed } from "./chainlinkFeeds";
import { ChainId } from "./chainIds";
import { chainlinkFeeds } from "./generated/chainlinkFeeds";

describe("ecosystem:chainlinkFeeds", () => {
  it("should resolve a feed by its proxy", () => {
    const feed = getChainlinkFeed({
      chainId: ChainId.arc,
      address: "0x84EA90AC252Dc437031461836DB5164219147905",
    });
    expect(feed).toMatchObject({
      name: "SVR USDC / USD",
      proxyAddress: "0x84EA90AC252Dc437031461836DB5164219147905",
      decimals: 8,
      matchedOn: "proxy",
    });
  });

  it("should resolve a feed by its secondary proxy", () => {
    // upstream moved base eth/usd into `eth-usd-shared-svr-2` as the secondary
    const feed = getChainlinkFeed({
      chainId: ChainId.base,
      address: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",
    });
    expect(feed).toMatchObject({
      name: "SVR ETH / USD",
      path: "eth-usd-shared-svr-2",
      svrDisplayLabel: "Shared SVR",
      proxyAddress: "0x50015f8b17fb2C290Dde41fDc246ed0dcEE93a8b",
      secondaryProxyAddress: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",
      matchedOn: "secondary",
    });
  });

  it("should name aave specific svr feeds from their label", () => {
    const feed = getChainlinkFeed({
      chainId: ChainId.base,
      address: "0x9dA00D23465282005DB222a441a663eE7B9dfCc8",
    });
    expect(feed).toMatchObject({
      name: "AAVE SVR ETH / USD",
      svrDisplayLabel: "Aave SVR",
      proxyAddress: "0xa4250cE1aA15Ff4cb5E5a8655293b65694e436Ed",
      matchedOn: "secondary",
    });
  });

  it("should name shared svr feeds from their label even without an svr path", () => {
    // upstream path is `usfron-usd-ondo-api`, only `svrDisplayLabel` marks it as shared svr
    const feed = getChainlinkFeed({
      chainId: ChainId.mainnet,
      address: "0x114f2004E772111692a532b438b9EEE37d97D668",
    });
    expect(feed?.name).toEqual("SVR USFRon-USD (Ondo API)");
  });

  it.each([
    // eth / usd, btc / usd and usdc / usd on base, secondary and proxy
    "0x1428C9E908e32dD2839F99D63C242c91329A58C0",
    "0x5731Ae06077c79A3B292498940211E0aE7130bd3",
    "0x03Df23A32C83cA8cD9B1aAC0aF1c72924af7502b",
    "0x8D9e0911A532e2a3C005667B475E6F9742355f2b",
    "0x1401Fd60F9ba4F718a2fE6149aadf3d1F0dB1b0A",
    "0xd0Dc8c910565D94D408729D16bE5467B5d7633Ad",
  ] as const)("should skip compound svr feed %s", (address) => {
    expect(
      getChainlinkFeed({ chainId: ChainId.base, address }),
    ).toBeUndefined();
  });

  it.each([
    {
      name: "BTC / USD",
      proxy: "0x6ce185860a4963106506C203335A2910413708e9",
      backup: "0xf5166f957d716D26488f185E5B1d378839724530",
    },
    {
      name: "LINK / USD",
      proxy: "0x86E53CF1B870786351Da77A57575e79CB55812CB",
      backup: "0x737ab6fB310A38Bf7592FB62F47fb416c4624B0c",
    },
    {
      name: "USDT / USD",
      proxy: "0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7",
      backup: "0x13c110Ba22A50E3C7980691983565081283A1970",
    },
  ] as const)(
    "should keep the main arbitrum $name feed and skip its cre-backup",
    ({ name, proxy, backup }) => {
      expect(
        getChainlinkFeed({ chainId: ChainId.arbitrum, address: proxy }),
      ).toMatchObject({ name, decimals: 8 });
      expect(
        getChainlinkFeed({ chainId: ChainId.arbitrum, address: backup }),
      ).toBeUndefined();
      expect(
        chainlinkFeeds[ChainId.arbitrum].filter((feed) => feed.name === name),
      ).toHaveLength(1);
    },
  );

  it.each(Object.entries(chainlinkFeeds))(
    "should have unique names on chain %s",
    (_, feeds) => {
      // consumers key feeds by name, so a duplicate silently overwrites a feed
      const names = feeds.map((feed) => feed.name);
      expect(names.filter((n, i) => names.indexOf(n) !== i)).toEqual([]);
    },
  );

  it.each([
    {
      chainId: ChainId.avalanche,
      address: "0x32543Ad9dDAC8f883eE4d3c0a21a24E095A9E1B0",
      name: "XCU / USD",
    },
    {
      chainId: ChainId.avalanche,
      address: "0x70F88d3083FC1CA357f1efAF89F2F53281e09f5b",
      name: "XCU / USD (xcu-usd-new)",
    },
    {
      chainId: ChainId.celo,
      address: "0x235e5c8697177931459fA7D19fba7256d29F17DA",
      name: "NGN / USD",
    },
    {
      chainId: ChainId.celo,
      address: "0xc17cBE2dB40e53F4984C46F608DA6DA1fF074c11",
      name: "NGN / USD (ngn-usd-fx)",
    },
    // shipped constants point to the visible feeds, not the hidden path matches
    {
      chainId: ChainId.celo,
      address: "0xf323563241BF8B77a2979e9edC1181788A98EcB2",
      name: "JPY / USD",
    },
    {
      chainId: ChainId.celo,
      address: "0x6312034F70390d09bb03F789F84f00215a444AEa",
      name: "JPY / USD (jpy-usd)",
    },
    {
      chainId: ChainId.celo,
      address: "0x0826492a24b1dBd1d8fcB4701b38C557CE685e9D",
      name: "KES / USD",
    },
    {
      chainId: ChainId.celo,
      address: "0x116Ac3EA0C18D101581E927A449851Ab720a39C1",
      name: "KES / USD (kes-usd)",
    },
    {
      chainId: ChainId.celo,
      address: "0x8e1f834ca4B8Efd81D9c557426C70ed5F67e87B1",
      name: "KES / USD (kes-usd-fx)",
    },
  ] as const)(
    "should suffix duplicate names with the path, keeping $name",
    ({ chainId, address, name }) => {
      expect(getChainlinkFeed({ chainId, address })?.name).toEqual(name);
    },
  );

  it.each(Object.entries(chainlinkFeeds))(
    "should have unique paths on chain %s",
    (_, feeds) => {
      const paths = feeds.map((feed) => feed.path);
      expect(paths.filter((p, i) => paths.indexOf(p) !== i)).toEqual([]);
    },
  );

  it("should be case insensitive", () => {
    const feed = getChainlinkFeed({
      chainId: ChainId.mainnet,
      address: "0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419",
    });
    expect(feed?.name).toEqual("ETH / USD");
  });

  it("should not resolve an address across chains", () => {
    expect(
      getChainlinkFeed({
        chainId: ChainId.polygon,
        address: "0x84EA90AC252Dc437031461836DB5164219147905",
      }),
    ).toBeUndefined();
  });

  it("should return undefined for unknown addresses and chains", () => {
    expect(
      getChainlinkFeed({
        chainId: ChainId.mainnet,
        address: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2",
      }),
    ).toBeUndefined();
    expect(
      getChainlinkFeed({
        chainId: 1337,
        address: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
      }),
    ).toBeUndefined();
  });
});
