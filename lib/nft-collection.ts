import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { setContractAddress } from '@/lib/redis';
import { uploadToPinata } from '@/lib/ipfs';
import MonadNFT from '@/lib/MonadNFT.json';
import MonadNFT1155 from '@/lib/MonadNFT1155.json';
import axios from 'axios';

// Type for image input - can be File, Buffer, or URL string
type ImageInput = File | Buffer | string;

interface NFTCollectionParams {
    name: string;
    image: string | Buffer | File;  // Updated type to match our handling
    maxSupply: number;
    recipientAddress: string;
    description?: string;  // Optional
    royaltyFee?: number;  // Optional, defaults to 5%
}

interface PinataResponse {
    url: string;
    hash: string;
}

export async function createNFTCollection({
    name,
    image,
    maxSupply,
    recipientAddress,
    description = "",  // Default empty description
    royaltyFee = 5    // Default 5% royalty
}: NFTCollectionParams) {
    try {
        console.log('Starting NFT collection creation:', {
            name,
            maxSupply,
            recipientAddress,
            description,
            royaltyFee
        });

        // Check required environment variables
        if (!process.env.PRIVATE_KEY) {
            throw new Error('PRIVATE_KEY required');
        }
        if (!process.env.PINATA_API_KEY || !process.env.PINATA_API_SECRET) {
            throw new Error('PINATA_API_KEY and PINATA_API_SECRET required');
        }

        // Validate inputs
        if (!name || name.trim().length === 0) {
            throw new Error('Name is required');
        }
        if (!maxSupply || maxSupply <= 0) {
            throw new Error('Max supply must be greater than 0');
        }
        if (!recipientAddress || !recipientAddress.startsWith('0x')) {
            throw new Error('Valid recipient address is required');
        }

        // Auto-generate symbol from name
        const symbol = generateSymbol(name);
        console.log('Generated symbol:', symbol);
        
        // Handle different types of image input
        let imageUrl = '';
        let imageBuffer: Buffer | undefined;
        console.log('Processing image input...');

        try {
            if (typeof image === 'string') {
                if (image.startsWith('http://') || image.startsWith('https://')) {
                    // Download the image from the URL
                    const response = await axios.get(image, { 
                        responseType: 'arraybuffer',
                        timeout: 10000 // 10 second timeout
                    });
                    imageBuffer = Buffer.from(response.data);
                } else if (image.startsWith('data:image')) {
                    // Handle base64 image data
                    const base64Data = image.split(',')[1];
                    imageBuffer = Buffer.from(base64Data, 'base64');
                } else if (image.startsWith('ipfs://')) {
                    // Already an IPFS URL, use as is
                    imageUrl = image;
                } else {
                    imageBuffer = Buffer.from(image);
                }
            } else if (image instanceof File) {
                // Convert File to Buffer
                const arrayBuffer = await image.arrayBuffer();
                imageBuffer = Buffer.from(new Uint8Array(arrayBuffer));
            } else if (Buffer.isBuffer(image)) {
                // If it's already a Buffer
                imageBuffer = image;
            }

            if (imageBuffer) {
                console.log('Processed image input, size:', imageBuffer.length);

                // Validate image buffer
                if (!isValidImageBuffer(imageBuffer)) {
                    throw new Error('Invalid image format. Please provide a valid image file (JPEG, PNG, or GIF)');
                }

                // Upload to Pinata
                imageUrl = await uploadToPinata(imageBuffer);
                console.log('Image uploaded to IPFS:', imageUrl);
            }

            // Convert https URL to ipfs:// protocol if needed
            if (imageUrl.startsWith('https://ipfs.io/ipfs/')) {
                imageUrl = 'ipfs://' + imageUrl.split('/ipfs/')[1];
            }

            if (!imageUrl) {
                throw new Error('Failed to process or upload image');
            }

        } catch (error) {
            console.error('Image processing error:', error);
            throw new Error(`Failed to process image: ${error instanceof Error ? error.message : String(error)}`);
        }

        // Convert royalty percentage to basis points
        const royaltyBps = Math.round(royaltyFee * 100);
        if (!Number.isInteger(royaltyBps) || royaltyBps < 0 || royaltyBps > 10000) {
            throw new Error('Royalty fee must be between 0% and 100%');
        }

        // Create wallet client
        console.log('Creating wallet client...');
        const walletClient = createWalletClient({
            account: privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`),
            chain: {
                id: 10143,
                name: 'Monad Testnet',
                nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
                rpcUrls: { default: { http: ['https://testnet-rpc.monad.xyz'] } },
            },
            transport: http(),
        });

        // Deploy NFT contract
        console.log('Deploying NFT contract...');
        const contract = await deployContract(walletClient, {
            name,
            symbol,
            imageUrl,
            description,
            maxSupply,
            royaltyBps
        });

        console.log('Contract deployed:', contract);

        // Mint the entire collection to the recipient
        console.log('Minting collection...');
        const mintReceipt = await mintCollection(walletClient, contract, recipientAddress, maxSupply);

        console.log('Collection minted successfully');

        return {
            success: true,
            contractAddress: contract.address,
            deploymentHash: contract.transactionHash,
            mintHash: mintReceipt.transactionHash,
            imageUrl,
            name,
            symbol,
            maxSupply,
            recipientAddress
        };

    } catch (error) {
        console.error('Error creating NFT collection:', error);
        throw new Error(`NFT collection creation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

// Helper function to check if buffer is a valid image
function isValidImageBuffer(buffer: Buffer): boolean {
    // Check magic numbers for common image formats
    const signatures = {
        jpeg: [0xFF, 0xD8, 0xFF],
        png: [0x89, 0x50, 0x4E, 0x47],
        gif: [0x47, 0x49, 0x46, 0x38]
    };

    const bytes = buffer.slice(0, 4);
    
    return (
        signatures.jpeg.every((byte, i) => bytes[i] === byte) ||
        signatures.png.every((byte, i) => bytes[i] === byte) ||
        signatures.gif.every((byte, i) => bytes[i] === byte)
    );
}

// Helper function to generate symbol from name
function generateSymbol(name: string): string {
    // Remove special characters and spaces
    const cleanName = name.replace(/[^a-zA-Z0-9]/g, '');
    
    // Take first 5 characters and convert to uppercase
    let symbol = cleanName.slice(0, 5).toUpperCase();
    
    // Pad with 'X' if shorter than 5 characters
    while (symbol.length < 5) {
        symbol += 'X';
    }
    
    return symbol;
}

// Helper function to deploy the contract
async function deployContract(walletClient: any, params: any) {
    try {
        // Create metadata object
        const metadata = {
            name: params.name,
            description: params.description || `Collection of ${params.name} on Monad Network`,
            image: params.imageUrl,
            external_url: "",
            attributes: []
        };

        // Upload metadata to IPFS
        console.log('Uploading metadata to IPFS:', metadata);
        const metadataStr = JSON.stringify(metadata, null, 2);
        const metadataBuffer = Buffer.from(metadataStr);
        const metadataUrl = await uploadToPinata(metadataBuffer);

        // Convert https URL to ipfs:// protocol if needed
        const baseUri = metadataUrl.startsWith('https://ipfs.io/ipfs/') 
            ? 'ipfs://' + metadataUrl.split('/ipfs/')[1]
            : metadataUrl;

        console.log('Deploying contract with params:', {
            name: params.name,
            symbol: params.symbol,
            baseUri,
            maxSupply: params.maxSupply,
            royaltyBps: params.royaltyBps
        });

        // Estimate gas with a try-catch
        let gasEstimate;
        try {
            gasEstimate = await walletClient.estimateContractGas({
                abi: MonadNFT1155.abi,
                bytecode: MonadNFT1155.bytecode as `0x${string}`,
                args: [
                    params.name,
                    params.symbol,
                    baseUri,
                    BigInt(params.maxSupply),
                    BigInt(params.royaltyBps)
                ]
            });
            // Add 20% buffer to gas estimate
            gasEstimate = (gasEstimate * BigInt(120)) / BigInt(100);
        } catch (error) {
            console.error('Gas estimation failed:', error);
            // Fallback gas limit if estimation fails
            gasEstimate = BigInt(5000000);
        }

        console.log('Estimated gas:', gasEstimate.toString());

        // Deploy with proper parameters
        const txHash = await walletClient.deployContract({
            abi: MonadNFT1155.abi,
            bytecode: MonadNFT1155.bytecode as `0x${string}`,
            args: [
                params.name,
                params.symbol,
                baseUri,
                BigInt(params.maxSupply),
                BigInt(params.royaltyBps)
            ],
            gas: gasEstimate
        });

        console.log('Deployment transaction hash:', txHash);

        const publicClient = createPublicClient({
            chain: {
                id: 10143,
                name: 'Monad Testnet',
                nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
                rpcUrls: { default: { http: ['https://testnet-rpc.monad.xyz'] } },
            },
            transport: http(),
        });

        // Wait for receipt with timeout and retry
        let receipt;
        let retries = 3;
        while (retries > 0) {
            try {
                receipt = await publicClient.waitForTransactionReceipt({ 
                    hash: txHash,
                    timeout: 60_000 // 60 second timeout
                });
                break;
            } catch (error) {
                console.error(`Receipt fetch attempt ${4-retries} failed:`, error);
                retries--;
                if (retries === 0) throw error;
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }

        if (!receipt?.contractAddress) {
            throw new Error('Contract deployment failed - no contract address in receipt');
        }

        // Store contract address in Redis for future reference
        await setContractAddress(`nft_collection_${params.name}`, receipt.contractAddress);

        return {
            address: receipt.contractAddress,
            transactionHash: txHash
        };
    } catch (error) {
        console.error('Contract deployment failed:', error);
        throw new Error(`Contract deployment failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

// Helper function to mint the collection
async function mintCollection(walletClient: any, contract: any, recipient: string, amount: number) {
    try {
        console.log('Minting collection:', {
            contractAddress: contract.address,
            recipient,
            amount
        });

        // Create public client for gas estimation
        const publicClient = createPublicClient({
            chain: {
                id: 10143,
                name: 'Monad Testnet',
                nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
                rpcUrls: { default: { http: ['https://testnet-rpc.monad.xyz'] } },
            },
            transport: http(),
        });

        // Estimate gas for mint
        let gasEstimate;
        try {
            gasEstimate = await publicClient.estimateContractGas({
                address: contract.address as `0x${string}`,
                abi: MonadNFT1155.abi,
                functionName: 'mint',
                args: [recipient as `0x${string}`, BigInt(0), BigInt(amount), '0x']
            });
            // Add 20% buffer
            gasEstimate = (gasEstimate * BigInt(120)) / BigInt(100);
        } catch (error) {
            console.error('Mint gas estimation failed:', error);
            gasEstimate = BigInt(300000); // Fallback gas limit
        }

        console.log('Estimated mint gas:', gasEstimate.toString());

        // Execute mint transaction
        const txHash = await walletClient.writeContract({
            address: contract.address as `0x${string}`,
            abi: MonadNFT1155.abi,
            functionName: 'mint',
            args: [recipient as `0x${string}`, BigInt(0), BigInt(amount), '0x'],
            gas: gasEstimate
        });

        console.log('Mint transaction hash:', txHash);

        // Wait for mint receipt
        let receipt;
        let retries = 3;
        while (retries > 0) {
            try {
                receipt = await publicClient.waitForTransactionReceipt({ 
                    hash: txHash,
                    timeout: 60_000 // 60 second timeout
                });
                break;
            } catch (error) {
                console.error(`Mint receipt fetch attempt ${4-retries} failed:`, error);
                retries--;
                if (retries === 0) throw error;
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }

        if (!receipt) {
            throw new Error('Mint transaction failed - no receipt');
        }

        return receipt;
    } catch (error) {
        console.error('Minting failed:', error);
        throw new Error(`Minting failed: ${error instanceof Error ? error.message : String(error)}`);
    }
} 