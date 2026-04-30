import type { WalletAuthMessageParams, WalletSignInParams } from './types';

export const CELO_CHAIN_ID = 42220;
export const CELO_RPC_URL = 'https://forno.celo.org';
export const CELO_EXPLORER_URL = 'https://celoscan.io';

export function buildWalletAuthMessage(params: WalletAuthMessageParams): string {
  const { domain, uri, address, nonce, chainId, issuedAt } = params;
  return [
    'Sign in to Farcaster Celo App',
    `Domain: ${domain}`,
    `URI: ${uri}`,
    `Address: ${address}`,
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
    'Statement: This signature proves wallet ownership.',
  ].join('\n');
}

export async function performWalletSignIn(params: WalletSignInParams): Promise<void> {
  const {
    address,
    chainId,
    targetChainId = CELO_CHAIN_ID,
    domain,
    uri,
    nonceEndpoint,
    verifyEndpoint,
    switchChain,
    signMessage,
  } = params;

  let currentChainId = chainId;
  if (currentChainId !== targetChainId && switchChain) {
    currentChainId = (await switchChain(targetChainId)).id;
  }
  if (currentChainId !== targetChainId) throw new Error('Wrong chain');

  const nonceRes = await fetch(nonceEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address }),
  });
  const nonceData = await nonceRes.json();
  if (!nonceRes.ok || !nonceData?.nonce) throw new Error(nonceData?.error ?? 'Failed nonce');

  const issuedAt = new Date().toISOString();
  const message = buildWalletAuthMessage({
    domain,
    uri,
    address,
    nonce: nonceData.nonce,
    chainId: currentChainId,
    issuedAt,
  });

  const signature = await signMessage(message);

  const verifyRes = await fetch(verifyEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      address,
      nonce: nonceData.nonce,
      chainId: currentChainId,
      message,
      signature,
    }),
  });
  const verifyData = await verifyRes.json();
  if (!verifyRes.ok) throw new Error(verifyData?.error ?? 'Verify failed');
}
