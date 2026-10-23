// src/components/town/EntryGate.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  Wallet,
  Zap,
  AlertTriangle,
  ShieldCheck,
  Search,
  Sparkles,
  Sliders,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { sfx } from '../../audio/pixelAudio';
import { MONAD_CONFIG } from '../../constants/palette';
import { TokenRecord, AutoPixelSpriteData } from '../../types/chog';
import { ChogPixelPortrait } from '../common/ChogPixelPortrait';
import {
  hasInjectedWallet,
  getInjectedChainId,
  switchToMonadMainnet,
  connectInjectedWallet,
  requestSiweSignature,
  fetchWalletChogs,
  fetchChogSprite,
  OwnedChogMetadata,
} from '../../utils/web3';

export interface DiscoveredChog extends OwnedChogMetadata {
  pixelData?: AutoPixelSpriteData | null;
}

// Real Monad Mainnet Genesis Chogs pre-cached for instant Judge / Demo Mode
const DEMO_PRESET_CHOGS: DiscoveredChog[] = [
  {
    tokenId: 7,
    name: 'CHOG #1468 (Mystic Chog)',
    description: 'CHOG — a 1969-piece collection on Monad.',
    image: 'ipfs://bafybeihau2egcccbdxymeckmmbrqytbfor5gkt3en6d5fsbueymdbq7g6e/1468.webp',
    proxyImageUrl: '/api/image-proxy?url=https%3A%2F%2Fmagic.decentralized-content.com%2Fipfs%2Fbafybeihau2egcccbdxymeckmmbrqytbfor5gkt3en6d5fsbueymdbq7g6e%2F1468.webp',
    attributes: [
      { trait_type: 'Skin', value: 'Pink' },
      { trait_type: 'Head', value: 'Wizard Hat' },
      { trait_type: 'Eyes', value: 'Teary' },
      { trait_type: 'Mouth', value: 'Rainbow Puke' },
      { trait_type: 'Body', value: 'Red Tuxedo' },
      { trait_type: 'Background', value: 'Rosie' },
    ],
  },
  {
    tokenId: 47,
    name: 'CHOG #1508 (Speedster)',
    description: 'CHOG — a 1969-piece collection on Monad.',
    image: 'ipfs://bafybeihau2egcccbdxymeckmmbrqytbfor5gkt3en6d5fsbueymdbq7g6e/1508.webp',
    proxyImageUrl: '/api/image-proxy?url=https%3A%2F%2Fmagic.decentralized-content.com%2Fipfs%2Fbafybeihau2egcccbdxymeckmmbrqytbfor5gkt3en6d5fsbueymdbq7g6e%2F1508.webp',
    attributes: [
      { trait_type: 'Skin', value: 'Pink' },
      { trait_type: 'Head', value: 'MMGA Cap' },
      { trait_type: 'Body', value: 'Yellow 143 Jersey' },
      { trait_type: 'Eyes', value: 'Anime Glass' },
      { trait_type: 'Accessory', value: 'Fwog' },
      { trait_type: 'Background', value: 'Deep Aqua' },
    ],
  },
  {
    tokenId: 132,
    name: 'CHOG #1593 (Cyber Pilot)',
    description: 'CHOG — a 1969-piece collection on Monad.',
    image: 'ipfs://bafybeihau2egcccbdxymeckmmbrqytbfor5gkt3en6d5fsbueymdbq7g6e/1593.webp',
    proxyImageUrl: '/api/image-proxy?url=https%3A%2F%2Fmagic.decentralized-content.com%2Fipfs%2Fbafybeihau2egcccbdxymeckmmbrqytbfor5gkt3en6d5fsbueymdbq7g6e%2F1593.webp',
    attributes: [
      { trait_type: 'Skin', value: 'Origin' },
      { trait_type: 'Head', value: 'Propeller Beanie' },
      { trait_type: 'Eyes', value: 'Laser Visor' },
      { trait_type: 'Body', value: 'Classic Purple' },
      { trait_type: 'Background', value: 'Monad Dusk' },
    ],
  },
];

interface EntryGateProps {
  authMode: 'holder' | 'demo' | 'spectator';
  setAuthMode: (mode: 'holder' | 'demo' | 'spectator') => void;
  walletStatus: 'idle' | 'connecting' | 'signing' | 'verifying' | 'no_chog' | 'verified';
  setWalletStatus: (status: 'idle' | 'connecting' | 'signing' | 'verifying' | 'no_chog' | 'verified') => void;
  connectedWallet: string | null;
  setConnectedWallet: (wallet: string | null) => void;
  setSiweSigned: (signed: boolean) => void;
  activeTokenId: number;
  setActiveTokenId: (tid: number) => void;
  tokenRecords: Record<number, TokenRecord>;
  onSelectChogToken?: (token: DiscoveredChog) => void;
  onBackOutside: () => void;
  onSpawnInTown: () => void;
}

export const EntryGate: React.FC<EntryGateProps> = ({
  authMode,
  setAuthMode,
  walletStatus,
  setWalletStatus,
  connectedWallet,
  setConnectedWallet,
  setSiweSigned,
  activeTokenId,
  setActiveTokenId,
  tokenRecords,
  onSelectChogToken,
  onBackOutside,
  onSpawnInTown,
}) => {
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);
  const [isWrongNetwork, setIsWrongNetwork] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [loadingProgress, setLoadingProgress] = useState<number>(15);
  const [discoveredTokens, setDiscoveredTokens] = useState<DiscoveredChog[]>([]);
  const [carouselIndex, setCarouselIndex] = useState<number>(0);
  const [customLookupAddress, setCustomLookupAddress] = useState<string>('');
  const [isLookingUpCustom, setIsLookingUpCustom] = useState<boolean>(false);
  
  // UX Polish: Reveal mode & Style filter
  const [revealMode, setRevealMode] = useState<'side_by_side' | 'flip'>('side_by_side');
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [pixelStyle, setPixelStyle] = useState<'crisp' | 'soft' | 'retro'>('crisp');
  const [isRepixelating, setIsRepixelating] = useState<boolean>(false);

  // Check injected chainId
  const checkChain = useCallback(async () => {
    const cid = await getInjectedChainId();
    setCurrentChainId(cid);
    setIsWrongNetwork(cid !== null && cid !== MONAD_CONFIG.chainId);
  }, []);

  useEffect(() => {
    checkChain();
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on?.('chainChanged', () => {
        checkChain();
      });
      window.ethereum.on?.('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          handleConnectWithAddress(accounts[0].toLowerCase());
        } else {
          setConnectedWallet(null);
          setWalletStatus('idle');
          setDiscoveredTokens([]);
        }
      });
    }
  }, [checkChain]);

  // Handle Switch to Monad Mainnet
  const handleSwitchNetwork = async () => {
    sfx.tone(550, 0.08);
    const success = await switchToMonadMainnet();
    if (success) {
      await checkChain();
    }
  };

  // Perform full discovery flow with auto-pixelation
  const handleConnectWithAddress = async (addr: string) => {
    setConnectedWallet(addr);
    setWalletStatus('verifying');
    setLoadingStep('Connecting to Monad Mainnet (Chain 143)...');
    setLoadingProgress(20);

    try {
      await new Promise(r => setTimeout(r, 200));
      setLoadingStep('Scanning ERC-721 contract 0xc96d31... on Monad...');
      setLoadingProgress(45);

      const data = await fetchWalletChogs(addr);

      setLoadingStep('Reading metadata & artwork from IPFS...');
      setLoadingProgress(70);
      await new Promise(r => setTimeout(r, 250));

      if (data.tokens && data.tokens.length > 0) {
        setLoadingStep('Painting authentic pixel sprites to match town...');
        setLoadingProgress(90);

        // Fetch auto-pixel sprite data for tokens
        const tokensWithSprites = await Promise.all(
          data.tokens.map(async t => {
            try {
              const sprite = await fetchChogSprite(t.tokenId);
              return { ...t, pixelData: sprite };
            } catch (e) {
              return t;
            }
          })
        );

        setDiscoveredTokens(tokensWithSprites);
        setCarouselIndex(0);
        setActiveTokenId(tokensWithSprites[0].tokenId);
        setWalletStatus('verified');
        sfx.win();
      } else {
        setDiscoveredTokens([]);
        setWalletStatus('no_chog');
      }
    } catch (err: any) {
      console.warn('Discovery error:', err);
      setWalletStatus('no_chog');
    }
  };

  // Connect real wallet
  const handleHolderConnect = async () => {
    sfx.tone(600, 0.07);
    setAuthMode('holder');
    setWalletStatus('connecting');

    if (!hasInjectedWallet()) {
      alert('No Web3 wallet found. Please install MetaMask, Rabby, or Phantom, or explore with Demo Mode.');
      setWalletStatus('idle');
      return;
    }

    const addr = await connectInjectedWallet();
    if (!addr) {
      setWalletStatus('idle');
      return;
    }

    // Check network
    const cid = await getInjectedChainId();
    if (cid !== MONAD_CONFIG.chainId) {
      setIsWrongNetwork(true);
      const switched = await switchToMonadMainnet();
      if (!switched) {
        setWalletStatus('idle');
        return;
      }
    }

    // Request SIWE Signature
    setWalletStatus('signing');
    const sig = await requestSiweSignature(addr);
    setSiweSigned(Boolean(sig));

    // Discover Chogs on Monad Mainnet
    await handleConnectWithAddress(addr);
  };

  // Demo Mode Handler with instant sprite pre-loading
  const handleDemoMode = async () => {
    sfx.tone(640, 0.07);
    setAuthMode('demo');
    setConnectedWallet('0x84113421a8a564b594ee9ae78c875310332d7023'); // real holder address
    setSiweSigned(true);
    setWalletStatus('verifying');
    setLoadingStep('Loading Demo Chogs and generating pixel sprites...');
    setLoadingProgress(60);

    const withSprites = await Promise.all(
      DEMO_PRESET_CHOGS.map(async t => {
        try {
          const sprite = await fetchChogSprite(t.tokenId);
          return { ...t, pixelData: sprite };
        } catch (e) {
          return t;
        }
      })
    );

    setDiscoveredTokens(withSprites);
    setCarouselIndex(0);
    setActiveTokenId(withSprites[0].tokenId);
    setWalletStatus('verified');
    sfx.win();
  };

  // Custom address lookup for judges
  const handleLookupCustomAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customLookupAddress.trim();
    if (!clean || !clean.startsWith('0x') || clean.length !== 42) {
      alert('Please enter a valid 42-character Monad wallet address (0x...).');
      return;
    }
    setIsLookingUpCustom(true);
    await handleConnectWithAddress(clean);
    setIsLookingUpCustom(false);
  };

  // Re-pixelate action with style feedback
  const handleRepixelate = async (tokenId: number) => {
    setIsRepixelating(true);
    sfx.tone(480, 0.06);
    try {
      const sprite = await fetchChogSprite(tokenId);
      setDiscoveredTokens(prev =>
        prev.map(t => (t.tokenId === tokenId ? { ...t, pixelData: sprite } : t))
      );
      sfx.win();
    } finally {
      setIsRepixelating(false);
    }
  };

  const currentChog = discoveredTokens[carouselIndex] || null;

  // Keyboard navigation for carousel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (walletStatus !== 'verified' || discoveredTokens.length <= 1) return;
      if (e.key === 'ArrowLeft') {
        sfx.tone(500, 0.05);
        setCarouselIndex(prev => (prev - 1 + discoveredTokens.length) % discoveredTokens.length);
      } else if (e.key === 'ArrowRight') {
        sfx.tone(550, 0.05);
        setCarouselIndex(prev => (prev + 1) % discoveredTokens.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [walletStatus, discoveredTokens.length]);

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 bg-[#1A1426]">
      <div className="pixel-box max-w-2xl w-full rounded-xl p-4 sm:p-6 space-y-4">
        
        {/* TOP STATUS & BACK BUTTON */}
        <div className="flex items-center justify-between border-b-2 border-[#14101C] pb-3 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-pixel-body uppercase px-2 py-0.5 rounded bg-[#64E8D8]/15 text-[#64E8D8] border border-[#64E8D8]">
                {MONAD_CONFIG.name} Mainnet • Chain ID {MONAD_CONFIG.chainId}
              </span>
              <span className="text-[11px] font-pixel-body text-[#B9B4C7] hidden sm:inline">
                Contract: 0xc96d31...7363
              </span>
            </div>
            <h1 className="font-pixel-title text-base sm:text-lg text-[#FFDF6D] mt-1 m-0 p-0 font-normal">
              CHOOSE YOUR AUTO-PIXEL CHOG
            </h1>
          </div>
          <button
            onClick={onBackOutside}
            className="px-3 py-1.5 min-h-[44px] rounded bg-[#2C2140] text-[#F6EFE2] font-pixel-body text-base pixel-btn shrink-0"
          >
            ← Back Outside
          </button>
        </div>

        {/* WRONG NETWORK BANNER */}
        {isWrongNetwork && (
          <div className="bg-[#E0467E]/20 border-2 border-[#E0467E] rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#E0467E] shrink-0" />
              <div className="font-pixel-body text-base text-[#F6EFE2]">
                <strong>Wrong Network:</strong> Connected to Chain {currentChainId}. Please switch to Monad Mainnet (Chain 143).
              </div>
            </div>
            <button
              onClick={handleSwitchNetwork}
              className="px-4 py-2 min-h-[44px] rounded bg-[#E0467E] text-white font-pixel-body text-base font-bold pixel-btn shrink-0"
            >
              Switch to Monad
            </button>
          </div>
        )}

        {/* 3 ENTRY MODES SELECTION */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            onClick={handleHolderConnect}
            className={`p-3 min-h-[52px] rounded-lg border-2 text-left transition pixel-btn ${
              authMode === 'holder'
                ? 'bg-[#2C2140] border-[#64E8D8] shadow-[0_0_0_2px_#64E8D8]'
                : 'bg-[#1A1426] border-[#78718A]/50'
            }`}
          >
            <Wallet className="w-5 h-5 text-[#64E8D8] mb-1" />
            <div className="font-pixel-title text-[11px] text-[#F6EFE2]">1. HOLDER SIWE</div>
            <div className="font-pixel-body text-base text-[#B9B4C7] mt-0.5">
              Connect Monad wallet & verify NFTs
            </div>
          </button>

          <button
            onClick={handleDemoMode}
            className={`p-3 min-h-[52px] rounded-lg border-2 text-left transition pixel-btn ${
              authMode === 'demo'
                ? 'bg-[#2C2140] border-[#FFDF6D] shadow-[0_0_0_2px_#FFDF6D]'
                : 'bg-[#1A1426] border-[#78718A]/50'
            }`}
          >
            <Zap className="w-5 h-5 text-[#FFDF6D] mb-1" />
            <div className="font-pixel-title text-[11px] text-[#FFDF6D]">2. 30s DEMO PASS</div>
            <div className="font-pixel-body text-base text-[#B9B4C7] mt-0.5">
              Instant Judge Mode (Real Chogs)
            </div>
          </button>

          <button
            onClick={() => {
              sfx.tone(480, 0.07);
              setAuthMode('spectator');
              setWalletStatus('idle');
              setConnectedWallet(null);
              setSiweSigned(false);
              onSpawnInTown();
            }}
            className={`p-3 min-h-[52px] rounded-lg border-2 text-left transition pixel-btn ${
              authMode === 'spectator'
                ? 'bg-[#2C2140] border-[#E0467E] shadow-[0_0_0_2px_#E0467E]'
                : 'bg-[#1A1426] border-[#78718A]/50'
            }`}
          >
            <Eye className="w-5 h-5 text-[#E0467E] mb-1" />
            <div className="font-pixel-title text-[11px] text-[#E0467E]">3. SPECTATE</div>
            <div className="font-pixel-body text-base text-[#B9B4C7] mt-0.5">
              Watch town & chat wallet-free
            </div>
          </button>
        </div>

        {/* LOADING & DISCOVERY STATE */}
        {walletStatus === 'verifying' && (
          <div className="bg-[#1A1426] border-2 border-[#14101C] rounded-lg p-6 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#64E8D8] animate-spin mx-auto" />
            <div className="font-pixel-title text-sm text-[#FFDF6D]">
              FINDING YOUR CHOGS ON MONAD...
            </div>
            <div className="font-pixel-body text-base text-[#64E8D8] min-h-[24px]">
              {loadingStep}
            </div>
            <div className="w-56 mx-auto h-2 bg-[#2C2140] rounded-full overflow-hidden border border-[#14101C]">
              <div
                className="h-full bg-gradient-to-r from-[#64E8D8] to-[#FFDF6D] transition-all duration-300"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* CHOOSE YOUR CHOG CAROUSEL & REVEAL SHOWCASE */}
        {walletStatus === 'verified' && currentChog && (
          <div className="bg-[#1A1426] border-2 border-[#14101C] rounded-lg p-3 sm:p-4 space-y-3">
            {/* Header with Chog Count & View Toggle */}
            <div className="flex flex-wrap items-center justify-between border-b border-[#2C2140] pb-2 gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#8CE071]" />
                <span className="font-pixel-body text-base text-[#8CE071] font-bold">
                  Verified Monad ERC-721: {discoveredTokens.length} Chog(s) Found
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Mode toggle */}
                <div className="inline-flex rounded-lg bg-[#14101C] p-0.5 border border-[#2C2140]">
                  <button
                    onClick={() => {
                      sfx.tone(480, 0.04);
                      setRevealMode('side_by_side');
                    }}
                    className={`px-2 py-1 text-xs font-pixel-body rounded ${
                      revealMode === 'side_by_side'
                        ? 'bg-[#2C2140] text-[#64E8D8] font-bold'
                        : 'text-[#B9B4C7]'
                    }`}
                  >
                    Side-by-Side
                  </button>
                  <button
                    onClick={() => {
                      sfx.tone(520, 0.04);
                      setRevealMode('flip');
                    }}
                    className={`px-2 py-1 text-xs font-pixel-body rounded ${
                      revealMode === 'flip'
                        ? 'bg-[#2C2140] text-[#FFDF6D] font-bold'
                        : 'text-[#B9B4C7]'
                    }`}
                  >
                    Flip Reveal
                  </button>
                </div>

                {discoveredTokens.length > 1 && (
                  <span className="font-pixel-title text-xs text-[#FFDF6D]">
                    {carouselIndex + 1} / {discoveredTokens.length}
                  </span>
                )}
              </div>
            </div>

            {/* MAIN SHOWCASE: SIDE-BY-SIDE OR FLIP */}
            {revealMode === 'side_by_side' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                {/* ORIGINAL NFT ARTWORK */}
                <div className="flex flex-col items-center p-2.5 rounded-lg bg-[#241B35] border-2 border-[#14101C]">
                  <div className="w-full flex items-center justify-between mb-1.5 px-1">
                    <span className="text-[11px] font-pixel-title text-[#B9B4C7]">ORIGINAL NFT ART</span>
                    <span className="text-[11px] font-pixel-body px-1.5 py-0.2 rounded bg-[#14101C] text-[#FFDF6D]">
                      #{currentChog.tokenId}
                    </span>
                  </div>
                  <div className="relative w-36 sm:w-40 aspect-square rounded-lg overflow-hidden border-2 border-[#14101C] bg-[#14101C]">
                    <img
                      src={currentChog.proxyImageUrl || currentChog.image}
                      alt={`Original NFT artwork for Chog #${currentChog.tokenId}`}
                      className="w-full h-full object-cover"
                      loading="eager"
                    />
                  </div>
                  <span className="text-xs font-pixel-body text-[#B9B4C7] mt-1.5 text-center">
                    Monad Genesis • 1000x1000
                  </span>
                </div>

                {/* AUTO-PIXEL CITIZEN SPRITE */}
                <div className="flex flex-col items-center p-2.5 rounded-lg bg-[#241B35] border-2 border-[#64E8D8]/50 shadow-[0_0_12px_rgba(100,232,216,0.15)]">
                  <div className="w-full flex items-center justify-between mb-1.5 px-1">
                    <span className="text-[11px] font-pixel-title text-[#64E8D8] flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#FFDF6D]" /> AUTO-PIXEL CITIZEN
                    </span>
                    <span className="text-[11px] font-pixel-body px-1.5 py-0.2 rounded bg-[#64E8D8]/20 text-[#64E8D8] font-bold">
                      Town Rig
                    </span>
                  </div>
                  <div className="relative w-36 sm:w-40 aspect-square rounded-lg overflow-hidden border-2 border-[#14101C] bg-[#14101C] flex items-center justify-center">
                    {currentChog.pixelData?.portraitBase64 ? (
                      <img
                        src={currentChog.pixelData.portraitBase64}
                        alt={`Auto-pixel version of Chog #${currentChog.tokenId}`}
                        className="w-full h-full object-contain p-2"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    ) : (
                      <ChogPixelPortrait
                        traits={{
                          body: currentChog.attributes.find(a => a.trait_type === 'Body')?.value || 'Classic Purple',
                          hat: currentChog.attributes.find(a => a.trait_type === 'Head')?.value || 'Crown',
                          eyes: currentChog.attributes.find(a => a.trait_type === 'Eyes')?.value || 'Sparkle',
                        }}
                        size={120}
                        pixelData={currentChog.pixelData}
                      />
                    )}
                  </div>
                  <span className="text-xs font-pixel-body text-[#64E8D8] mt-1.5 text-center font-bold">
                    16-Bit Town Sprite Density
                  </span>
                </div>
              </div>
            ) : (
              /* FLIP REVEAL MODE */
              <div
                onClick={() => {
                  sfx.tone(520, 0.05);
                  setIsFlipped(f => !f);
                }}
                className="cursor-pointer bg-[#241B35] border-2 border-[#FFDF6D] rounded-xl p-4 flex flex-col items-center justify-center min-h-[200px] relative transition-transform hover:scale-[1.01]"
              >
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-[#14101C] text-[#FFDF6D] font-pixel-body text-xs border border-[#FFDF6D]/40">
                  Click to Flip ({isFlipped ? 'Pixel' : 'Original'})
                </div>
                {!isFlipped ? (
                  <div className="text-center space-y-2">
                    <img
                      src={currentChog.proxyImageUrl || currentChog.image}
                      alt={`Original NFT artwork for Chog #${currentChog.tokenId}`}
                      className="w-36 h-36 mx-auto rounded-lg object-cover border-2 border-[#14101C]"
                    />
                    <div className="font-pixel-title text-xs text-[#FFDF6D]">
                      ORIGINAL NFT ARTWORK (#{currentChog.tokenId})
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-2">
                    <div className="w-36 h-36 mx-auto rounded-lg bg-[#14101C] border-2 border-[#64E8D8] flex items-center justify-center p-2">
                      {currentChog.pixelData?.portraitBase64 ? (
                        <img
                          src={currentChog.pixelData.portraitBase64}
                          alt={`Auto-pixel version of Chog #${currentChog.tokenId}`}
                          className="w-full h-full object-contain"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      ) : (
                        <ChogPixelPortrait
                          traits={{
                            body: currentChog.attributes.find(a => a.trait_type === 'Body')?.value || 'Classic Purple',
                            hat: currentChog.attributes.find(a => a.trait_type === 'Head')?.value || 'Crown',
                            eyes: currentChog.attributes.find(a => a.trait_type === 'Eyes')?.value || 'Sparkle',
                          }}
                          size={120}
                          pixelData={currentChog.pixelData}
                        />
                      )}
                    </div>
                    <div className="font-pixel-title text-xs text-[#64E8D8]">
                      CONVERTED TOWN PIXEL SPRITE (#{currentChog.tokenId})
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TRAITS & STYLE CONTROLS */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-pixel-title text-sm text-[#FFDF6D]">
                    {currentChog.name}
                  </h3>
                  <div className="font-pixel-body text-xs text-[#B9B4C7]">
                    Owner: {connectedWallet ? `${connectedWallet.slice(0, 6)}...${connectedWallet.slice(-4)}` : 'Demo Holder'}
                  </div>
                </div>

                {/* Re-Pixelate Button */}
                <button
                  onClick={() => handleRepixelate(currentChog.tokenId)}
                  disabled={isRepixelating}
                  className="px-2.5 py-1 min-h-[44px] rounded bg-[#2C2140] text-[#64E8D8] border border-[#64E8D8]/40 font-pixel-body text-xs pixel-btn flex items-center gap-1.5"
                  title="Re-generate pixel sprite"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRepixelating ? 'animate-spin' : ''}`} />
                  <span>{isRepixelating ? 'Painting...' : 'Re-Pixelate'}</span>
                </button>
              </div>

              {/* ON-CHAIN ATTRIBUTES PILLS */}
              <div className="bg-[#14101C] rounded p-2 space-y-1">
                <span className="font-pixel-title text-[10px] text-[#B9B4C7] uppercase block">
                  On-Chain NFT Attributes:
                </span>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                  {currentChog.attributes.map((attr, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-[#2C2140] border border-[#78718A]/40 font-pixel-body text-xs text-[#F6EFE2]"
                    >
                      <strong className="text-[#64E8D8]">{attr.trait_type}:</strong> {attr.value}
                    </span>
                  ))}
                </div>
              </div>

              {/* CAROUSEL CONTROLS */}
              {discoveredTokens.length > 1 && (
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    onClick={() => {
                      sfx.tone(500, 0.05);
                      const next = (carouselIndex - 1 + discoveredTokens.length) % discoveredTokens.length;
                      setCarouselIndex(next);
                      setActiveTokenId(discoveredTokens[next].tokenId);
                    }}
                    className="px-3.5 py-2 min-h-[44px] rounded bg-[#2C2140] text-white font-pixel-body text-base pixel-btn flex items-center gap-1.5"
                    aria-label="Previous Chog"
                  >
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </button>
                  <span className="font-pixel-body text-sm text-[#B9B4C7]">
                    {carouselIndex + 1} of {discoveredTokens.length} Chogs (Use ← / → keys)
                  </span>
                  <button
                    onClick={() => {
                      sfx.tone(550, 0.05);
                      const next = (carouselIndex + 1) % discoveredTokens.length;
                      setCarouselIndex(next);
                      setActiveTokenId(discoveredTokens[next].tokenId);
                    }}
                    className="px-3.5 py-2 min-h-[44px] rounded bg-[#2C2140] text-white font-pixel-body text-base pixel-btn flex items-center gap-1.5"
                    aria-label="Next Chog"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* PLAY AS THIS CHOG BUTTON */}
            <button
              onClick={() => {
                sfx.win();
                if (onSelectChogToken) {
                  onSelectChogToken(currentChog);
                } else {
                  setActiveTokenId(currentChog.tokenId);
                  onSpawnInTown();
                }
              }}
              className="w-full py-3.5 min-h-[48px] rounded-lg bg-[#FFDF6D] text-[#14101C] font-pixel-title text-xs sm:text-sm pixel-btn flex items-center justify-center gap-2 mt-2 shadow-[0_4px_0_#A07C10]"
            >
              <Sparkles className="w-4 h-4 text-[#14101C]" />
              <span>PLAY AS CHOG #{currentChog.tokenId} →</span>
            </button>
          </div>
        )}

        {/* EMPTY STATE: NO CHOG FOUND */}
        {walletStatus === 'no_chog' && (
          <div className="bg-[#1A1426] border-2 border-[#E0467E] rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-[#E0467E]">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div className="font-pixel-title text-xs">
                NO CHOG NFT FOUND IN THIS WALLET
              </div>
            </div>
            <p className="font-pixel-body text-base text-[#F6EFE2] leading-snug">
              Wallet <code className="text-[#64E8D8] font-bold">{connectedWallet}</code> holds 0 Chog Genesis NFTs on Monad Mainnet.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={handleDemoMode}
                className="px-3.5 py-2 min-h-[44px] rounded bg-[#FFDF6D] text-[#14101C] font-pixel-body text-base font-bold pixel-btn"
              >
                Try Demo Pass (3 Real Chogs)
              </button>
              <button
                onClick={() => {
                  setAuthMode('spectator');
                  onSpawnInTown();
                }}
                className="px-3.5 py-2 min-h-[44px] rounded bg-[#2C2140] text-[#64E8D8] font-pixel-body text-base pixel-btn"
              >
                Spectate Town Without NFT
              </button>
            </div>
          </div>
        )}

        {/* JUDGE LIVE TESTER BAR */}
        <div className="pt-2 border-t border-[#2C2140]">
          <form onSubmit={handleLookupCustomAddress} className="space-y-1.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-pixel-body text-[#B9B4C7] gap-1">
              <label htmlFor="judge-address-input">
                Judge Live Tester — Query ANY Monad Mainnet Wallet:
              </label>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setCustomLookupAddress('0x84113421a8a564b594ee9ae78c875310332d7023');
                    handleConnectWithAddress('0x84113421a8a564b594ee9ae78c875310332d7023');
                  }}
                  className="text-xs underline text-[#64E8D8] hover:text-[#FFDF6D]"
                >
                  Holder 1 (47 Chogs)
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => {
                    setCustomLookupAddress('0xb496b250afb266110296747c94e99dde94075ee0');
                    handleConnectWithAddress('0xb496b250afb266110296747c94e99dde94075ee0');
                  }}
                  className="text-xs underline text-[#64E8D8] hover:text-[#FFDF6D]"
                >
                  Holder 2 (28 Chogs)
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                id="judge-address-input"
                name="judgeAddress"
                aria-label="Monad wallet address to query"
                type="text"
                placeholder="0x... (42-character Monad address)"
                value={customLookupAddress}
                onChange={e => setCustomLookupAddress(e.target.value)}
                className="flex-1 px-3 py-1.5 min-h-[44px] bg-[#14101C] border border-[#78718A]/50 rounded-lg text-[#F6EFE2] font-mono text-xs placeholder:text-[#78718A]"
              />
              <button
                type="submit"
                disabled={isLookingUpCustom}
                className="px-3 py-1.5 min-h-[44px] bg-[#2C2140] text-[#FFDF6D] rounded-lg font-pixel-body text-base pixel-btn shrink-0 flex items-center gap-1"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{isLookingUpCustom ? 'Scanning...' : 'Test Address'}</span>
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};
