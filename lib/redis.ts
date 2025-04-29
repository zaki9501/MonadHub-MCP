import { createClient } from 'redis';

const client = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

client.on('error', err => console.error('Redis Client Error', err));

export async function setContractAddress(key: string, address: string): Promise<void> {
  if (!client.isOpen) {
    await client.connect();
  }
  await client.set(`contract:${key}`, address);
}