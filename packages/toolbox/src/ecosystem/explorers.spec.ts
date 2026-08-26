import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ContractNotVerifiedError,
  getExplorer,
  getSourceCode,
  parseEtherscanStyleSourceCode,
} from "./explorers";
import { mock_getSourceCode } from "./mocks/getSourceCode";

describe("ecosystem:explorers", () => {
  it("getExplorer should follow prioritization", () => {
    expect(getExplorer(1).explorer).toEqual("https://etherscan.io/");
    expect(getExplorer(1088).explorer).toEqual("1088.routescan.io");
  });

  it.skipIf(process.env.CI)(
    "getSourceCode download a given contract",
    async () => {
      const response = await getSourceCode({
        chainId: 1,
        address: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2",
        apiKey: process.env.ETHERSCAN_API_KEY,
      });
      expect(response.SourceCode).toMatchSnapshot();
    },
  );

  it.skipIf(process.env.CI)(
    "getSourceCode download a given contract on blockscout",
    async () => {
      const response = await getSourceCode({
        chainId: 1868,
        address: "0xa0208CE8356ad6C5EC6dFb8996c9A6B828212022",
      });
      expect(response).toMatchSnapshot();
    },
  );

  it.skipIf(process.env.CI)(
    "getSourceCode download a given contract on xlayer explorer",
    async () => {
      const response = await getSourceCode({
        chainId: 196,
        address: "0xEB0682d148e874553008730f0686ea89db7DA412",
      });
      expect(response).toMatchSnapshot();
    },
  );

  it("should properly decode sourcecode string", () => {
    expect(
      parseEtherscanStyleSourceCode(mock_getSourceCode.result[0].SourceCode),
    ).toMatchSnapshot();
  });
});

describe("ecosystem:explorers with mocked fetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  const mockOkLinkContract = {
    sourceCode: "contract Pool {}",
    contractAbi: "[]",
    compilerVersion: "v0.8.20",
    contractName: "Pool",
    evmVersion: "paris",
    implementation: "",
    libraryInfo: "",
    licenseType: "MIT",
    optimization: "1",
    proxy: "0",
    optimizationRuns: "200",
  };

  it("getSourceCode should retry on oklink rate limits for xlayer", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({ msg: "Too Many Requests", code: "50011" }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ code: "0", msg: "", data: [mockOkLinkContract] }),
      });
    vi.stubGlobal("fetch", fetchMock);
    const promise = getSourceCode({
      chainId: 196,
      address: "0x80e11cB895a23C901a990239E5534054C66476B5",
    });
    await vi.runAllTimersAsync();
    const response = await promise;
    expect(response.ContractName).toBe("Pool");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("getSourceCode should throw ContractNotVerifiedError when oklink reports no source", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ code: "0", msg: "", data: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      getSourceCode({
        chainId: 196,
        address: "0x000000000000000000000000000000000000dEaD",
      }),
    ).rejects.toThrowError(ContractNotVerifiedError);
  });

  it("getSourceCode should not treat oklink error responses as unverified and not retry them", async () => {
    // oklink error responses also carry "data": []
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        code: "50038",
        msg: "This chain does not currently support.",
        data: [],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      getSourceCode({
        chainId: 196,
        address: "0x80e11cB895a23C901a990239E5534054C66476B5",
      }),
    ).rejects.toThrowError(/OKLink request failed: 50038/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("getSourceCode should send the Ok-Access-Key header when OKLINK_API_KEY is set", async () => {
    vi.stubEnv("OKLINK_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ code: "0", msg: "", data: [mockOkLinkContract] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await getSourceCode({
      chainId: 196,
      address: "0x80e11cB895a23C901a990239E5534054C66476B5",
    });
    expect(fetchMock).toHaveBeenCalledWith(expect.any(String), {
      headers: { "Ok-Access-Key": "test-key" },
    });
  });

  it("getSourceCode should throw ContractNotVerifiedError when etherscan reports no source", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        status: "1",
        message: "OK",
        result: [{ SourceCode: "", ABI: "Contract source code not verified" }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      getSourceCode({
        chainId: 1,
        address: "0x000000000000000000000000000000000000dEaD",
      }),
    ).rejects.toThrowError(ContractNotVerifiedError);
  });
});
