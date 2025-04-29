// lib/ipfs.js
import axios from "axios";
import FormData from "form-data";

export async function uploadToPinata(data) {
  // If data is a Buffer, upload as a file
  if (Buffer.isBuffer(data)) {
    const formData = new FormData();
    formData.append("file", data, {
      filename: "nft-image.png", // You can make this dynamic if needed
      contentType: "image/png"
    });
    try {
      const response = await axios.post(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        formData,
        {
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          headers: {
            ...formData.getHeaders(),
            pinata_api_key: process.env.PINATA_API_KEY,
            pinata_secret_api_key: process.env.PINATA_API_SECRET
          }
        }
      );
      // Return a public gateway URL
      return `https://ipfs.io/ipfs/${response.data.IpfsHash}`;
    } catch (error) {
      throw new Error(`Failed to upload file to Pinata: ${error.message}`);
    }
  }
  // Otherwise, treat as JSON metadata
  try {
    const response = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      data,
      {
        headers: {
          pinata_api_key: process.env.PINATA_API_KEY,
          pinata_secret_api_key: process.env.PINATA_API_SECRET,
          "Content-Type": "application/json"
        }
      }
    );
    return `ipfs://${response.data.IpfsHash}`;
  } catch (error) {
    throw new Error(`Failed to upload to Pinata: ${error.message}`);
  }
}