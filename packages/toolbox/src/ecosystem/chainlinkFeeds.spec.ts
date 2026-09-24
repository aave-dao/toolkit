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
