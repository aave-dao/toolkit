import { describe, expect, it } from "vitest";
import { getChainlinkFeed } from "./chainlinkFeeds";
import { ChainId } from "./chainIds";

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
      proxyAddress: "0x50015f8b17fb2C290Dde41fDc246ed0dcEE93a8b",
      secondaryProxyAddress: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",
      matchedOn: "secondary",
    });
  });

  it("should not resolve a feed of another protocol's svr", () => {
    // upstream lists compound's base eth/usd svr feed under the same name as aave's
    expect(
      getChainlinkFeed({
        chainId: ChainId.base,
        address: "0x5731Ae06077c79A3B292498940211E0aE7130bd3",
      }),
    ).toBeUndefined();
  });

  it("should keep the plain name on the feed a variant varies", () => {
    const feed = getChainlinkFeed({
      chainId: ChainId.arbitrum,
      address: "0x6ce185860a4963106506C203335A2910413708e9",
    });
    expect(feed).toMatchObject({ name: "BTC / USD", path: "btc-usd" });
  });

  it("should qualify a feed that collides on name", () => {
    const feed = getChainlinkFeed({
      chainId: ChainId.arbitrum,
      address: "0xf5166f957d716D26488f185E5B1d378839724530",
    });
    expect(feed).toMatchObject({
      name: "CRE BACKUP BTC / USD",
      path: "btc-usd-cre-backup",
    });
  });

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
