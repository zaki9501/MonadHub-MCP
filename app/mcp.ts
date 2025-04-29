import { z } from "zod";
import { initializeMcpApiHandler } from "../lib/mcp-api-handler";
import { createPublicClient, formatUnits, http, parseEther } from "viem";
import { monadTestnet } from "viem/chains";
import axios from "axios";
import { createWalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { uploadToPinata } from "@/lib/ipfs";
import MonadNFT from "@/lib/MonadNFT.json";
import MonadNFT1155 from "@/lib/MonadNFT1155.json";
import NadFunAbi from "../lib/nadfun-abi.json";
import { 
  createWalletClientFromPrivateKey, 
  createPublicRpcClient, 
  calculateRequiredAmountIn, 
  getTokenMarketInfo, 
  getAccountPositions, 
  CONTRACT_ADDRESSES, 
  verifyContractState, 
  estimateGasWithMargin, 
  calculateBondingCurveOutput, 
  calculateBondingCurveInput,
  calculateAndVerifyOutput,
  waitForTransaction 
} from "../lib/nadfun";
import { setContractAddress } from "../lib/redis";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import path from "path";
import { decodeEventLog } from "viem";
import { createNFTCollection } from '@/lib/nft-collection';
import { castoraAbi } from "../lib/castoraAbi";
import FormData from 'form-data';

// Create a public client to interact with the Monad testnet
const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

// BlockVision API key from environment variables
const BLOCKVISION_API_KEY = process.env.BLOCKVISION_API_KEY;

// Add these interfaces at the top with other imports
interface TokenResult {
  address: string;
  balance: string;
  categories: string[];
  decimals: string;
  id: string;
  name: string;
  symbol: string;
}

interface ErrorResponse {
  message: string;
}

// Add these constants before the mcpHandler
const API_ENDPOINTS = {
  QUOTE_API: "https://testnet-pathfinder-v2.monorail.xyz",
  DATA_API: "https://testnet-api.monorail.xyz",
};

// Add this helper function before the mcpHandler
async function resolveTokenAddress(tokenIdentifier: string): Promise<string> {
  // If it looks like an address already, return it
  if (tokenIdentifier.startsWith("0x") && tokenIdentifier.length >= 40) {
    return tokenIdentifier;
  }

  // Check if it's native token
  if (tokenIdentifier.toLowerCase() === "mon") {
    return "0x0000000000000000000000000000000000000000";
  }

  // Find the token by symbol
  try {
    // Get verified tokens first
    const response = await axios.get(`${API_ENDPOINTS.DATA_API}/v1/tokens/category/verified`);
    const verifiedTokens: TokenResult[] = response.data;

    // Look for a matching symbol (case insensitive)
    const token = verifiedTokens.find(t =>
      t.symbol.toLowerCase() === tokenIdentifier.toLowerCase()
    );

    if (token) {
      return token.address;
    }

    // If not found in verified tokens, search all tokens
    const searchResponse = await axios.get(`${API_ENDPOINTS.DATA_API}/v1/tokens`, {
      params: { find: tokenIdentifier }
    });
    const tokenResults: TokenResult[] = searchResponse.data;

    if (tokenResults.length > 0) {
      // Find exact match by symbol first
      const exactMatch = tokenResults.find(t =>
        t.symbol.toLowerCase() === tokenIdentifier.toLowerCase()
      );

      if (exactMatch) {
        return exactMatch.address;
      }

      // Otherwise return the first result
      return tokenResults[0].address;
    }
  } catch (error: any) {
    console.error(`Error resolving token: ${error.message}`);
  }

  throw new Error(`Token not found: ${tokenIdentifier}`);
}

// Configure multer for in-memory storage (no disk writes)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const validTypes = ["image/jpeg", "image/png"];
    if (validTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("File must be a JPEG or PNG"));
    }
  },
});

// Castora contract address
const CASTORA_CONTRACT_ADDRESS = "0xa0742C672e713327b0D6A4BfF34bBb4cbb319C53";

// Helper function to convert base64 image to buffer
async function base64ToBuffer(base64String: string): Promise<Buffer> {
  // Remove data URL prefix if present
  const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

// Helper function to upload to Pinata
async function uploadImageToPinata(imageBuffer: Buffer): Promise<string> {
  // Verify we have API keys
  if (!process.env.PINATA_API_KEY || !process.env.PINATA_API_SECRET) {
    throw new Error('PINATA_API_KEY and PINATA_API_SECRET must be set in environment variables');
  }

  console.log('Starting Pinata upload...');
  const formData = new FormData();
  formData.append('file', imageBuffer, {
    filename: 'nft-image.png',
    contentType: 'image/png',
    knownLength: imageBuffer.length
  });

  try {
    console.log('Uploading to Pinata with API key:', process.env.PINATA_API_KEY.substring(0, 4) + '...');
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        headers: {
          ...formData.getHeaders(),
          'pinata_api_key': process.env.PINATA_API_KEY,
          'pinata_secret_api_key': process.env.PINATA_API_SECRET,
          'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`
        }
      }
    );

    console.log('Pinata upload successful:', response.data);
    return `https://ipfs.io/ipfs/${response.data.IpfsHash}`;
  } catch (error: any) {
    console.error('Pinata upload error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers
    });
    throw new Error(`Failed to upload to Pinata: ${error.response?.data?.message || error.message}`);
  }
}

export const mcpHandler = initializeMcpApiHandler(
  (server) => {
    // Original tool: Get MON balance
    server.tool(
      "get-mon-balance",
      "Get MON balance for an address on Monad testnet",
      {
        address: z
          .string()
          .describe("Monad testnet address to check balance for"),
      },
      async ({ address }) => {
        try {
          const balance = await publicClient.getBalance({
            address: address as `0x${string}`,
          });
          return {
            content: [
              {
                type: "text",
                text: `Balance for ${address}: ${formatUnits(balance, 18)} MON`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to retrieve balance for address: ${address}. Error: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
          };
        }
      }
    );

    // New tool: Retrieve Account Tokens
    server.tool(
      "retrieve_account_tokens",
      "Retrieve tokens for a given Monad account address",
      {
        address: z
          .string()
          .describe("The account address to retrieve tokens for"),
      },
      async ({ address }) => {
        try {
          const response = await axios.get(
            `https://api.blockvision.org/v2/monad/account/tokens?address=${address}`,
            {
              headers: {
                accept: "application/json",
                "x-api-key": BLOCKVISION_API_KEY,
              },
            }
          );
          return {
            content: [
              {
                type: "text",
                text: `Tokens for ${address}: ${JSON.stringify(response.data, null, 2)}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to retrieve tokens for address: ${address}. Error: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
          };
        }
      }
    );

    // New tool: Retrieve Account NFTs
    server.tool(
      "retrieve_account_nfts",
      "Retrieve NFTs for a given Monad account address",
      {
        address: z
          .string()
          .describe("The account address to retrieve NFTs for"),
        pageIndex: z
          .number()
          .optional()
          .default(1)
          .describe("Page index for pagination"),
      },
      async ({ address, pageIndex }) => {
        try {
          const response = await axios.get(
            `https://api.blockvision.org/v2/monad/account/nfts?address=${address}&pageIndex=${pageIndex}`,
            {
              headers: {
                accept: "application/json",
                "x-api-key": BLOCKVISION_API_KEY,
              },
            }
          );
          return {
            content: [
              {
                type: "text",
                text: `NFTs for ${address} (Page ${pageIndex}): ${JSON.stringify(response.data, null, 2)}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to retrieve NFTs for address: ${address}. Error: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
          };
        }
      }
    );

    // New tool: Retrieve Account Activities
    server.tool(
      "retrieve_account_activities",
      "Retrieve activities for a given Monad account address",
      {
        address: z
          .string()
          .describe("The account address to retrieve activities for"),
        limit: z
          .number()
          .optional()
          .default(20)
          .describe("Number of activities to retrieve"),
      },
      async ({ address, limit }) => {
        try {
          const response = await axios.get(
            `https://api.blockvision.org/v2/monad/account/activities?address=${address}&limit=${limit}`,
            {
              headers: {
                accept: "application/json",
                "x-api-key": BLOCKVISION_API_KEY,
              },
            }
          );
          return {
            content: [
              {
                type: "text",
                text: `Activities for ${address} (Limit ${limit}): ${JSON.stringify(response.data, null, 2)}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to retrieve activities for address: ${address}. Error: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
          };
        }
      }
    );

    // New tool: Retrieve Account Transactions
    server.tool(
      "retrieve_account_transactions",
      "Retrieve transactions for a given Monad account address",
      {
        address: z
          .string()
          .describe("The account address to retrieve transactions for"),
        limit: z
          .number()
          .optional()
          .default(20)
          .describe("Number of transactions to retrieve"),
      },
      async ({ address, limit }) => {
        try {
          const response = await axios.get(
            `https://api.blockvision.org/v2/monad/account/transactions?address=${address}&limit=${limit}`,
            {
              headers: {
                accept: "application/json",
                "x-api-key": BLOCKVISION_API_KEY,
              },
            }
          );
          return {
            content: [
              {
                type: "text",
                text: `Transactions for ${address} (Limit ${limit}): ${JSON.stringify(response.data, null, 2)}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to retrieve transactions for address: ${address}. Error: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
          };
        }
      }
    );

    // New tool: Retrieve Account Internal Transactions
    server.tool(
      "retrieve_account_internal_transactions",
      "Retrieve internal transactions for a given Monad account address",
      {
        address: z
          .string()
          .describe("The account address to retrieve internal transactions for"),
        limit: z
          .number()
          .optional()
          .default(20)
          .describe("Number of transactions to retrieve"),
        filter: z
          .string()
          .optional()
          .default("all")
          .describe("Filter type for transactions"),
      },
      async ({ address, limit, filter }) => {
        try {
          const response = await axios.get(
            `https://api.blockvision.org/v2/monad/account/internal/transactions?address=${address}&filter=${filter}&limit=${limit}`,
            {
              headers: {
                accept: "application/json",
                "x-api-key": BLOCKVISION_API_KEY,
              },
            }
          );
          return {
            content: [
              {
                type: "text",
                text: `Internal Transactions for ${address} (Limit ${limit}, Filter ${filter}): ${JSON.stringify(
                  response.data,
                  null,
                  2
                )}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to retrieve internal transactions for address: ${address}. Error: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
          };
        }
      }
    );

    // New tool: Retrieve Token Activities
    server.tool(
      "retrieve_token_activities",
      "Retrieve token activities for a given account and token address",
      {
        address: z
          .string()
          .describe("The account address to retrieve token activities for"),
        tokenAddress: z
          .string()
          .describe("The token contract address"),
        limit: z
          .number()
          .optional()
          .default(20)
          .describe("Number of activities to retrieve"),
      },
      async ({ address, tokenAddress, limit }) => {
        try {
          const response = await axios.get(
            `https://api.blockvision.org/v2/monad/token/activities?address=${address}&tokenAddress=${tokenAddress}&limit=${limit}`,
            {
              headers: {
                accept: "application/json",
                "x-api-key": BLOCKVISION_API_KEY,
              },
            }
          );
          return {
            content: [
              {
                type: "text",
                text: `Token Activities for ${address} (Token ${tokenAddress}, Limit ${limit}): ${JSON.stringify(
                  response.data,
                  null,
                  2
                )}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to retrieve token activities for address: ${address}. Error: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
          };
        }
      }
    );

    // New tool: Retrieve Collection Activities
    server.tool(
      "retrieve_collection_activities",
      "Retrieve collection activities for a given account and collection address",
      {
        address: z
          .string()
          .describe("The account address to retrieve collection activities for"),
        collectionAddress: z
          .string()
          .describe("The collection contract address"),
        limit: z
          .number()
          .optional()
          .default(20)
          .describe("Number of activities to retrieve"),
      },
      async ({ address, collectionAddress, limit }) => {
        try {
          const response = await axios.get(
            `https://api.blockvision.org/v2/monad/collection/activities?address=${address}&collectionAddress=${collectionAddress}&limit=${limit}`,
            {
              headers: {
                accept: "application/json",
                "x-api-key": BLOCKVISION_API_KEY,
              },
            }
          );
          return {
            content: [
              {
                type: "text",
                text: `Collection Activities for ${address} (Collection ${collectionAddress}, Limit ${limit}): ${JSON.stringify(
                  response.data,
                  null,
                  2
                )}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to retrieve collection activities for address: ${address}. Error: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
          };
        }
      }
    );

    // New tool: Retrieve Token Holders
    server.tool(
      "retrieve_token_holders",
      "Retrieve token holders for a given contract address",
      {
        contractAddress: z
          .string()
          .describe("The token contract address to retrieve holders for"),
        pageIndex: z
          .number()
          .optional()
          .default(1)
          .describe("Page index for pagination"),
        pageSize: z
          .number()
          .optional()
          .default(20)
          .describe("Number of holders per page"),
      },
      async ({ contractAddress, pageIndex, pageSize }) => {
        try {
          const response = await axios.get(
            `https://api.blockvision.org/v2/monad/token/holders?contractAddress=${contractAddress}&pageIndex=${pageIndex}&pageSize=${pageSize}`,
            {
              headers: {
                accept: "application/json",
                "x-api-key": BLOCKVISION_API_KEY,
              },
            }
          );
          return {
            content: [
              {
                type: "text",
                text: `Token Holders for ${contractAddress} (Page ${pageIndex}, Size ${pageSize}): ${JSON.stringify(
                  response.data,
                  null,
                  2
                )}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to retrieve token holders for contract: ${contractAddress}. Error: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
          };
        }
      }
    );

    // New tool: Retrieve Monad Holders
    server.tool(
      "retrieve_monad_holders",
      "Retrieve native Monad token holders",
      {
        pageIndex: z
          .number()
          .optional()
          .default(1)
          .describe("Page index for pagination"),
        pageSize: z
          .number()
          .optional()
          .default(20)
          .describe("Number of holders per page"),
      },
      async ({ pageIndex, pageSize }) => {
        try {
          const response = await axios.get(
            `https://api.blockvision.org/v2/monad/native/holders?pageIndex=${pageIndex}&pageSize=${pageSize}`,
            {
              headers: {
                accept: "application/json",
                "x-api-key": BLOCKVISION_API_KEY,
              },
            }
          );
          return {
            content: [
              {
                type: "text",
                text: `Monad Native Holders (Page ${pageIndex}, Size ${pageSize}): ${JSON.stringify(
                  response.data,
                  null,
                  2
                )}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to retrieve Monad holders. Error: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
          };
        }
      }
    );

    // New tool: Retrieve Collection Holders
    server.tool(
      "retrieve_collection_holders",
      "Retrieve holders for a given collection contract address",
      {
        contractAddress: z
          .string()
          .describe("The collection contract address to retrieve holders for"),
        pageIndex: z
          .number()
          .optional()
          .default(1)
          .describe("Page index for pagination"),
        pageSize: z
          .number()
          .optional()
          .default(20)
          .describe("Number of holders per page"),
      },
      async ({ contractAddress, pageIndex, pageSize }) => {
        try {
          const response = await axios.get(
            `https://api.blockvision.org/v2/monad/collection/holders?contractAddress=${contractAddress}&pageIndex=${pageIndex}&pageSize=${pageSize}`,
            {
              headers: {
                accept: "application/json",
                "x-api-key": BLOCKVISION_API_KEY,
              },
            }
          );
          return {
            content: [
              {
                type: "text",
                text: `Collection Holders for ${contractAddress} (Page ${pageIndex}, Size ${pageSize}): ${JSON.stringify(
                  response.data,
                  null,
                  2
                )}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to retrieve collection holders for contract: ${contractAddress}. Error: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
          };
        }
      }
    );

    // New tool: Retrieve Contract Source Code
    server.tool(
      "retrieve_contract_source_code",
      "Retrieve source code for a given contract address",
      {
        address: z
          .string()
          .describe("The contract address to retrieve source code for"),
      },
      async ({ address }) => {
        try {
          const response = await axios.get(
            `https://api.blockvision.org/v2/monad/contract/source/code?address=${address}`,
            {
              headers: {
                accept: "application/json",
                "x-api-key": BLOCKVISION_API_KEY,
              },
            }
          );
          return {
            content: [
              {
                type: "text",
                text: `Contract Source Code for ${address}: ${JSON.stringify(response.data, null, 2)}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to retrieve contract source code for address: ${address}. Error: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
          };
        }
      }
    );

    server.tool(
      "get_monorail_quote",
      "Get a token swap quote from Monorail on Monad testnet",
      {
        amount: z
          .string()
          .describe("Human-readable amount to swap (e.g., '1.25')"),
        fromTokenAddress: z
          .string()
          .describe(
            "Token address or symbol to swap from (e.g., 'MON' or '0x...')"
          ),
        toTokenAddress: z
          .string()
          .describe(
            "Token address or symbol to swap to (e.g., 'USDC' or '0x...')"
          ),
        senderAddress: z
          .string()
          .optional()
          .describe("Wallet address executing the transaction (optional)"),
        slippage: z
          .number()
          .min(0)
          .optional()
          .default(50)
          .describe("Slippage tolerance in basis points (default: 50)"),
        deadline: z
          .number()
          .min(0)
          .optional()
          .default(60)
          .describe("Deadline in seconds (default: 60)"),
        maxHops: z
          .number()
          .min(1)
          .max(5)
          .optional()
          .default(3)
          .describe("Maximum number of hops (1–5, default: 3)"),
        excludedProtocols: z
          .string()
          .optional()
          .describe(
            "Comma-separated protocols to exclude (e.g., 'uniswap-v2,pancakeswap-v2')"
          ),
        source: z
          .string()
          .optional()
          .describe("Source identifier for the request (optional)")
      },
      async ({
        amount,
        fromTokenAddress,
        toTokenAddress,
        senderAddress,
        slippage,
        deadline,
        maxHops,
        excludedProtocols,
        source
      }) => {
        try {
          // Resolve token addresses from symbols if provided
          const fromAddress = await resolveTokenAddress(fromTokenAddress);
          const toAddress = await resolveTokenAddress(toTokenAddress);

          // Construct the query URL
          const queryParams = new URLSearchParams({
            amount,
            from: fromAddress,
            to: toAddress,
            slippage: slippage.toString(),
            deadline: deadline.toString(),
            max_hops: maxHops.toString()
          });

          if (senderAddress) queryParams.append("sender", senderAddress);
          if (excludedProtocols) queryParams.append("excluded", excludedProtocols);
          // Set the source to this MCP server
          queryParams.append("source", source || "monorail-mcp");

          const url = `${API_ENDPOINTS.QUOTE_API}/v1/quote?${queryParams.toString()}`;
          const response = await axios.get(url, {
            headers: {
              accept: "application/json"
            }
          });

          // Check for high price impact
          const priceImpact = response.data.priceImpact;
          if (priceImpact && parseFloat(priceImpact) > 20) {
            return {
              content: [
                {
                  type: "text",
                  text: `⚠️ Warning: High price impact detected (${priceImpact}%)!\n\nQuote details: ${JSON.stringify(
                    response.data,
                    null,
                    2
                  )}`
                }
              ]
            };
          }

          return {
            content: [
              {
                type: "text",
                text: `Monorail quote for ${amount} ${fromTokenAddress} to ${toTokenAddress}: ${JSON.stringify(
                  response.data,
                  null,
                  2
                )}`
              }
            ]
          };
        } catch (error) {
          if (axios.isAxiosError(error) && error.response) {
            const errorData = error.response.data as ErrorResponse;
            return {
              content: [
                {
                  type: "text",
                  text: `Quote API Error: ${errorData.message || error.message}`
                }
              ]
            };
          }
          return {
            content: [
              {
                type: "text",
                text: `Failed to retrieve Monorail quote: ${
                  error instanceof Error ? error.message : String(error)
                }`
              }
            ]
          };
        }
      }
    );

    server.tool(
      "execute_monorail_swap",
      "Execute a token swap on Monad testnet using Monorail Quote API",
      {
        amount: z
          .string()
          .describe("Human-readable amount to swap (e.g., '1.25')"),
        fromTokenAddress: z
          .string()
          .describe(
            "Token address to swap from (use 0x0000000000000000000000000000000000000000 for native MON)"
          ),
        toTokenAddress: z
          .string()
          .describe(
            "Token address to swap to (use 0x0000000000000000000000000000000000000000 for native MON)"
          ),
        slippage: z
          .number()
          .min(0)
          .optional()
          .default(50)
          .describe("Slippage tolerance in basis points (default: 50)"),
        deadline: z
          .number()
          .min(0)
          .optional()
          .default(60)
          .describe("Deadline in seconds (default: 60)"),
        maxHops: z
          .number()
          .min(1)
          .max(5)
          .optional()
          .default(3)
          .describe("Maximum number of hops (1–5, default: 3)"),
        excludedProtocols: z
          .string()
          .optional()
          .describe(
            "Comma-separated protocols to exclude (e.g., 'uniswap-v2,pancakeswap-v2')"
          ),
        source: z
          .string()
          .optional()
          .describe("Source identifier for the request (optional)")
      },
      async ({
        amount,
        fromTokenAddress,
        toTokenAddress,
        slippage,
        deadline,
        maxHops,
        excludedProtocols,
        source
      }) => {
        try {
          // Check for private key
          if (!process.env.PRIVATE_KEY) {
            throw new Error("PRIVATE_KEY not set in environment");
          }

          // Create wallet client and derive address
          const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
          const senderAddress = account.address;

          // Create wallet client for signing
          const walletClient = createWalletClient({
            account,
            chain: {
              id: 10143, // Monad testnet chain ID
              name: "Monad Testnet",
              nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
              rpcUrls: { default: { http: ["https://testnet-rpc.monad.xyz"] } }
            },
            transport: http()
          });

          // Fetch quote from Monorail API
          const queryParams = new URLSearchParams({
            amount,
            from: fromTokenAddress,
            to: toTokenAddress,
            sender: senderAddress,
            slippage: slippage.toString(),
            deadline: deadline.toString(),
            max_hops: maxHops.toString()
          });
          if (excludedProtocols)
            queryParams.append("excluded", excludedProtocols);
          if (source) queryParams.append("source", source);

          const url = `${API_ENDPOINTS.QUOTE_API}/v1/quote?${queryParams.toString()}`;
          const response = await axios.get(url, {
            headers: {
              accept: "application/json"
            }
          });

          const quote = response.data;
          const { transaction } = quote;

          if (!transaction || !transaction.to || !transaction.data) {
            throw new Error("Invalid transaction data in quote response");
          }

          // Prepare transaction
          const tx = {
            account: walletClient.account,
            to: transaction.to as `0x${string}`,
            data: transaction.data as `0x${string}`,
            value: BigInt(transaction.value || "0"),
            gasLimit: BigInt(300000) // Adjust based on testing
          };

          // Sign and send transaction
          const txHash = await walletClient.sendTransaction(tx);

          return {
            content: [
              {
                type: "text",
                text: `Swap executed successfully from address ${senderAddress}\nTransaction hash: ${txHash}\nQuote details: ${JSON.stringify(
                  quote,
                  null,
                  2
                )}`
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to execute swap: ${
                  error instanceof Error ? error.message : String(error)
                }`
              }
            ]
          };
        }
      }
    );

    // New tool: Retrieve Token Gating
    server.tool(
      "retrieve_token_gating",
      "Retrieve token gating information for an account and contract address",
      {
        account: z
          .string()
          .describe("The account address to check token gating for"),
        contractAddress: z
          .string()
          .describe("The contract address for token gating"),
      },
      async ({ account, contractAddress }) => {
        try {
          const response = await axios.get(
            `https://api.blockvision.org/v2/monad/token/gating?account=${account}&contractAddress=${contractAddress}`,
            {
              headers: {
                accept: "application/json",
                "x-api-key": BLOCKVISION_API_KEY,
              },
            }
          );
          return {
            content: [
              {
                type: "text",
                text: `Token Gating for ${account} (Contract ${contractAddress}): ${JSON.stringify(
                  response.data,
                  null,
                  2
                )}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to retrieve token gating for account: ${account}. Error: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
          };
        }
      }
    );

    server.tool(
      "trade_nadfun_token",
      "Create and trade meme tokens on Nad.fun (bonding curve or DEX) and fetch market/account data",
      {
        action: z.enum(["create_token", "buy", "sell", "exact_buy", "get_market_info", "get_positions"]).describe("Action to perform: create_token, buy, sell, exact_buy, get_market_info, get_positions"),
        tokenAddress: z.string().describe("Token contract address (for buy, sell, exact_buy, get_market_info)").optional(),
        amount: z.string().describe("Amount of MON (for buy) or tokens (for sell/exact_buy)").optional(),
        slippage: z.number().min(0).max(10).default(0.5).describe("Slippage percentage for DEX trades").optional(),
        accountAddress: z.string().describe("Account address for positions or transactions").optional(),
        name: z.string().describe("Token name (for create_token)").optional(),
        symbol: z.string().describe("Token symbol (for create_token)").optional(),
        totalSupply: z.string().describe("Total supply in tokens (for create_token)").optional()
      },
      async ({ action, tokenAddress, amount, slippage = 0.5, accountAddress, name, symbol, totalSupply }) => {
        try {
          // Input validation
          if (action === "create_token" && (!name || !symbol || !totalSupply || !accountAddress)) {
            throw new Error("name, symbol, totalSupply, and accountAddress required for create_token");
          }
          if (["buy", "sell", "exact_buy", "get_market_info"].includes(action) && !tokenAddress) {
            throw new Error("tokenAddress required");
          }
          if (["buy", "sell", "exact_buy"].includes(action) && (!amount || !accountAddress)) {
            throw new Error("amount and accountAddress required for trading actions");
          }

          // Create clients
          const publicClient = createPublicRpcClient();
          const walletClient = process.env.PRIVATE_KEY ? 
            createWalletClientFromPrivateKey(process.env.PRIVATE_KEY as `0x${string}`) : 
            null;

          if (["create_token", "buy", "sell", "exact_buy"].includes(action) && !walletClient) {
            throw new Error("PRIVATE_KEY required for trading actions");
          }

          // Get market info for trading actions
          let marketData;
          if (tokenAddress) {
            try {
              marketData = await getTokenMarketInfo(tokenAddress);
              
              // Validate market data
              if (!marketData) {
                throw new Error("Failed to fetch market data");
              }

              // Add market state validation
              if (["buy", "sell", "exact_buy"].includes(action)) {
                if (!marketData.market_type || marketData.market_type === "NONE") {
                  throw new Error("Token is not bonded yet. Cannot trade until bonding curve is initialized.");
                }

                // Verify contract state
                await verifyContractState(tokenAddress, accountAddress!, publicClient);
              }
            } catch (error) {
              throw new Error(`Market data error: ${error instanceof Error ? error.message : String(error)}`);
            }
          }

          // Handle token creation
          if (action === "create_token" && name && symbol && totalSupply && accountAddress && walletClient) {
            try {
              // Validate inputs
              if (!name || name.trim().length === 0) throw new Error("Invalid token name");
              if (!symbol || symbol.trim().length === 0) throw new Error("Invalid token symbol");
              if (!totalSupply || parseFloat(totalSupply) <= 0) throw new Error("Invalid total supply");
              
              console.log("Creating token with params:", { name, symbol, totalSupply, accountAddress });
              
              // Convert total supply to wei
              const totalSupplyWei = parseEther(totalSupply);
              const creationFee = parseEther("3"); // 3 MON fee
              
              // Check account balance
              const balance = await publicClient.getBalance({ address: accountAddress as `0x${string}` });
              if (balance < creationFee) {
                throw new Error(`Insufficient MON balance. Required: 3 MON, Current: ${formatUnits(balance, 18)} MON`);
              }
              
              console.log("Preparing transaction parameters...");
              
              const txParams = {
                account: walletClient.account,
                address: CONTRACT_ADDRESSES.BONDING_CURVE_FACTORY as `0x${string}`,
                abi: NadFunAbi.IBondingCurveFactory,
                functionName: "createToken",
                args: [name, symbol, totalSupplyWei, accountAddress],
                value: creationFee,
                chain: walletClient.chain
              };
              
              console.log("Estimating gas...");
              
              // Add extra gas margin for token creation
              const estimatedGas = await publicClient.estimateGas(txParams);
              const gasLimit = (estimatedGas * BigInt(150)) / BigInt(100); // 50% extra margin
              
              console.log("Sending transaction...");
              
              const txHash = await walletClient.writeContract({
                ...txParams,
                gas: gasLimit
              });
              
              console.log("Transaction sent:", txHash);
              
              // Wait for transaction and get receipt
              const receipt = await waitForTransaction(txHash, publicClient);
              
              // Custom serializer for BigInt
              const receiptStr = JSON.stringify(receipt, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value
              , 2);
              
              console.log("Transaction receipt:", receiptStr);
              
              // Get token address from transaction receipt using ABI event decoding
              let tokenAddress;
              for (const log of receipt.logs) {
                try {
                  const decoded = decodeEventLog({
                    abi: NadFunAbi.IBondingCurveFactory,
                    data: log.data,
                    topics: log.topics,
                  });
                  if (
                    decoded.eventName === "CreatedToken" &&
                    decoded.args &&
                    typeof decoded.args === "object" &&
                    !Array.isArray(decoded.args) &&
                    "token" in decoded.args &&
                    typeof decoded.args.token === "string"
                  ) {
                    tokenAddress = decoded.args.token.toLowerCase();
                    break;
                  }
                } catch (e) {
                  // Not the right event, skip
                  continue;
                }
              }
              
              if (!tokenAddress) {
                console.error("Full receipt logs:", JSON.stringify(receipt.logs, (key, value) =>
                  typeof value === 'bigint' ? value.toString() : value
                , 2));
                throw new Error("Failed to parse token address from transaction logs");
              }
              
              console.log("Found token address:", tokenAddress);
              
              // Store token address in Redis for future reference
              await setContractAddress(`nadfun_token_${name}`, tokenAddress);
              
              return {
                content: [{ 
                  type: "text", 
                  text: `Token created successfully!\nTransaction Hash: ${txHash}\nToken Address: ${tokenAddress}\nName: ${name}\nSymbol: ${symbol}\nTotal Supply: ${totalSupply}\n\nFull receipt: ${receiptStr}` 
                }]
              };
            } catch (error) {
              console.error("Token creation error:", error);
              throw new Error(`Token creation failed: ${error instanceof Error ? error.message : String(error)}`);
            }
          }

          // Handle market info request
          if (action === "get_market_info" && marketData) {
            return {
              content: [{ type: "text", text: `Market Info: ${JSON.stringify(marketData, null, 2)}` }]
            };
          }

          // Handle positions request
          if (action === "get_positions" && accountAddress) {
            const positions = await getAccountPositions(accountAddress);
            return {
              content: [{ type: "text", text: `Account Positions: ${JSON.stringify(positions, null, 2)}` }]
            };
          }

          // Trading actions require market data
          if (!marketData) throw new Error("Failed to fetch market data");

          const isDex = marketData.market_type === "DEX";
          const isCurve = marketData.market_type === "CURVE";
          
          // Validate token state and reserves
          if (["buy", "sell", "exact_buy"].includes(action)) {
            const reserveToken = marketData.reserve_token ? BigInt(marketData.reserve_token) : BigInt(0);
            const targetToken = marketData.target_token ? BigInt(marketData.target_token) : BigInt(0);
            const availableTokens = reserveToken - targetToken;

            if (availableTokens <= BigInt(0)) {
              throw new Error("No tokens available for trading");
            }
          }

          // Handle trading actions with improved error handling and retries
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
                address: CONTRACT_ADDRESSES.CORE as `0x${string}`,
                abi: NadFunAbi.ICore,
                functionName: "buy",
                args: [amountIn, fee, tokenAddress, accountAddress, deadline],
                value: totalValue
              };

              // Implement retry logic for gas estimation
              let gas;
              let retries = 3;
              while (retries > 0) {
                try {
                  gas = await estimateGasWithMargin(txParams, publicClient);
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
            } else if (isDex) {
              if (!marketData.is_listing) {
                throw new Error("Token is not yet listed on DEX. Use bonding curve functions to purchase.");
              }

              const valueInWei = parseEther(amount);
              const path = [
                CONTRACT_ADDRESSES.WRAPPED_MON as `0x${string}`,
                tokenAddress as `0x${string}`
              ];

              const amounts = await publicClient.readContract({
                address: CONTRACT_ADDRESSES.INTERNAL_UNISWAP_V2_ROUTER as `0x${string}`,
                abi: NadFunAbi.IUniswapV2Router,
                functionName: "getAmountsOut",
                args: [valueInWei, path]
              });

              const expectedTokenAmount = (amounts as bigint[])[1];
              const slippageFactor = BigInt(1000) - BigInt(Math.floor(slippage * 10));
              const minTokens = (expectedTokenAmount * slippageFactor) / BigInt(1000);
              const deadline = BigInt(Math.floor(Date.now() / 1000) + 20 * 60);

              const txParams = {
                account: walletClient.account,
                address: CONTRACT_ADDRESSES.INTERNAL_UNISWAP_V2_ROUTER as `0x${string}`,
                abi: NadFunAbi.IUniswapV2Router,
                functionName: "swapExactNativeForTokens",
                args: [minTokens, path, accountAddress, deadline],
                value: valueInWei
              };

              const gas = await estimateGasWithMargin(txParams, publicClient);
              const txHash = await walletClient.writeContract({
                ...txParams,
                gas
              });

              return {
                content: [{ 
                  type: "text", 
                  text: `DEX buy successful. Hash: ${txHash}\nExpected tokens: ${formatUnits(expectedTokenAmount, 18)}` 
                }]
              };
            } else {
              throw new Error(`Invalid market type: ${marketData.market_type}`);
            }
          }

          if (action === "sell" && amount && accountAddress && walletClient) {
            if (isDex) {
              const tokenAmountInWei = parseEther(amount);

              if (!marketData.is_listing) {
                throw new Error("Token is not yet listed on DEX. Use bonding curve functions to sell.");
              }

              const routerAddress = CONTRACT_ADDRESSES.INTERNAL_UNISWAP_V2_ROUTER as `0x${string}`;
              
              // Check and approve tokens
              const currentAllowance = await publicClient.readContract({
                address: tokenAddress as `0x${string}`,
                abi: NadFunAbi.IToken,
                functionName: "allowance",
                args: [accountAddress, routerAddress]
              }) as bigint;
              
              if (currentAllowance < tokenAmountInWei) {
                const approveTxParams = {
                  account: walletClient.account,
                  address: tokenAddress as `0x${string}`,
                  abi: NadFunAbi.IToken,
                  functionName: "approve",
                  args: [routerAddress, tokenAmountInWei]
                };

                const approveGas = await estimateGasWithMargin(approveTxParams, publicClient);
                const approveTxHash = await walletClient.writeContract({
                  ...approveTxParams,
                  gas: approveGas
                });
                await publicClient.waitForTransactionReceipt({ hash: approveTxHash });
              }

              const path = [tokenAddress as `0x${string}`, CONTRACT_ADDRESSES.WRAPPED_MON as `0x${string}`];
              const amounts = await publicClient.readContract({
                address: routerAddress,
                abi: NadFunAbi.IUniswapV2Router,
                functionName: "getAmountsOut",
                args: [tokenAmountInWei, path]
              });
              
              const expectedAmount = (amounts as bigint[])[1];
              const slippageFactor = BigInt(1000) - BigInt(Math.floor(slippage * 10));
              const minAmount = (expectedAmount * slippageFactor) / BigInt(1000);
              const deadline = BigInt(Math.floor(Date.now() / 1000) + 20 * 60);
              
              const txParams = {
                account: walletClient.account,
                address: routerAddress,
                abi: NadFunAbi.IUniswapV2Router,
                functionName: "swapExactTokensForNative",
                args: [tokenAmountInWei, minAmount, path, accountAddress, deadline]
              };

              const gas = await estimateGasWithMargin(txParams, publicClient);
              const txHash = await walletClient.writeContract({
                ...txParams,
                gas
              });

              return {
                content: [{ 
                  type: "text", 
                  text: `DEX sell successful. Hash: ${txHash}\nExpected MON: ${formatUnits(expectedAmount, 18)}` 
                }]
              };
            } else if (isCurve) {
              // Enhanced bonding curve sell with retries and better error handling
              const tokenAmountInWei = parseEther(amount);
              const coreAddress = CONTRACT_ADDRESSES.CORE as `0x${string}`;
              
              // Calculate expected output with slippage for sell
              const virtualNative = BigInt(marketData.virtual_native);
              const virtualToken = BigInt(marketData.virtual_token);
              const expectedOutput = calculateBondingCurveInput(tokenAmountInWei, virtualNative, virtualToken);
              const minOutput = (expectedOutput * BigInt(1000 - Math.floor(slippage * 10))) / BigInt(1000);
              
              // Check and approve tokens with retry logic
              const currentAllowance = await publicClient.readContract({
                address: tokenAddress as `0x${string}`,
                abi: NadFunAbi.IToken,
                functionName: "allowance",
                args: [accountAddress, coreAddress]
              }) as bigint;
              
              if (currentAllowance < tokenAmountInWei) {
                const approveTxParams = {
                  account: walletClient.account,
                  address: tokenAddress as `0x${string}`,
                  abi: NadFunAbi.IToken,
                  functionName: "approve",
                  args: [coreAddress, tokenAmountInWei]
                };

                let approveGas;
                let retries = 3;
                while (retries > 0) {
                  try {
                    approveGas = await estimateGasWithMargin(approveTxParams, publicClient);
                    break;
                  } catch (error) {
                    retries--;
                    if (retries === 0) throw error;
                    await new Promise(resolve => setTimeout(resolve, 1000));
                  }
                }

                const approveTxHash = await walletClient.writeContract({
                  ...approveTxParams,
                  gas: approveGas
                });
                await publicClient.waitForTransactionReceipt({ hash: approveTxHash });
              }
              
              const deadline = BigInt(Math.floor(Date.now() / 1000) + 20 * 60);
              const txParams = {
                account: walletClient.account,
                address: coreAddress,
                abi: NadFunAbi.ICore,
                functionName: "sell",
                args: [tokenAmountInWei, tokenAddress, accountAddress, deadline]
              };

              let gas;
              let retries = 3;
              while (retries > 0) {
                try {
                  gas = await estimateGasWithMargin(txParams, publicClient);
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

              return {
                content: [{ 
                  type: "text", 
                  text: `Bonding curve sell successful. Hash: ${txHash}\nAmount: ${amount} tokens\nExpected Output: ${formatUnits(expectedOutput, 18)} MON\nMin Output with Slippage: ${formatUnits(minOutput, 18)} MON` 
                }]
              };
            } else {
              throw new Error(`Invalid market type: ${marketData.market_type}`);
            }
          }

          if (action === "exact_buy" && amount && accountAddress && walletClient) {
            if (!isCurve) {
              throw new Error("exact_buy is only available in bonding curve phase");
            }
            
            const tokensOut = parseEther(amount);
            const reserveToken = marketData.reserve_token ? BigInt(marketData.reserve_token) : BigInt(0);
            const targetToken = marketData.target_token ? BigInt(marketData.target_token) : BigInt(0);
            const availableTokens = reserveToken - targetToken;
            
            if (tokensOut > availableTokens) {
              throw new Error(`Requested ${amount} tokens exceeds available ${formatUnits(availableTokens, 18)}`);
            }
            
            const virtualNative = BigInt(marketData.virtual_native);
            const virtualToken = BigInt(marketData.virtual_token);
            const k = virtualNative * virtualToken;
            
            const effectiveAmount = calculateRequiredAmountIn(tokensOut, k, virtualNative, virtualToken);
            const fee = (effectiveAmount * BigInt(10)) / BigInt(1000); // 1% fee
            const deadline = BigInt(Math.floor(Date.now() / 1000) + 20 * 60);
            
            const txParams = {
              account: walletClient.account,
              address: CONTRACT_ADDRESSES.CORE as `0x${string}`,
              abi: NadFunAbi.ICore,
              functionName: "exactOutBuy",
              args: [effectiveAmount + fee, tokensOut, tokenAddress, accountAddress, deadline],
              value: effectiveAmount + fee
            };

            const gas = await estimateGasWithMargin(txParams, publicClient);
            const txHash = await walletClient.writeContract({
              ...txParams,
              gas
            });

            // Wait for transaction and verify
            await waitForTransaction(txHash, publicClient);

            return {
              content: [{ 
                type: "text", 
                text: `Exact buy successful.\nHash: ${txHash}\nTokens: ${amount}\nRequired MON: ${formatUnits(effectiveAmount, 18)}` 
              }]
            };
          }

          throw new Error(`Invalid action: ${action}`);
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to execute ${action}: ${error instanceof Error ? error.message : String(error)}`
              }
            ]
          };
        }
      }
    );

    server.tool(
      "get_token_by_market_cap",
      "Retrieve tokens ordered by market capitalization from Nad.fun",
      {
        page: z.number().optional().default(1).describe("Page number for pagination"),
        limit: z.number().optional().default(10).describe("Number of tokens per page")
      },
      async ({ page = 1, limit = 10 }) => {
        try {
          const response = await axios.get(
            `https://testnet-bot-api-server.nad.fun/order/market_cap?page=${page}&limit=${limit}`
          );

          const formattedTokens = response.data.order_token.map((token: any) => ({
            token_info: {
              address: token.token_info.token_address,
              name: token.token_info.name,
              symbol: token.token_info.symbol,
              creator: token.token_info.creator,
              total_supply: token.token_info.total_supply,
              created_at: token.token_info.created_at
            },
            market_info: {
              type: token.market_info.market_type,
              price: token.market_info.price,
              market_cap: parseFloat(token.market_info.price) * parseFloat(token.token_info.total_supply)
            }
          }));

          return {
            content: [
              {
                type: "text",
                text: `Tokens by Market Cap (Page ${page}):\n${JSON.stringify(formattedTokens, null, 2)}\nTotal Count: ${response.data.total_count}`
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to retrieve tokens by market cap: ${error instanceof Error ? error.message : String(error)}`
              }
            ]
          };
        }
      }
    );

    server.tool(
      "get_tokens_by_creation_time",
      "Retrieve tokens ordered by creation time (newest first)",
      {
        page: z.number().optional().default(1).describe("Page number for pagination"),
        limit: z.number().optional().default(10).describe("Number of tokens per page")
      },
      async ({ page = 1, limit = 10 }) => {
        try {
          const response = await axios.get(
            `https://testnet-bot-api-server.nad.fun/order/creation_time?page=${page}&limit=${limit}`
          );

          return {
            content: [
              {
                type: "text",
                text: `Newest Tokens (Page ${page}):\n${JSON.stringify(response.data, null, 2)}`
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to retrieve tokens by creation time: ${error instanceof Error ? error.message : String(error)}`
              }
            ]
          };
        }
      }
    );

    server.tool(
      "get_tokens_by_latest_trade",
      "Retrieve tokens ordered by most recent trading activity",
      {
        page: z.number().optional().default(1).describe("Page number for pagination"),
        limit: z.number().optional().default(10).describe("Number of tokens per page")
      },
      async ({ page = 1, limit = 10 }) => {
        try {
          const response = await axios.get(
            `https://testnet-bot-api-server.nad.fun/order/latest_trade?page=${page}&limit=${limit}`
          );

          return {
            content: [
              {
                type: "text",
                text: `Most Recently Traded Tokens (Page ${page}):\n${JSON.stringify(response.data, null, 2)}`
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to retrieve tokens by latest trade: ${error instanceof Error ? error.message : String(error)}`
              }
            ]
          };
        }
      }
    );

    server.tool(
      "get_token_chart_data",
      "Retrieve price and volume chart data for a token",
      {
        tokenAddress: z.string().describe("Token contract address"),
        interval: z.enum(['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w']).default('1h').describe("Chart interval"),
        baseTimestamp: z.number().optional().describe("Base timestamp (defaults to current time)")
      },
      async ({ tokenAddress, interval, baseTimestamp = Math.floor(Date.now() / 1000) }) => {
        try {
          const response = await axios.get(
            `https://testnet-bot-api-server.nad.fun/token/chart/${tokenAddress}?interval=${interval}&base_timestamp=${baseTimestamp}`
          );

          return {
            content: [
              {
                type: "text",
                text: `Chart Data for ${tokenAddress} (${interval} interval):\n${JSON.stringify(response.data, null, 2)}`
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to retrieve token chart data: ${error instanceof Error ? error.message : String(error)}`
              }
            ]
          };
        }
      }
    );

    server.tool(
      "get_token_swap_history",
      "Retrieve swap history for a specific token",
      {
        tokenAddress: z.string().describe("Token contract address"),
        page: z.number().optional().default(1).describe("Page number for pagination"),
        limit: z.number().optional().default(10).describe("Number of swaps per page")
      },
      async ({ tokenAddress, page = 1, limit = 10 }) => {
        try {
          const response = await axios.get(
            `https://testnet-bot-api-server.nad.fun/token/swap/${tokenAddress}?page=${page}&limit=${limit}`
          );

          return {
            content: [
              {
                type: "text",
                text: `Swap History for ${tokenAddress}:\n${JSON.stringify(response.data, null, 2)}`
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to retrieve token swap history: ${error instanceof Error ? error.message : String(error)}`
              }
            ]
          };
        }
      }
    );

    server.tool(
      "get_token_metadata",
      "Retrieve detailed metadata for a specific token",
      {
        tokenAddress: z.string().describe("Token contract address")
      },
      async ({ tokenAddress }) => {
        try {
          const response = await axios.get(
            `https://testnet-bot-api-server.nad.fun/token/${tokenAddress}`
          );

          return {
            content: [
              {
                type: "text",
                text: `Token Metadata for ${tokenAddress}:\n${JSON.stringify(response.data, null, 2)}`
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to retrieve token metadata: ${error instanceof Error ? error.message : String(error)}`
              }
            ]
          };
        }
      }
    );

    // Create NFT Collection Tool
    server.tool(
      "create_nft_collection",
      "Create an NFT collection on Monad testnet and mint the initial NFTs",
      {
        name: z.string().min(1).describe("Name of the NFT collection (e.g., 'The Pond')"),
        symbol: z.string().min(1).describe("Symbol of the NFT collection (e.g., 'POND')"),
        description: z.string().min(1).describe("Description of the NFT collection"),
        artType: z.enum(["same", "unique"]).describe("NFT art type: 'same' (ERC-1155, same artwork) or 'unique' (ERC-721, unique artwork)"),
        maxSupply: z.number().positive().int().describe("Maximum supply of NFTs in the collection"),
        royaltyFee: z.number().min(0).max(100).describe("Royalty fee percentage for secondary sales (e.g., 5 for 5%)"),
        recipientAddress: z.string().describe("Address to receive the minted NFTs"),
        collectionImageUrl: z.string().describe("Base64 encoded image data or URL")
      },
      async ({ name, symbol, description, artType, maxSupply, royaltyFee, recipientAddress, collectionImageUrl }) => {
        try {
          console.log('Starting NFT collection creation process...');
          
          // Validate environment variables
          if (!process.env.PINATA_API_KEY || !process.env.PINATA_API_SECRET) {
            throw new Error('PINATA_API_KEY and PINATA_API_SECRET must be set in environment variables');
          }

          let imageUrl: string;
          
          // Convert base64 to buffer if it's base64 data
          if (collectionImageUrl.startsWith('data:')) {
            console.log('Converting base64 image to buffer...');
            const buffer = await base64ToBuffer(collectionImageUrl);
            
            // Create a Blob from the buffer
            const blob = new Blob([buffer], { type: 'image/png' });
            
            // Create a File object from the Blob
            const file = new File([blob], 'nft-image.png', { type: 'image/png' });
            
            // Upload directly using the imported uploadToPinata function
            console.log('Uploading to Pinata...');
            const ipfsHash = await uploadToPinata(file);
            imageUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
          } else if (collectionImageUrl.startsWith('http')) {
            // If it's a URL, download it first
            console.log('Downloading image from URL...');
            const response = await axios.get(collectionImageUrl, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(response.data);
            
            // Create a Blob and File object
            const blob = new Blob([buffer], { type: 'image/png' });
            const file = new File([blob], 'nft-image.png', { type: 'image/png' });
            
            // Upload using uploadToPinata
            console.log('Uploading to Pinata...');
            const ipfsHash = await uploadToPinata(file);
            imageUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
          } else {
            throw new Error('Invalid image format. Please provide either a base64 encoded image or a URL');
          }
          
          console.log('Image uploaded successfully:', imageUrl);
          
          // Create NFT collection with the IPFS URL
          console.log('Creating NFT collection...');
          const result = await createNFTCollection({
            name,
            image: imageUrl,
            maxSupply,
            recipientAddress,
            description,
            royaltyFee
          });

          return {
            content: [{
              type: "text",
              text: `NFT Collection created successfully!\n\nCollection Details:\nName: ${name}\nSymbol: ${symbol}\nDescription: ${description}\nArt Type: ${artType}\nMax Supply: ${maxSupply}\nRoyalty Fee: ${royaltyFee}%\nRecipient: ${recipientAddress}\nImage URL: ${imageUrl}\n\nDeployment Result:\n${JSON.stringify(result, null, 2)}`
            }]
          };
        } catch (error) {
          console.error('NFT Collection creation error:', error);
          return {
            content: [{
              type: "text",
              text: `Failed to create NFT collection: ${error instanceof Error ? error.message : String(error)}`
            }]
          };
        }
      }
    );

    // --- Castora Tools ---
    server.tool(
      "submit_price_prediction",
      "Submit a price prediction to a Castora pool on Monad Testnet",
      {
        poolId: z.number().positive().int().describe("Pool ID to join (e.g., 1 for ETH pool)"),
        predictedPrice: z.number().positive().describe("Predicted price in USD (e.g., 2500.75 for ETH)"),
        recipientAddress: z.string().describe("Wallet address to submit the prediction (ignored, MCP wallet is always used)")
      },
      async ({ poolId, predictedPrice }) => {
        try {
          if (!process.env.PRIVATE_KEY) {
            throw new Error("PRIVATE_KEY required");
          }

          // Always use MCP wallet address for recipient
          const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
          const recipientAddress = account.address;

          // Initialize Viem clients
          const walletClient = createWalletClient({
            account,
            chain: {
              id: 10143,
              name: "Monad Testnet",
              nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
              rpcUrls: { default: { http: ["https://testnet-rpc.monad.xyz"] } },
            },
            transport: http(),
          });

          const publicClient = createPublicClient({
            chain: {
              id: 10143,
              name: "Monad Testnet",
              nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
              rpcUrls: { default: { http: ["https://testnet-rpc.monad.xyz"] } },
            },
            transport: http(),
          });

          // Get prediction decimals from contract
          const predictionDecimals = await publicClient.readContract({
            address: CASTORA_CONTRACT_ADDRESS as `0x${string}`,
            abi: castoraAbi,
            functionName: "PREDICTION_DECIMALS",
          });

          // Fetch pool details to validate and get entry fee
          const poolDetails = await publicClient.readContract({
            address: CASTORA_CONTRACT_ADDRESS as `0x${string}`,
            abi: castoraAbi,
            functionName: "getPool",
            args: [BigInt(poolId)],
          });

          const { seeds, noOfPredictions } = poolDetails;
          const { stakeToken, stakeAmount, snapshotTime } = seeds;
          const snapshotDate = new Date(Number(snapshotTime) * 1000).toISOString();

          // Log stakeToken and contract address for debugging
          console.log(`Pool ${poolId} stakeToken: ${stakeToken}`);

          // Validate pool
          if (stakeAmount <= 0) {
            throw new Error(`Invalid pool ID ${poolId}: No stake amount set`);
          }
          if (Number(snapshotTime) * 1000 < Date.now()) {
            throw new Error(`Pool ${poolId} has already reached snapshot time`);
          }

          // Convert predicted price to wei using contract's decimals
          const predictedPriceWei = BigInt(Math.round(predictedPrice * 10 ** Number(predictionDecimals)));

          // Always send entry fee as native MON
          const txHash = await walletClient.writeContract({
            address: CASTORA_CONTRACT_ADDRESS as `0x${string}`,
            abi: castoraAbi,
            functionName: "predict",
            args: [BigInt(poolId), predictedPriceWei],
            value: stakeAmount, // Always send value as stakeAmount
            gas: BigInt(500000),
          });

          // Wait for transaction receipt
          const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

          // Check for Predicted event
          const predictionEvent = receipt.logs.find(
            (log) => log.topics[0] === "0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1" // Predicted event signature
          );

          const eventDetails = predictionEvent
            ? `Pool ID: ${poolId}, Prediction: ${predictedPrice} USD`
            : "No Predicted event emitted";

          // Double-check and fix MON/gMON mapping for entry fees (for display only)
          const entryFeeToken = stakeToken === "0x0000000000000000000000000000000000000000" ? "MON" : (stakeToken === "0xa0742C672e713327b0D6A4BfF34bBb4cbb319C53" ? "gMON" : stakeToken);

          return {
            content: [
              {
                type: "text",
                text: `Price prediction submitted successfully.\nPool ID: ${poolId}\nStake Token: ${entryFeeToken}\nStake Amount: ${
                  Number(stakeAmount) / 10 ** 18
                } ${entryFeeToken}\nPredicted Price: ${predictedPrice} USD\nSnapshot Time: ${snapshotDate}\nTransaction Hash: ${txHash}\n${eventDetails}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to submit price prediction: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
          };
        }
      }
    );

    // Add claim_winnings tool
    server.tool(
      "claim_winnings",
      "Claim winnings from a Castora pool on Monad Testnet",
      {
        poolId: z.number().positive().int().describe("Pool ID to claim winnings from"),
        predictionId: z.number().positive().int().describe("Prediction ID to claim winnings for"),
      },
      async ({ poolId, predictionId }) => {
        try {
          if (!process.env.PRIVATE_KEY) {
            throw new Error("PRIVATE_KEY required");
          }

          // Initialize Viem clients
          const walletClient = createWalletClient({
            account: privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`),
            chain: {
              id: 10143,
              name: "Monad Testnet",
              nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
              rpcUrls: { default: { http: ["https://testnet-rpc.monad.xyz"] } },
            },
            transport: http(),
          });

          // Claim winnings
          const txHash = await walletClient.writeContract({
            address: CASTORA_CONTRACT_ADDRESS as `0x${string}`,
            abi: castoraAbi,
            functionName: "claimWinnings",
            args: [BigInt(poolId), BigInt(predictionId)],
            gas: BigInt(500000),
          });

          // Wait for transaction receipt
          const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

          // Check for ClaimedWinnings event
          const claimEvent = receipt.logs.find(
            (log) => log.topics[0] === "0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1" // ClaimedWinnings event signature
          );

          const eventDetails = claimEvent
            ? `Successfully claimed winnings for Pool ${poolId}, Prediction ${predictionId}`
            : "No ClaimedWinnings event emitted";

          return {
            content: [
              {
                type: "text",
                text: `Winnings claim submitted successfully.\nPool ID: ${poolId}\nPrediction ID: ${predictionId}\nTransaction Hash: ${txHash}\n${eventDetails}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to claim winnings: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
          };
        }
      }
    );

    // Keep list_castora_pools unchanged
    server.tool(
      "list_castora_pools",
      "Fetch live prediction pools from Castora on Monad Testnet",
      {},
      async () => {
        try {
          // Known token address to symbol mapping
          const TOKEN_SYMBOLS: Record<string, string> = {
            "0x0000000000000000000000000000000000000000": "MON",
            "0xa0742C672e713327b0D6A4BfF34bBb4cbb319C53": "gMON",
            // Add more as needed
          };
          // Known prediction token address to asset symbol mapping
          const PREDICTION_TOKEN_SYMBOLS: Record<string, string> = {
            "0x294C2647D9f3EacA43A364859c6E6a1E0E582DBD": "ETH",
            "0x0ab0Dc55F747ADA00cC15D049CB654bbdc7d5AA6": "SOL",
            "0xD31a59c85aE9D8edEFeC411D448f90841571b89c": "HYPE",
            // Add more as needed
          };

          function delay(ms: number) {
            return new Promise(resolve => setTimeout(resolve, ms));
          }

          // This endpoint expects a GET request with the 'chain' header set to 'monadtestnet'
          const response = await axios.get("https://server.castora.xyz/pools/live", {
            headers: { chain: "monadtestnet" }
          });
          const poolsResponse = response.data;
          const poolIds = poolsResponse.data;

          if (!Array.isArray(poolIds) || poolIds.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: "No live pools available at this time.",
                },
              ],
            };
          }

          let rateLimitHit = false;
          const poolDetailsList = [];
          for (const poolId of poolIds) {
            try {
              const detailResp = await axios.get(`https://server.castora.xyz/pool/${poolId}`, {
                headers: { chain: "monadtestnet" }
              });
              if (!detailResp.data.success || !detailResp.data.data) {
                continue; // skip this pool
              }
              const pool = detailResp.data.data;
              // Format time left
              const now = Date.now();
              const closesAt = Number(pool.seeds.snapshotTime) * 1000;
              let timeLeft = closesAt - now;
              if (timeLeft <= 0) {
                continue; // Only include open pools
              }
              let timeLeftStr = "Closed";
              if (timeLeft > 0) {
                const hours = Math.floor(timeLeft / (1000 * 60 * 60));
                const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
                timeLeftStr = `${hours}h : ${minutes}m : ${seconds}s`;
              }
              // Entry fee and token
              const entryFee = pool.seeds.stakeAmount ? (Number(pool.seeds.stakeAmount) / 1e18).toFixed(2) : "-";
              const entryFeeToken = TOKEN_SYMBOLS[pool.seeds.stakeToken] || pool.seeds.stakeToken;
              // Asset pair
              let pair = pool.assetPair;
              if (!pair) {
                // Try to resolve from asset or predictionToken
                if (pool.asset) {
                  pair = pool.asset;
                } else if (pool.seeds.predictionToken) {
                  const base = PREDICTION_TOKEN_SYMBOLS[pool.seeds.predictionToken] || pool.seeds.predictionToken;
                  pair = `${base}/USD`;
                } else {
                  pair = "?";
                }
              }
              // Duration
              const duration = pool.duration || "24h";
              // Predictions
              const predictions = pool.noOfPredictions || 0;
              // Status (always Open here)
              const status = "Open";
              poolDetailsList.push(
                `Pool ID: ${poolId}\n` +
                `${status}\n` +
                `${duration}\n` +
                `${pair}\n` +
                `Pool Closes In\n${timeLeftStr}\n` +
                `Predictions\n${predictions}\n` +
                `Entry Fee\n${entryFee} ${entryFeeToken}\n`
              );
            } catch (err) {
              const errorObj = err as any;
              if (errorObj?.response?.data?.message === 'RPC Limit Reached') {
                rateLimitHit = true;
              }
              console.error(`Error fetching details for pool ${poolId}:`, errorObj?.response?.data || errorObj?.message || errorObj);
              // skip this pool
            }
            await delay(350); // 350ms delay between requests
          }

          if (poolDetailsList.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: rateLimitHit ? "No live pools could be fetched due to RPC rate limiting. Please try again later." : "No live pools with details available at this time.",
                },
              ],
            };
          }

          let warning = rateLimitHit ? "\n⚠️ Not all pools could be fetched due to RPC rate limiting. Please try again later for a complete list.\n" : "";

          return {
            content: [
              {
                type: "text",
                text: poolDetailsList.join("\n---------------------\n") + warning,
              },
            ],
          };
        } catch (error) {
          // Enhanced error logging for debugging 400 errors
          if (axios.isAxiosError(error)) {
            console.error("Castora pools API error:", {
              url: error.config?.url,
              method: error.config?.method,
              data: error.config?.data,
              status: error.response?.status,
              response: error.response?.data,
            });
          }
          return {
            content: [
              {
                type: "text",
                text: `Failed to fetch live pools: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
          };
        }
      }
    );

    // Temporary tool for direct image upload to Pinata
    server.tool(
      "upload_to_pinata",
      "Upload an image directly to Pinata and get IPFS URL",
      {
        imageData: z.string().describe("Base64 image data to upload")
      },
      async ({ imageData }) => {
        try {
          console.log('Starting Pinata upload process...');
          
          // Validate environment variables
          if (!process.env.PINATA_API_KEY || !process.env.PINATA_API_SECRET) {
            throw new Error('PINATA_API_KEY and PINATA_API_SECRET must be set in environment variables');
          }

          // Convert base64 to buffer
          console.log('Converting image data to buffer...');
          const buffer = await base64ToBuffer(imageData);
          
          // Upload to Pinata
          console.log('Uploading to Pinata...');
          const imageUrl = await uploadImageToPinata(buffer);
          
          console.log('Upload successful:', imageUrl);
          
          return {
            content: [{
              type: "text",
              text: `Image uploaded successfully!\nIPFS URL: ${imageUrl}`
            }]
          };
        } catch (error) {
          console.error('Upload error:', error);
          return {
            content: [{
              type: "text",
              text: `Failed to upload image: ${error instanceof Error ? error.message : String(error)}`
            }]
          };
        }
      }
    );
  },
  {
    capabilities: {
      tools: {
        echo: {
          description: "Echo a message",
        },
        "get-mon-balance": {
          description: "Get MON balance for an address on Monad testnet",
        },
        retrieve_account_tokens: {
          description: "Retrieve tokens for a given Monad account address",
        },
        retrieve_account_nfts: {
          description: "Retrieve NFTs for a given Monad account address",
        },
        retrieve_account_activities: {
          description: "Retrieve activities for a given Monad account address",
        },
        retrieve_account_transactions: {
          description: "Retrieve transactions for a given Monad account address",
        },
        retrieve_account_internal_transactions: {
          description:
            "Retrieve internal transactions for a given Monad account address",
        },
        retrieve_token_activities: {
          description:
            "Retrieve token activities for a given account and token address",
        },
        retrieve_collection_activities: {
          description:
            "Retrieve collection activities for a given account and collection address",
        },
        retrieve_token_holders: {
          description: "Retrieve token holders for a given contract address",
        },
        retrieve_monad_holders: {
          description: "Retrieve native Monad token holders",
        },
        retrieve_collection_holders: {
          description:
            "Retrieve holders for a given collection contract address",
        },
        retrieve_contract_source_code: {
          description: "Retrieve source code for a given contract address",
        },
        retrieve_token_gating: {
          description:
            "Retrieve token gating information for an account and contract address",
        },
        get_monorail_quote: {
          description: "Get a token swap quote from Monorail on Monad testnet"
        },
        execute_monorail_swap: {
          description: "Execute a token swap on Monad testnet using Monorail Quote API"
        },
        get_token_by_market_cap: {
          description: "Retrieve tokens ordered by market capitalization from Nad.fun"
        },
        get_tokens_by_creation_time: {
          description: "Retrieve tokens ordered by creation time (newest first)"
        },
        get_tokens_by_latest_trade: {
          description: "Retrieve tokens ordered by most recent trading activity"
        },
        get_token_chart_data: {
          description: "Retrieve price and volume chart data for a token"
        },
        get_token_swap_history: {
          description: "Retrieve swap history for a specific token"
        },
        get_token_metadata: {
          description: "Retrieve detailed metadata for a specific token"
        },
        create_nft_collection: {
          description: "Create an NFT collection on Monad testnet and mint the initial NFTs"
        },
        submit_price_prediction: {
          description: "Submit a price prediction to a Castora pool on Monad Testnet"
        },
        claim_winnings: {
          description: "Claim winnings from a Castora pool on Monad Testnet"
        },
        list_castora_pools: {
          description: "Fetch live prediction pools from Castora on Monad Testnet"
        },
        upload_to_pinata: {
          description: "Upload an image directly to Pinata and get IPFS URL"
        }
      },
    },
  }
);