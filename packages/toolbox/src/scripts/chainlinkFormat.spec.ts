import { zeroAddress } from "viem";
import { describe, expect, it } from "vitest";
import {
  formatChainlinkFeeds,
  type UpstreamChainlinkFeed,
} from "./chainlinkFormat";

const feed = (
  overrides: Partial<UpstreamChainlinkFeed>,
): UpstreamChainlinkFeed => ({
  contractAddress: "0x0000000000000000000000000000000000000001",
  proxyAddress: "0x0000000000000000000000000000000000000002",
  path: "eth-usd",
  decimals: 8,
  name: "ETH / USD",
  ...overrides,
});

describe("scripts:chainlinkFormat", () => {
  it("should keep the plain name of feeds without svr label", () => {
    expect(formatChainlinkFeeds([feed({})])).toEqual([
      {
        contractAddress: "0x0000000000000000000000000000000000000001",
        proxyAddress: "0x0000000000000000000000000000000000000002",
        decimals: 8,
        name: "ETH / USD",
        path: "eth-usd",
      },
    ]);
  });

  it("should prefix shared svr feeds with SVR", () => {
    expect(
      formatChainlinkFeeds([
        feed({
          path: "eth-usd-shared-svr-2",
          svrDisplayLabel: "Shared SVR",
          secondaryProxyAddress: "0x0000000000000000000000000000000000000003",
        }),
      ]),
    ).toEqual([
      {
        contractAddress: "0x0000000000000000000000000000000000000001",
        proxyAddress: "0x0000000000000000000000000000000000000002",
        secondaryProxyAddress: "0x0000000000000000000000000000000000000003",
        decimals: 8,
        name: "SVR ETH / USD",
        path: "eth-usd-shared-svr-2",
        svrDisplayLabel: "Shared SVR",
      },
    ]);
  });

  it("should prefix aave svr feeds with AAVE SVR", () => {
    expect(
      formatChainlinkFeeds([
        feed({ path: "eth-usd-svr", svrDisplayLabel: "Aave SVR" }),
      ])[0].name,
    ).toEqual("AAVE SVR ETH / USD");
  });

  it("should name from the svr label, not the path", () => {
    expect(
      formatChainlinkFeeds([
        // shared svr feed whose path doesn't mention svr
        feed({
          path: "usfron-usd-ondo-api",
          name: "USFRon-USD (Ondo API)",
          svrDisplayLabel: "Shared SVR",
        }),
        // svr path without label
        feed({ path: "btc-usd-svr", name: "BTC / USD" }),
      ]).map((f) => f.name),
    ).toEqual(["SVR USFRon-USD (Ondo API)", "BTC / USD"]);
  });

  it("should skip compound svr feeds", () => {
    expect(
      formatChainlinkFeeds([
        feed({ path: "eth-usd-shared-svr", svrDisplayLabel: "Compound SVR" }),
      ]),
    ).toEqual([]);
  });

  it.each(["Some Protocol SVR", "AAVE SVR"])(
    "should throw on unknown svr label %s",
    (svrDisplayLabel) => {
      expect(() =>
        formatChainlinkFeeds([
          feed({ path: "eth-usd-shared-svr", svrDisplayLabel }),
        ]),
      ).toThrowError(
        `Unknown Chainlink SVR label "${svrDisplayLabel}" on feed eth-usd-shared-svr`,
      );
    },
  );

  it("should skip cre-backup feeds", () => {
    expect(
      formatChainlinkFeeds([
        feed({ path: "btc-usd", name: "BTC / USD" }),
        feed({
          path: "btc-usd-cre-backup",
          name: "BTC / USD",
          decimals: 18,
        }),
      ]),
    ).toMatchObject([{ name: "BTC / USD", decimals: 8 }]);
  });

  it("should keep feeds without proxy", () => {
    expect(
      formatChainlinkFeeds([feed({ proxyAddress: null })])[0].proxyAddress,
    ).toBeNull();
  });

  it("should skip feeds without contract", () => {
    expect(
      formatChainlinkFeeds([feed({ contractAddress: zeroAddress })]),
    ).toEqual([]);
  });

  it("should keep the plain name for the feed whose path matches and suffix the others", () => {
    expect(
      formatChainlinkFeeds([
        feed({ path: "ngn-usd-fx", name: "NGN / USD" }),
        feed({ path: "ngn-usd", name: "NGN / USD" }),
        feed({ path: "ngn-usd-2", name: "NGN / USD" }),
      ]).map((f) => f.name),
    ).toEqual(["NGN / USD (ngn-usd-fx)", "NGN / USD", "NGN / USD (ngn-usd-2)"]);
  });

  it("should keep the plain name for the only visible feed over hidden path matches", () => {
    expect(
      formatChainlinkFeeds([
        feed({ path: "kes-usd-fx", name: "KES / USD", docs: { hidden: true } }),
        feed({ path: "kes-usd", name: "KES / USD", docs: { hidden: true } }),
        feed({ path: "kes-usd-2", name: "KES / USD", docs: { hidden: null } }),
      ]).map((f) => f.name),
    ).toEqual(["KES / USD (kes-usd-fx)", "KES / USD (kes-usd)", "KES / USD"]);
  });

  it("should fall back to the path match when all duplicates are hidden", () => {
    expect(
      formatChainlinkFeeds([
        feed({
          path: "wtgxx-nav-24h",
          name: "WTGXX NAV",
          docs: { hidden: true },
        }),
        feed({ path: "wtgxx-nav", name: "WTGXX NAV", docs: { hidden: true } }),
      ]).map((f) => f.name),
    ).toEqual(["WTGXX NAV (wtgxx-nav-24h)", "WTGXX NAV"]);
  });

  it("should only match paths among visible feeds when several are visible", () => {
    expect(() =>
      formatChainlinkFeeds([
        feed({ path: "eth-usd", docs: { hidden: true } }),
        feed({ path: "eth-usd-2" }),
        feed({ path: "eth-usd-3" }),
      ]),
    ).toThrowErrorMatchingInlineSnapshot(
      `[Error: No path matches duplicate Chainlink feed name "ETH / USD": eth-usd-2, eth-usd-3]`,
    );
  });

  it("should keep the plain name of a unique feed even if its path doesn't match", () => {
    expect(
      formatChainlinkFeeds([feed({ path: "kes-usd-2", name: "KES / USD" })])[0]
        .name,
    ).toEqual("KES / USD");
  });

  it("should not count skipped feeds as duplicates", () => {
    expect(
      formatChainlinkFeeds([
        feed({ path: "eth-usd-2" }),
        feed({ path: "eth-usd-cre-backup" }),
        feed({ path: "eth-usd-3", contractAddress: zeroAddress }),
      ]).map((f) => f.name),
    ).toEqual(["ETH / USD"]);
  });

  it("should throw if no path matches a duplicate name", () => {
    expect(() =>
      formatChainlinkFeeds([
        feed({ path: "eth-usd-shared-svr", svrDisplayLabel: "Shared SVR" }),
        feed({ path: "eth-usd-shared-svr-2", svrDisplayLabel: "Shared SVR" }),
      ]),
    ).toThrowErrorMatchingInlineSnapshot(
      `[Error: No path matches duplicate Chainlink feed name "SVR ETH / USD": eth-usd-shared-svr, eth-usd-shared-svr-2]`,
    );
  });
});
