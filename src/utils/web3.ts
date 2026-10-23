import { MONAD_CONFIG } from '../constants/palette';
import { AutoPixelSpriteData } from '../types/chog';

export interface OwnedChogMetadata {
  tokenId: number;
  name: string;
  description: string;
  image: string;
  proxyImageUrl: string;
  attributes: Array<{ trait_type: string; value: string }>;
  pixelData?: AutoPixelSpriteData | null;
}

export interface WalletChogsResponse {
  wallet: string;
  balance: number;
  tokens: OwnedChogMetadata[];
}

declare global {
  interface Window {
    ethereum?: any;
  }
}

/**
 * Check if Web3 wallet is injected in browser
 */
export function hasInjectedWallet(): boolean {
  return typeof window !== 'undefined' && Boolean(window.ethereum);
}

/**
 * Get current connected chain ID from window.ethereum
 */
export async function getInjectedChainId(): Promise<number | null> {
  if (!hasInjectedWallet()) return null;
  try {
    const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
    return parseInt(chainIdHex, 16);
  } catch (e) {
    return null;
  }
}

/**
 * Switch or prompt to add Monad Mainnet (Chain 143)
 */
export async function switchToMonadMainnet(): Promise<boolean> {
  if (!hasInjectedWallet()) {
    alert('Please install MetaMask, Phantom, or a Web3 wallet to connect to Monad.');
    return false;
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: MONAD_CONFIG.chainIdHex }],
    });
    return true;
  } catch (switchError: any) {
    // 4902 indicates that the chain has not been added to the wallet
    if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: MONAD_CONFIG.chainIdHex,
              chainName: MONAD_CONFIG.name,
              rpcUrls: [MONAD_CONFIG.rpcUrl],
              nativeCurrency: {
                name: MONAD_CONFIG.symbol,
                symbol: MONAD_CONFIG.symbol,
                decimals: MONAD_CONFIG.decimals,
              },
              blockExplorerUrls: [MONAD_CONFIG.explorer],
            },
          ],
        });
        return true;
      } catch (addError) {
        console.error('Failed to add Monad Mainnet:', addError);
        return false;
      }
    }
    console.error('Failed to switch to Monad:', switchError);
    return false;
  }
}

/**
 * Request wallet accounts
 */
export async function connectInjectedWallet(): Promise<string | null> {
  if (!hasInjectedWallet()) {
    return null;
  }
  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (accounts && accounts.length > 0) {
      return accounts[0].toLowerCase();
    }
  } catch (err) {
    console.error('User rejected connection:', err);
  }
  return null;
}

/**
 * Request SIWE Signature
 */
export async function requestSiweSignature(address: string): Promise<string | null> {
  if (!hasInjectedWallet()) return null;
  const msg = `Sign in to Chog Town on Monad Mainnet (Chain ID ${MONAD_CONFIG.chainId})\n\nWallet: ${address}\nTimestamp: ${new Date().toISOString()}\n\nWelcome back to Chog Town!`;
  try {
    const signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [msg, address],
    });
    return signature;
  } catch (e) {
    console.warn('Signature rejected or bypassed for demo:', e);
    return null;
  }
}

/**
 * Fetch wallet's verified Chogs and metadata from server API
 */
export async function fetchWalletChogs(address: string): Promise<WalletChogsResponse> {
  const res = await fetch(`/api/wallet/${address}/chogs`);
  if (!res.ok) {
    throw new Error(`Failed to read Chogs from Monad (HTTP ${res.status})`);
  }
  return res.json();
}

/**
 * Fetch Auto-Pixel sprite and portrait data for a specific token
 */
export async function fetchChogSprite(tokenId: number) {
  try {
    const res = await fetch(`/api/chog/${tokenId}/sprite`);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn(`[AutoPixel] Failed to fetch sprite for token #${tokenId}:`, e);
    return null;
  }
}
