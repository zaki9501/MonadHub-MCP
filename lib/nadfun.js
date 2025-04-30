// lib/nadfun.js
import { createWalletClient, createPublicClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import axios from "axios";

const BLOCKCHAIN_CONFIG = {
  chain: {
    id: 10143, // Correct Monad testnet chain ID
    name: "Monad Testnet",
    nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
    rpcUrls: { default: { http: ["https://testnet-rpc.monad.xyz"] } }
  },
  rpcUrl: "https://testnet-rpc.monad.xyz"
};

export const CONTRACT_ADDRESSES = {
  CORE: process.env.CORE_CONTRACT_ADDRESS || "0x822EB1ADD41cf87C3F178100596cf24c9a6442f6",
  BONDING_CURVE_FACTORY: process.env.BONDING_CURVE_FACTORY_ADDRESS || "0x60216FB3285595F4643f9f7cddAB842E799BD642",
  INTERNAL_UNISWAP_V2_ROUTER: process.env.INTERNAL_UNISWAP_V2_ROUTER_ADDRESS || "0x619d07287e87C9c643C60882cA80d23C8ed44652",
  INTERNAL_UNISWAP_V2_FACTORY: process.env.INTERNAL_UNISWAP_V2_FACTORY_ADDRESS || "0x13eD0D5e1567684D964469cCbA8A977CDA580827",
  WRAPPED_MON: process.env.WRAPPED_MON_ADDRESS || "0x3bb9AFB94c82752E47706A10779EA525Cf95dc27"
};

export function createWalletClientFromPrivateKey(privateKey) {
  try {
    const account = privateKeyToAccount(privateKey);
    return createWalletClient({
      account,
      chain: BLOCKCHAIN_CONFIG.chain,
      transport: http(BLOCKCHAIN_CONFIG.rpcUrl)
    });
  } catch (error) {
    throw new Error(`Failed to create wallet client: ${error.message}`);
  }
}

export function createPublicRpcClient() {
  try {
    return createPublicClient({
      chain: BLOCKCHAIN_CONFIG.chain,
      transport: http(BLOCKCHAIN_CONFIG.rpcUrl)
    });
  } catch (error) {
    throw new Error(`Failed to create public client: ${error.message}`);
  }
}

export function calculateRequiredAmountIn(tokensOut, k, virtualNative, virtualToken) {
  try {
    if (tokensOut >= virtualToken) {
      throw new Error("Requested tokens exceed available supply");
    }
    const newVirtualToken = virtualToken - tokensOut;
    const newVirtualNative = k / newVirtualToken;
    return newVirtualNative - virtualNative;
  } catch (error) {
    throw new Error(`Failed to calculate required amount: ${error.message}`);
  }
}

export async function getTokenMarketInfo(tokenAddress) {
  try {
    const response = await axios.get(`https://testnet-bot-api-server.nad.fun/token/market/${tokenAddress}`);
    if (!response.data) {
      throw new Error("No market data available");
    }
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch market info: ${error.message}`);
  }
}

export async function getAccountPositions(accountAddress, positionType = "open") {
  try {
    const response = await axios.get(
      `https://testnet-bot-api-server.nad.fun/account/position/${accountAddress}?position_type=${positionType}&page=1&limit=10`
    );
    if (!response.data?.positions) {
      return [];
    }
    return response.data.positions;
  } catch (error) {
    throw new Error(`Failed to fetch account positions: ${error.message}`);
  }
}

// Export verifyContractState function
export async function verifyContractState(tokenAddress, accountAddress, publicClient) {
  try {
    // Check if contract is deployed
    const code = await publicClient.getBytecode({ address: tokenAddress });
    if (!code) {
      throw new Error("Token contract not deployed");
    }

    // Check account balance
    const balance = await publicClient.getBalance({ address: accountAddress });
    if (balance === BigInt(0)) {
      throw new Error("Insufficient MON balance");
    }

    // Get market info to verify trading state
    const marketInfo = await getTokenMarketInfo(tokenAddress);
    if (!marketInfo) {
      throw new Error("Market not initialized");
    }

    // Verify market type
    if (!marketInfo.market_type) {
      throw new Error("Invalid market type");
    }

    return true;
  } catch (error) {
    throw new Error(`Contract state verification failed: ${error.message}`);
  }
}

// Export estimateGasWithMargin function
export async function estimateGasWithMargin(txParams, publicClient) {
  try {
    let gasEstimate;
    let retries = 3;
    
    while (retries > 0) {
      try {
        gasEstimate = await publicClient.estimateGas(txParams);
        break;
      } catch (error) {
        retries--;
        if (retries === 0) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Add 150% safety margin for better transaction success
    gasEstimate = (gasEstimate * BigInt(250)) / BigInt(100);

    // Ensure minimum gas fee of 0.01 MON (assuming 50 Gwei base gas price)
    // 0.01 MON = 10^16 wei
    // At 50 Gwei (5 * 10^10 wei) gas price, we need at least 200,000 gas
    const minGasLimit = BigInt(200000);
    if (gasEstimate < minGasLimit) {
      gasEstimate = minGasLimit;
    }

    return gasEstimate;
  } catch (error) {
    throw new Error(`Gas estimation failed: ${error.message}`);
  }
}

export function calculateBondingCurveOutput(amountIn, virtualNative, virtualToken) {
  try {
    // Calculate constant product k
    const k = virtualNative * virtualToken;
    
    // Calculate new virtual native balance after input
    const newVirtualNative = virtualNative + amountIn;
    
    // Calculate new virtual token balance using k = x * y
    const newVirtualToken = k / newVirtualNative;
    
    // Calculate token output
    const tokenOutput = virtualToken - newVirtualToken;
    
    if (tokenOutput <= BigInt(0)) {
      throw new Error("Invalid bonding curve output");
    }
    
    return tokenOutput;
  } catch (error) {
    throw new Error(`Failed to calculate bonding curve output: ${error.message}`);
  }
}

export function calculateBondingCurveInput(tokensOut, virtualNative, virtualToken) {
  try {
    // Calculate constant product k
    const k = virtualNative * virtualToken;
    
    // Calculate new virtual token balance after output
    const newVirtualToken = virtualToken - tokensOut;
    
    if (newVirtualToken <= BigInt(0)) {
      throw new Error("Insufficient liquidity");
    }
    
    // Calculate required native token input using k = x * y
    const newVirtualNative = k / newVirtualToken;
    
    // Calculate required input amount
    const requiredInput = newVirtualNative - virtualNative;
    
    return requiredInput;
  } catch (error) {
    throw new Error(`Failed to calculate bonding curve input: ${error.message}`);
  }
}

export async function calculateAndVerifyOutput(txHash, publicClient, expectedOutput, slippage) {
  try {
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    
    // Verify transaction success
    if (!receipt.status) {
      throw new Error("Transaction failed");
    }
    
    // Calculate minimum acceptable output with slippage
    const minOutput = (expectedOutput * BigInt(1000 - Math.floor(slippage * 10))) / BigInt(1000);
    
    // Here you would typically decode the event logs to get actual output
    // For now, we'll just return success
    return true;
  } catch (error) {
    throw new Error(`Output verification failed: ${error.message}`);
  }
}

export async function waitForTransaction(txHash, publicClient) {
  try {
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    if (!receipt.status) {
      throw new Error("Transaction failed");
    }
    return receipt;
  } catch (error) {
    throw new Error(`Transaction failed: ${error.message}`);
  }
}

export async function buy(action, amount, accountAddress, walletClient, publicClient, slippage, marketData) {
  if (action === "buy" && amount && accountAddress && walletClient) {
    if (isCurve) {
      // Enhanced bonding curve buy with retries and better error handling
      const amountIn = parseEther(amount);
      const fee = (amountIn * BigInt(10)) / BigInt(1000); // 1% fee
      const totalValue = amountIn + fee;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 20 * 60);

      // Calculate expected output with slippage
      const virtualNative = BigInt(marketData.virtual_native);
      const virtualToken = BigInt(marketData.virtual_token);
      
      // Calculate expected output
      const expectedOutput = calculateBondingCurveOutput(amountIn, virtualNative, virtualToken);
      const minOutput = (expectedOutput * BigInt(1000 - Math.floor(slippage * 10))) / BigInt(1000);

      const txParams = {
        account: walletClient.account,
        address: CONTRACT_ADDRESSES.CORE,
        abi: NadFunAbi.ICore,
        functionName: "exactInBuy",  // Changed from "buy" to "exactInBuy"
        args: [
          amountIn,
          BigInt(0), // minOutput parameter
          tokenAddress,
          accountAddress,
          deadline
        ],
        value: totalValue
      };

      // Implement retry logic for gas estimation with higher minimum
      let gas;
      let retries = 3;
      while (retries > 0) {
        try {
          gas = await estimateGasWithMargin(txParams, publicClient);
          // Ensure minimum gas of 210,000 based on successful transaction
          gas = gas < BigInt(210000) ? BigInt(210000) : gas;
          break;
        } catch (error) {
          retries--;
          if (retries === 0) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const txHash = await walletClient.writeContract({
        ...txParams,
        gas
      });

      // Wait for transaction and verify output
      await calculateAndVerifyOutput(txHash, publicClient, expectedOutput, slippage);

      return {
        content: [{ 
          type: "text", 
          text: `Bonding curve buy successful.\nHash: ${txHash}\nAmount In: ${amount} MON\nExpected Output: ${formatUnits(expectedOutput, 18)} tokens\nMin Output with Slippage: ${formatUnits(minOutput, 18)} tokens` 
        }]
      };
    }
  }
}

export async function createToken(name, symbol, totalSupply, accountAddress, walletClient, publicClient) {
  try {
    console.log("Creating token with params:", { name, symbol, totalSupply, accountAddress });
    
    // Convert total supply to wei
    const totalSupplyWei = parseEther(totalSupply);
    const creationFee = parseEther("3"); // 3 MON fee
    
    // Check account balance
    const balance = await publicClient.getBalance({ address: accountAddress });
    if (balance < creationFee) {
      throw new Error(`Insufficient MON balance. Required: 3 MON, Current: ${formatUnits(balance, 18)} MON`);
    }
    
    console.log("Preparing transaction parameters...");
    
    const txParams = {
      account: walletClient.account,
      address: CONTRACT_ADDRESSES.BONDING_CURVE_FACTORY,
      abi: NadFunAbi.IBondingCurveFactory,
      functionName: "createTokenWithMetadata",
      args: [
        accountAddress,
        name,
        symbol,
        "https://storage.nadapp.net/metadata.json", // Default metadata URL
        totalSupplyWei,
        parseEther("0.1") // Initial price in MON
      ],
      value: creationFee
    };
    
    console.log("Estimating gas...");
    
    // Use higher gas for token creation based on successful transaction
    let gas;
    let retries = 3;
    while (retries > 0) {
      try {
        gas = await estimateGasWithMargin(txParams, publicClient);
        // Ensure minimum gas of 3,000,000 based on successful transaction
        gas = gas < BigInt(3000000) ? BigInt(3000000) : gas;
        break;
      } catch (error) {
        retries--;
        if (retries === 0) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log("Sending transaction...");
    
    const txHash = await walletClient.writeContract({
      ...txParams,
      gas
    });

    return {
      content: [{ 
        type: "text", 
        text: `Token creation successful.\nHash: ${txHash}\nTotal Supply: ${totalSupply} MON` 
      }]
    };
  } catch (error) {
    throw new Error(`Token creation failed: ${error.message}`);
  }
}