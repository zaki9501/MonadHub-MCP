import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from 'next-connect';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { uploadToPinata } from '@/lib/ipfs';
import { mcpHandler } from '@/app/mcp'; // Import the handler
import { createNFTCollection } from '@/lib/nft-collection';
// import { createNftCollection } from '@/lib/your-nft-logic'; // Replace with your actual logic

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function multerMiddleware(middleware: any) {
  return (req: any, res: any, next: any) => {
    return new Promise<void>((resolve, reject) => {
      middleware(req, res, (err: any) => {
        if (err) return reject(err);
        resolve();
      });
    }).then(next);
  };
}

const apiRoute = createRouter<NextApiRequest, NextApiResponse>();
apiRoute.use(multerMiddleware(upload.single('file')));

apiRoute.post(async (req: any, res: NextApiResponse) => {
  const { name, symbol, description, artType, maxSupply, royaltyFee, recipientAddress } = req.body;
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  const fileType = await fileTypeFromBuffer(file.buffer);
  if (!fileType || !['image/jpeg', 'image/png'].includes(fileType.mime)) {
    return res.status(400).json({ error: 'File must be a JPEG or PNG' });
  }

  const base64 = `data:${fileType.mime};base64,${file.buffer.toString('base64')}`;
  try {
    const cid = await uploadToPinata({ image: base64 });
    const imageUrl = `https://ipfs.io/ipfs/${cid}`;

    // Call the real NFT creation logic
    const result = await createNFTCollection({
      name,
      image: imageUrl,
      maxSupply: Number(maxSupply),
      recipientAddress,
      description,
      royaltyFee: Number(royaltyFee)
    });
    res.status(200).json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default apiRoute.handler();
export const config = { api: { bodyParser: false } }; 