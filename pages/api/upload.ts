// If you don't have next-connect, install it with: npm install next-connect
import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from 'next-connect';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { uploadToPinata } from '@/lib/ipfs';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Multer wrapper for Next.js API routes
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
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  const fileType = await fileTypeFromBuffer(file.buffer);
  if (!fileType || !['image/jpeg', 'image/png'].includes(fileType.mime)) {
    return res.status(400).json({ error: 'File must be a JPEG or PNG' });
  }

  const base64 = `data:${fileType.mime};base64,${file.buffer.toString('base64')}`;
  try {
    const cid = await uploadToPinata({ image: base64 });
    res.status(200).json({ cid, url: `https://ipfs.io/ipfs/${cid}` });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default apiRoute.handler({
  onError(error: any, req: NextApiRequest, res: NextApiResponse) {
    res.status(501).json({ error: `Sorry something Happened! ${error.message}` });
  },
  onNoMatch(req: NextApiRequest, res: NextApiResponse) {
    res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
  },
});

export const config = {
  api: {
    bodyParser: false, // Disallow body parsing, consume as stream
  },
}; 