import { createPublicClient, getAddress, http, isAddress, parseAbi } from 'viem';
import { bsc } from 'viem/chains';

export const SPACE_ID_AGENT_ID_REGISTRY = '0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F';

const agentIdRegistryAbi = parseAbi([
  'function handleOf(address owner) view returns (string)'
]);

export async function verifyAgentIdOwner(
  walletAddress: string,
  rpcUrl: string,
  registryAddress: string
): Promise<{ eligible: boolean; handle: string }> {
  if (!rpcUrl) {
    throw new Error('BSC_RPC_URL is not configured');
  }
  if (!isAddress(registryAddress) ||
      getAddress(registryAddress).toLowerCase() !== SPACE_ID_AGENT_ID_REGISTRY.toLowerCase()) {
    throw new Error('SPACE_ID_AGENT_ID_REGISTRY does not match the verified BNB deployment');
  }

  const client = createPublicClient({
    chain: bsc,
    transport: http(rpcUrl, { timeout: 10_000 })
  });

  const chainId = await client.getChainId();
  if (chainId !== 56) {
    throw new Error(`Agent ID verification RPC must be BNB Mainnet (chain ID 56), received ${chainId}`);
  }

  const handle = await client.readContract({
    address: SPACE_ID_AGENT_ID_REGISTRY,
    abi: agentIdRegistryAbi,
    functionName: 'handleOf',
    args: [getAddress(walletAddress.toLowerCase())]
  });

  return { eligible: handle.length > 0, handle };
}
