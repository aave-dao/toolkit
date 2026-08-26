import { Address, Hex } from "viem";
import { etherscanExplorers } from "./generated/etherscanExplorers";
import { routescanExplorers } from "./generated/routescanExplorers";
import { StandardJsonInput } from "./types";
import { blockscoutExplorers, ChainId } from "..";

export type ExplorerConfig = { api: string; explorer: string };

/**
 * Fetches what we consider the "best" explorer for a given chain.
 * For our tooling we have a opinionated priorization for explorers:
 * 1. Etherscan
 * 2. Routescan
 * 3. Blockscout and others
 * @param chainId Id of the chain to fetch the explorer for
 */
export function getExplorer(chainId: number): ExplorerConfig {
  const etherscan =
    etherscanExplorers[chainId as keyof typeof etherscanExplorers];
  if (etherscan) return etherscan;
  const routescan =
    routescanExplorers[chainId as keyof typeof routescanExplorers];
  if (routescan) return routescan;
  const blockscout =
    blockscoutExplorers[chainId as keyof typeof blockscoutExplorers];
  if (blockscout) return blockscout;
  throw new Error(`No explorer found for chainId: ${chainId}`);
}

type GetSourceCodeParams = {
  chainId: number;
  address: Address;
  apiUrl?: string;
  apiKey?: string;
};

/**
 * Thrown when the explorer positively reports that no verified source exists
 * for the contract, as opposed to the request itself failing.
 */
export class ContractNotVerifiedError extends Error {
  constructor(address: Address) {
    super(`Contract ${address} source code is not verified`);
    this.name = "ContractNotVerifiedError";
  }
}

export type EtherscanStyleSourceCode = {
  ABI: any;
  CompilerVersion: string;
  ConstructorArguments: Hex;
  ContractName: string;
  EVMVersion: string;
  Implementation: Address;
  Library: string;
  LicenseType: string;
  OptimizationUsed: string;
  Proxy: string; // "1" meaning true (i think)
  Runs: string;
  SimilarMatch: string;
  SourceCode: string;
};

export type BlockscoutStyleSourceCode = {
  AdditionalSources: { SourceCode: string; Filename: string }[];
  CompilerSettings: {
    evmVersion: string;
    libraries: any;
    optimizer: { enabled: boolean; runs: number };
  };
  ConstructorArguments: Hex;
  ExternalLibraries: { address_hash: Address; name: string }[];
  SourceCode: string;
  ContractName: string;
  FileName: string;
  EVMVersion: string;
  OptimizationUsed: string;
};

export async function getSourceCode(params: GetSourceCodeParams) {
  if (params.chainId === ChainId.xLayer) {
    return getXLayerSourceCode(params);
  }
  const payload = {
    chainid: String(params.chainId),
    address: params.address,
    module: "contract",
    action: "getsourcecode",
  };
  if (params.apiKey) (payload as any).apikey = params.apiKey;
  const formattedPayload = new URLSearchParams(payload).toString();
  const url = `${params.apiUrl ? params.apiUrl : getExplorer(params.chainId).api}?${formattedPayload}`;
  console.log(url);
  const request = await fetch(url);
  const { status, message, result } = (await request.json()) as {
    message: string;
    result: (EtherscanStyleSourceCode | BlockscoutStyleSourceCode)[];
    status: string;
  };
  if (status !== "1") {
    throw new Error(result as unknown as string);
  }
  // etherscan responds with status "1" but an empty SourceCode for unverified
  // contracts, blockscout omits the field entirely
  if (!result[0]?.SourceCode) {
    throw new ContractNotVerifiedError(params.address);
  }
  return result[0];
}

export function parseEtherscanStyleSourceCode(
  sourceCode: string,
): StandardJsonInput {
  // Handling possible variations in SourceCode format
  if (sourceCode.startsWith("{{") && sourceCode.endsWith("}}")) {
    // Strip the extra curly braces and parse
    sourceCode = sourceCode.substring(1, sourceCode.length - 1);
  }
  return JSON.parse(sourceCode);
}

export function parseBlockscoutStyleSourceCode(
  sourceCode: BlockscoutStyleSourceCode,
): StandardJsonInput {
  const result: StandardJsonInput = {
    language: "unknown",
    settings: sourceCode.CompilerSettings,
    libraries: sourceCode.CompilerSettings.libraries,
    sources: {
      [sourceCode.FileName]: { content: sourceCode.SourceCode },
      ...sourceCode.AdditionalSources.reduce(
        (acc, code) => {
          acc[code.Filename] = { content: code.SourceCode };
          return acc;
        },
        {} as Record<string, { content: string }>,
      ),
    },
  };
  return result;
}

const OKLINK_MAX_ATTEMPTS = 10;
const OKLINK_RETRY_DELAY = 7_000;

async function getXLayerSourceCode(params: GetSourceCodeParams) {
  const payload = {
    chainShortName: "xlayer",
    contractAddress: params.address,
  };

  const formattedPayload = new URLSearchParams(payload).toString();
  const apiUrl =
    "https://www.oklink.com/api/v5/explorer/contract/verify-contract-info";
  const url = `${apiUrl}?${formattedPayload}`;

  // authenticated requests have much higher rate limits
  const oklinkApiKey =
    typeof process !== "undefined" ? process.env.OKLINK_API_KEY : undefined;

  let response: { code: string; msg: string; data?: any[] } | undefined;
  for (let attempt = 1; attempt <= OKLINK_MAX_ATTEMPTS; attempt++) {
    const request = await fetch(
      url,
      oklinkApiKey ? { headers: { "Ok-Access-Key": oklinkApiKey } } : undefined,
    );
    response = (await request.json()) as typeof response;
    if (response?.code !== "50011" || attempt === OKLINK_MAX_ATTEMPTS) break;
    // the keyless oklink api rate limits almost immediately ({"code":"50011","msg":"Too Many Requests"}),
    // but recovers after a few seconds; other error codes are not retryable
    await new Promise((resolve) => setTimeout(resolve, OKLINK_RETRY_DELAY));
  }
  // oklink error responses also carry "data": [], so only a success code means "no verified source"
  if (response?.code !== "0" || !response.data) {
    throw new Error(
      `OKLink request failed: ${response?.code} ${response?.msg}`,
    );
  }
  const data = response.data;
  if (data.length === 0) {
    throw new ContractNotVerifiedError(params.address);
  }
  return {
    SourceCode: data[0].sourceCode,
    ABI: data[0].contractAbi,
    CompilerVersion: data[0].compilerVersion,
    ContractName: data[0].contractName,
    EVMVersion: data[0].evmVersion,
    Implementation: data[0].implementation,
    Library: data[0].libraryInfo,
    LicenseType: data[0].licenseType,
    OptimizationUsed: data[0].optimization,
    Proxy: data[0].proxy,
    Runs: data[0].optimizationRuns,
  };
}
