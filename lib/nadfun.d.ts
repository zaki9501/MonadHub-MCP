export function calculateBondingCurveOutput(amountIn: bigint, virtualNative: bigint, virtualToken: bigint): bigint;
export function calculateBondingCurveInput(tokensOut: bigint, virtualNative: bigint, virtualToken: bigint): bigint;
export function calculateRequiredAmountIn(tokensOut: bigint, k: bigint, virtualNative: bigint, virtualToken: bigint): bigint;
export function createWalletClientFromPrivateKey(privateKey: `0x${string}`): any;
export function createPublicRpcClient(): any;
export function getTokenMarketInfo(tokenAddress: string): Promise<any>;
export function getAccountPositions(accountAddress: string, positionType?: string): Promise<any>;
export function verifyContractState(tokenAddress: string, accountAddress: string, publicClient: any): Promise<boolean>;
export function estimateGasWithMargin(txParams: any, publicClient: any): Promise<bigint>;

export function calculateAndVerifyOutput(txHash: `0x${string}`, publicClient: any, expectedOutput: bigint, slippage: number): Promise<boolean>;
export function waitForTransaction(txHash: `0x${string}`, publicClient: any): Promise<any>;

export const CONTRACT_ADDRESSES: {
  CORE: string;
  BONDING_CURVE_FACTORY: string;
  INTERNAL_UNISWAP_V2_ROUTER: string;
  INTERNAL_UNISWAP_V2_FACTORY: string;
  WRAPPED_MON: string;
}; 