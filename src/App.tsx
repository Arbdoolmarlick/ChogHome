import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Users, Trophy, MessageSquare, Gamepad2, ShoppingBag, Terminal, X, Compass, RefreshCw,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Hand, Heart, Smile, Coffee, Music, Moon, Sparkles, Trees, Landmark
} from 'lucide-react';
import { sfx } from './audio/pixelAudio';
import { PALETTE_24 } from './constants/palette';
import { INITIAL_TOKEN_RECORDS, computeTokenTitle } from './constants/records';
import { TOWN_ZONES, RESIDENT_CACHED_BATCH_LINES } from './constants/zones';
import { drawPixelChogSprite } from './graphics/spriteRenderer';
import { drawDistinctZoneBuilding } from './graphics/landmarkRenderer';
import {
  Active1v1Game, ChatMessage, Entity, ToastItem, TokenRecord
} from './types/chog';
import { ChogPixelPortrait } from './components/common/ChogPixelPortrait';
import { LandingPage } from './components/landing/LandingPage';
import { ChogFourModal } from './components/games/ChogFourModal';
import { ChogDuelModal } from './components/games/ChogDuelModal';
import { ChogShowdownModal } from './components/games/ChogShowdownModal';
import { SoloArcadeModal } from './components/games/SoloArcadeModal';
import { ProfileDrawer } from './components/drawers/ProfileDrawer';
import { ChatDrawer } from './components/drawers/ChatDrawer';
import { ArcadeDrawer } from './components/drawers/ArcadeDrawer';
import { MarketDrawer } from './components/drawers/MarketDrawer';
import { TownHallDrawer } from './components/drawers/TownHallDrawer';
import { CodeDrawer } from './components/drawers/CodeDrawer';
import { TownHeader } from './components/town/TownHeader';
import { EntryGate } from './components/town/EntryGate';
import { ToastStack } from './components/town/ToastStack';
import { OwnedChogMetadata, fetchChogSprite } from './utils/web3';

export default function App() {
  // Scene Flow: 'landing' -> 'entry' -> 'town'
  const [scene, setScene] = useState<'landing' | 'entry' | 'town'>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('scene');
      if (p === 'town' || p === 'entry' || p === 'landing') return p;
    }
    return 'landing';
  });
  const [irisTransition, setIrisTransition] = useState<boolean>(false);

  // Auth / Mode State
  const [authMode, setAuthMode] = useState<'holder' | 'demo' | 'spectator'>('demo');
  const [walletStatus, setWalletStatus] = useState<'idle' | 'connecting' | 'signing' | 'verifying' | 'no_chog' | 'verified'>('verified');
  const [connectedWallet, setConnectedWallet] = useState<string | null>('0x71C...9A21');
  const [, setSiweSigned] = useState<boolean>(true);
  const [activeTokenId, setActiveTokenId] = useState<number>(404);

  // Token-Bound Database State
  const [tokenRecords, setTokenRecords] = useState<Record<number, TokenRecord>>(INITIAL_TOKEN_RECORDS);
  const [inspectedTokenId, setInspectedTokenId] = useState<number>(1337);

  // Drawer / Tab State
  const [activeDrawerTab, setActiveDrawerTab] = useState<string>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      return 'town';
    }
    return 'profile';
  });
  const [tutorialStep, setTutorialStep] = useState<number>(1);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // 60FPS Mutable Refs (Zero React allocation in animation loop)
  const entitiesRef = useRef<Entity[]>([
    { tokenId: 404, x: 400, y: 295, targetX: 400, targetY: 295, facing: 1, anim: 0, pose: 'idle', squash: 1, emote: null, emoteTimer: 0, bubble: 'Spawned in Central Plaza!', bubbleTimer: 160 },
    { tokenId: 1337, x: 640, y: 185, targetX: 640, targetY: 185, facing: -1, anim: 1, pose: 'dance', squash: 1, emote: '🕹️', emoteTimer: 120, bubble: 'Queue up at the Arcade desk!', bubbleTimer: 200 },
    { tokenId: 88, x: 400, y: 435, targetX: 400, targetY: 435, facing: 1, anim: 2, pose: 'idle', squash: 1, emote: null, emoteTimer: 0, bubble: 'Checking floor listings at Market!', bubbleTimer: 180 },
    { tokenId: 420, x: 155, y: 430, targetX: 155, targetY: 430, facing: 1, anim: 0, pose: 'sleep', squash: 1, emote: '💤', emoteTimer: 150, bubble: null, bubbleTimer: 0 },
    { tokenId: 909, x: 455, y: 295, targetX: 455, targetY: 295, facing: -1, anim: 3, pose: 'idle', squash: 1, emote: '⚡', emoteTimer: 140, bubble: 'Who wants a 1v1 Chog Duel?', bubbleTimer: 190 },
    { tokenId: 555, x: 150, y: 180, targetX: 150, targetY: 180, facing: 1, anim: 1, pose: 'sit', squash: 1, emote: '❤️', emoteTimer: 140, bubble: 'Espresso time at Chog Cafe!', bubbleTimer: 170 },
    { tokenId: 2048, x: 650, y: 430, targetX: 650, targetY: 430, facing: -1, anim: 2, pose: 'wave', squash: 1, emote: null, emoteTimer: 0, bubble: 'Try the Town Hall Transfer Demo!', bubbleTimer: 190 },
  ]);

  const worldFxRef = useRef({
    tapRipple: null as { x: number; y: number; age: number } | null,
    dust: [] as { x: number; y: number; vx: number; vy: number; life: number }[],
    butterflies: Array.from({ length: 7 }, (_, i) => ({
      x: 110 + i * 95,
      y: 140 + (i * 67) % 280,
      phase: i * 1.1,
      color: i % 2 === 0 ? PALETTE_24.amberGlow : PALETTE_24.waterFoam,
    })),
    birds: [
      { x: -40, y: 75, vx: 1.1 },
      { x: -75, y: 92, vx: 1.15 },
    ],
  });

  // Clock, Weather & Audio
  const [townMinutes, setTownMinutes] = useState<number>(18 * 60 + 15);
  const [rainEnabled, setRainEnabled] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [qualityTier, setQualityTier] = useState<'high' | 'medium' | 'low'>('high');

  // Chat
  const [chatChannel, setChatChannel] = useState<'public' | 'dm'>('public');
  const [chatInput, setChatInput] = useState<string>('');
  const [lastChatTime, setLastChatTime] = useState<number>(0);
  const [mutedTokens] = useState<number[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const [typingResident, setTypingResident] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'm1', tokenId: 1337, speaker: 'Glitch (#1337)', text: 'Welcome to Chog Town! Walk up to the Pixel Arcade for 1v1 Chog Four or Chog Duel!', time: '18:12', channel: 'public' },
    { id: 'm2', tokenId: 2048, speaker: 'Mayor Byte (#2048)', text: 'Every win, badge, and friend is tied to your Token ID—test the Transfer Demo in Town Hall!', time: '18:14', channel: 'public' },
  ]);

  // Games
  const [active1v1Game, setActive1v1Game] = useState<Active1v1Game | null>(null);
  const [activeSoloGame, setActiveSoloGame] = useState<'stacker' | 'snake' | 'memory' | null>(null);
  const [queueSeconds, setQueueSeconds] = useState<number | null>(null);
  const [confettiParticles, setConfettiParticles] = useState<{ id: string; left: string; color: string }[]>([]);
  const [transferProofBanner, setTransferProofBanner] = useState<{
    tokenId: number;
    name: string;
    from: string;
    to: string;
    wins: number;
    points: number;
    title: string;
    badgesCount: number;
  } | null>(null);

  const townCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const myToken = tokenRecords[activeTokenId] || tokenRecords[404] || INITIAL_TOKEN_RECORDS[404];
  const inspectedToken = tokenRecords[inspectedTokenId] || tokenRecords[1337] || INITIAL_TOKEN_RECORDS[1337];

  const addToast = useCallback((toast: Omit<ToastItem, 'id' | 'ttl'>) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev.slice(-2), { id, ttl: 12, ...toast }]);
  }, []);

  const triggerVictoryConfetti = useCallback(() => {
    const colors = [PALETTE_24.amberGlow, PALETTE_24.waterFoam, PALETTE_24.blushRose, PALETTE_24.grassLight];
    setConfettiParticles(
      Array.from({ length: 28 }, (_, idx) => ({
        id: `c-${Date.now()}-${idx}`,
        left: `${Math.round(Math.random() * 96)}%`,
        color: colors[idx % colors.length],
      }))
    );
    setTimeout(() => setConfettiParticles([]), 2200);
  }, []);

  const triggerIrisTransition = useCallback((nextScene: 'landing' | 'entry' | 'town') => {
    setIrisTransition(true);
    setTimeout(() => {
      setScene(nextScene);
      if (typeof window !== 'undefined') {
        const u = new URL(window.location.href);
        if (nextScene === 'landing') {
          u.searchParams.delete('scene');
        } else {
          u.searchParams.set('scene', nextScene);
        }
        window.history.replaceState({}, '', u.toString());
      }
      setTimeout(() => setIrisTransition(false), 360);
    }, 360);
  }, []);

  const handleSendChat = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'spectator') return;
    const raw = chatInput.trim();
    if (!raw) return;

    const now = Date.now();
    if (now - lastChatTime < 1500) {
      addToast({
        type: 'info',
        title: '⏳ Hold your horses!',
        subtitle: 'Chat rate limit is 1 message per 1.5 seconds.',
      });
      return;
    }

    const clean = raw.replace(/badword|spam/gi, '***');
    setLastChatTime(now);
    setChatInput('');
    sfx.emotePop();

    const me = entitiesRef.current.find(ent => ent.tokenId === activeTokenId);
    if (me) {
      me.bubble = clean;
      me.bubbleTimer = 220;
    }

    setMessages(prev => [
      {
        id: `msg-${now}`,
        tokenId: activeTokenId,
        speaker: `${myToken.shortName} (#${activeTokenId})`,
        text: clean,
        time: 'Just now',
        channel: chatChannel,
      },
      ...prev.slice(0, 39),
    ]);
  }, [authMode, chatInput, lastChatTime, activeTokenId, myToken.shortName, chatChannel, addToast]);

  const handle1v1Complete = useCallback((outcome: 'win' | 'loss' | 'draw', gameLabel: string) => {
    const ptsDelta = outcome === 'win' ? 20 : outcome === 'loss' ? 5 : 10;
    if (outcome === 'win') triggerVictoryConfetti();

    setTokenRecords(prev => {
      const curr = prev[activeTokenId];
      if (!curr) return prev;
      const nextWins = curr.wins + (outcome === 'win' ? 1 : 0);
      const nextLosses = curr.losses + (outcome === 'loss' ? 1 : 0);
      const nextPoints = curr.points + ptsDelta;
      const newBadge =
        outcome === 'win' && !curr.badges.includes(`${gameLabel} Victor`)
          ? [...curr.badges, `${gameLabel} Victor`]
          : curr.badges;

      return {
        ...prev,
        [activeTokenId]: {
          ...curr,
          wins: nextWins,
          losses: nextLosses,
          points: nextPoints,
          badges: newBadge,
        },
      };
    });

    addToast({
      type: 'info',
      title: outcome === 'win' ? `Victory: Won ${gameLabel}! (+20 Pts)` : `Finished ${gameLabel} (+${ptsDelta} Pts)`,
      subtitle: `Recorded permanently on Chog Token #${activeTokenId}.`,
    });
  }, [activeTokenId, triggerVictoryConfetti, addToast]);

  const handleSaveSoloScore = useCallback((cabinetId: 'stacker' | 'snake' | 'memory', scoreVal: number) => {
    const bonusPts = Math.min(25, Math.max(5, Math.floor(scoreVal / 120)));
    setTokenRecords(prev => {
      const curr = prev[activeTokenId];
      if (!curr) return prev;
      const prevBest = curr.scores?.[cabinetId] || 0;
      const best = Math.max(prevBest, scoreVal);
      return {
        ...prev,
        [activeTokenId]: {
          ...curr,
          points: curr.points + bonusPts,
          scores: { ...curr.scores, [cabinetId]: best },
        },
      };
    });
    addToast({
      type: 'info',
      title: `Saved ${cabinetId.toUpperCase()} Score: ${scoreVal}`,
      subtitle: `+${bonusPts} Arcade Points added to Token #${activeTokenId}!`,
    });
  }, [activeTokenId, addToast]);

  const handleSimulateTokenTransfer = useCallback((newOwnerWallet: string) => {
    sfx.win();
    triggerVictoryConfetti();
    const currentRecord = tokenRecords[activeTokenId] || INITIAL_TOKEN_RECORDS[404];
    const previousOwner = currentRecord.owner;

    setTokenRecords(prev => ({
      ...prev,
      [activeTokenId]: {
        ...(prev[activeTokenId] || currentRecord),
        owner: newOwnerWallet,
      },
    }));
    setConnectedWallet(newOwnerWallet);
    setInspectedTokenId(activeTokenId);

    setTransferProofBanner({
      tokenId: activeTokenId,
      name: currentRecord.name,
      from: previousOwner,
      to: newOwnerWallet,
      wins: currentRecord.wins,
      points: currentRecord.points,
      title: computeTokenTitle(currentRecord.wins, currentRecord.points),
      badgesCount: currentRecord.badges.length,
    });
  }, [tokenRecords, activeTokenId, triggerVictoryConfetti]);

  const handleSelectChogToken = useCallback((token: OwnedChogMetadata) => {
    setActiveTokenId(token.tokenId);
    setInspectedTokenId(token.tokenId);

    // Map raw attributes to ChogTraits
    const bodyAttr = token.attributes?.find(a => a.trait_type === 'Body' || a.trait_type === 'Skin')?.value || 'Origin';
    const hatAttr = token.attributes?.find(a => a.trait_type === 'Head')?.value || 'None';
    const eyesAttr = token.attributes?.find(a => a.trait_type === 'Eyes')?.value || 'Classic';

    setTokenRecords(prev => {
      const existing = prev[token.tokenId];
      return {
        ...prev,
        [token.tokenId]: {
          tokenId: token.tokenId,
          name: token.name,
          shortName: token.name.replace('CHOG #', 'Chog #'),
          owner: connectedWallet || '0xHolder...143',
          isResident: false,
          traits: {
            body: bodyAttr,
            hat: hatAttr,
            eyes: eyesAttr,
          },
          wins: existing?.wins || 0,
          losses: existing?.losses || 0,
          points: existing?.points || 0,
          friends: existing?.friends || [1337, 88, 555],
          badges: existing?.badges || ['Monad Genesis Holder'],
          scores: existing?.scores || { stacker: 0, snake: 0, memory: 0 },
          imageUrl: token.image,
          proxyImageUrl: token.proxyImageUrl,
          rawAttributes: token.attributes,
          pixelData: token.pixelData || existing?.pixelData,
        },
      };
    });

    if (!token.pixelData) {
      fetchChogSprite(token.tokenId).then(pData => {
        if (pData) {
          setTokenRecords(prev => {
            const cur = prev[token.tokenId];
            if (!cur) return prev;
            return {
              ...prev,
              [token.tokenId]: {
                ...cur,
                pixelData: pData,
              },
            };
          });
        }
      });
    }

    // Update player sprite in plaza
    const me = entitiesRef.current.find(e => e.tokenId === 404 || e.tokenId === activeTokenId);
    if (me) {
      me.tokenId = token.tokenId;
      me.bubble = "I'm home!";
      me.bubbleTimer = 240;
      me.emote = '👋';
      me.emoteTimer = 180;
      me.squash = 1.35;
    }
    sfx.win();
    triggerVictoryConfetti();
    triggerIrisTransition('town');
  }, [connectedWallet, activeTokenId, triggerIrisTransition, triggerVictoryConfetti]);

  // Auto-fetch pixel sprite for active token if not yet loaded
  useEffect(() => {
    if (activeTokenId && !tokenRecords[activeTokenId]?.pixelData) {
      let isMounted = true;
      fetchChogSprite(activeTokenId).then(pData => {
        if (isMounted && pData) {
          setTokenRecords(prev => {
            const current = prev[activeTokenId];
            if (!current || current.pixelData) return prev;
            return {
              ...prev,
              [activeTokenId]: {
                ...current,
                pixelData: pData,
              },
            };
          });
        }
      });
      return () => { isMounted = false; };
    }
  }, [activeTokenId]);

  // Auto-fetch pixel sprite for inspected token if not yet loaded
  useEffect(() => {
    if (inspectedTokenId && !tokenRecords[inspectedTokenId]?.pixelData) {
      let isMounted = true;
      fetchChogSprite(inspectedTokenId).then(pData => {
        if (isMounted && pData) {
          setTokenRecords(prev => {
            const current = prev[inspectedTokenId];
            if (!current || current.pixelData) return prev;
            return {
              ...prev,
              [inspectedTokenId]: {
                ...current,
                pixelData: pData,
              },
            };
          });
        }
      });
      return () => { isMounted = false; };
    }
  }, [inspectedTokenId]);

  // Duck audio when chat is open
  useEffect(() => {
    sfx.ducking = activeDrawerTab === 'chat';
  }, [activeDrawerTab]);

  // Town Clock & Toast Timers
  useEffect(() => {
    const clockTimer = setInterval(() => {
      setTownMinutes(m => (m + 1) % (24 * 60));
      setToasts(prev =>
        prev
          .map(t => ({ ...t, ttl: t.ttl - 1 }))
          .filter(t => t.ttl > 0)
      );
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // AI Resident Behaviors
  useEffect(() => {
    if (scene !== 'town') return;
    const aiInterval = setInterval(() => {
      const list = entitiesRef.current;
      for (let i = 0; i < list.length; i++) {
        const ent = list[i];
        if (ent.tokenId === activeTokenId) continue;

        if (Math.random() < 0.3) {
          const zone = TOWN_ZONES[Math.floor(Math.random() * TOWN_ZONES.length)];
          ent.targetX = zone.doorX + (Math.random() - 0.5) * 75;
          ent.targetY = zone.doorY + 12 + (Math.random() - 0.5) * 32;
          const poses: ('idle' | 'sit' | 'wave' | 'dance' | 'laugh')[] = ['idle', 'sit', 'wave', 'dance', 'laugh'];
          ent.pose = poses[Math.floor(Math.random() * poses.length)];
        }
        if (ent.bubbleTimer <= 0 && Math.random() < 0.24) {
          const pool = RESIDENT_CACHED_BATCH_LINES[ent.tokenId] || ['Cozy evening in Chog Town!'];
          const line = pool[Math.floor(Math.random() * pool.length)];
          ent.bubble = line;
          ent.bubbleTimer = 210;

          const rec = tokenRecords[ent.tokenId];
          if (rec && Math.random() < 0.45) {
            setTypingResident(rec.shortName);
            setTimeout(() => {
              setTypingResident(null);
              setMessages(prev => [
                {
                  id: `ai-${Date.now()}-${ent.tokenId}`,
                  tokenId: ent.tokenId,
                  speaker: `${rec.shortName} (#${ent.tokenId})`,
                  text: line,
                  time: 'Just now',
                  channel: 'public',
                },
                ...prev.slice(0, 29),
              ]);
              if (activeDrawerTab !== 'chat') {
                setUnreadChatCount(c => c + 1);
              }
            }, 900);
          }
        }
      }

      if (Math.random() < 0.12 && !active1v1Game && !activeSoloGame) {
        const challengers = [1337, 88, 909];
        const cid = challengers[Math.floor(Math.random() * challengers.length)];
        const crec = tokenRecords[cid];
        if (crec) {
          addToast({
            type: 'challenge',
            title: `${crec.shortName} (#${cid}) challenged you!`,
            subtitle: '1v1 Chog Four • +20 Token Points on win',
            opponentId: cid,
            gameType: 'four',
          });
        }
      }
    }, 2600);
    return () => clearInterval(aiInterval);
  }, [scene, activeTokenId, tokenRecords, activeDrawerTab, active1v1Game, activeSoloGame, addToast]);

  // Arcade Matchmaking Queue
  useEffect(() => {
    if (queueSeconds === null) return;
    if (queueSeconds <= 0) {
      setQueueSeconds(null);
      setActive1v1Game({ type: 'four', opponentId: 1337 });
      return;
    }
    const t = setTimeout(() => setQueueSeconds(s => (s !== null ? s - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [queueSeconds]);

  // Movement
  const movePlayerByDelta = useCallback((dx: number, dy: number) => {
    if (authMode === 'spectator') return;
    const me = entitiesRef.current.find(e => e.tokenId === activeTokenId);
    if (!me) return;
    me.targetX = Math.max(48, Math.min(752, me.x + dx));
    me.targetY = Math.max(135, Math.min(478, me.y + dy));
    me.pose = 'idle';
    worldFxRef.current.tapRipple = { x: me.targetX, y: me.targetY, age: 0 };
    if (tutorialStep === 1) setTutorialStep(2);
  }, [activeTokenId, authMode, tutorialStep]);

  useEffect(() => {
    if (scene !== 'town') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
      const step = 42;
      if (e.key === 'ArrowUp' || e.key === 'w') movePlayerByDelta(0, -step);
      if (e.key === 'ArrowDown' || e.key === 's') movePlayerByDelta(0, step);
      if (e.key === 'ArrowLeft' || e.key === 'a') movePlayerByDelta(-step, 0);
      if (e.key === 'ArrowRight' || e.key === 'd') movePlayerByDelta(step, 0);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [scene, movePlayerByDelta]);

  // Town Canvas 60FPS Game Loop
  useEffect(() => {
    if (scene !== 'town') return;
    let raf: number;
    let tick = 0;

    const renderTown = () => {
      tick++;
      const canvas = townCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;

      const hr = (townMinutes / 60) % 24;
      const isNight = hr >= 19.5 || hr < 5.5;
      const isGoldenHour = (hr >= 17 && hr < 19.5) || (hr >= 5.5 && hr < 7.5);
      const lightsOn = isNight || isGoldenHour;

      // 1. Meadow Grass
      ctx.fillStyle = PALETTE_24.grassShadow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let gx = 0; gx < canvas.width; gx += 32) {
        for (let gy = 0; gy < canvas.height; gy += 32) {
          const hash = (gx * 19 + gy * 37) % 7;
          ctx.fillStyle = hash < 4 ? '#234B33' : '#1E3F2B';
          ctx.fillRect(gx, gy, 32, 32);
          if (hash === 1 || hash === 5) {
            ctx.fillStyle = PALETTE_24.grassBase;
            ctx.fillRect(gx + 6, gy + 8, 8, 3);
            ctx.fillRect(gx + 10, gy + 5, 4, 3);
          }
          if (hash === 2 && (gx < 110 || gx > 690 || gy < 115)) {
            ctx.fillStyle = (gx + gy) % 3 === 0 ? PALETTE_24.amberGlow : PALETTE_24.blushRose;
            ctx.fillRect(gx + 14, gy + 14, 4, 4);
            ctx.fillStyle = PALETTE_24.creamLight;
            ctx.fillRect(gx + 15, gy + 15, 2, 2);
          }
        }
      }

      // 2. Cobblestones
      const drawCobbleRoad = (rx: number, ry: number, rw: number, rh: number) => {
        ctx.fillStyle = PALETTE_24.inkBlack;
        ctx.fillRect(rx - 2, ry - 2, rw + 4, rh + 4);
        ctx.fillStyle = '#4B425A';
        ctx.fillRect(rx, ry, rw, rh);
        ctx.fillStyle = PALETTE_24.stoneLight;
        ctx.fillRect(rx, ry, rw, 3);
        ctx.fillStyle = '#352D42';
        for (let cx = rx + 8; cx < rx + rw - 8; cx += 18) {
          for (let cy = ry + 6; cy < ry + rh - 4; cy += 10) {
            ctx.fillRect(cx + ((cy / 10) % 2) * 6, cy, 10, 4);
          }
        }
      };

      drawCobbleRoad(115, 168, 570, 32);
      drawCobbleRoad(115, 420, 570, 32);
      drawCobbleRoad(130, 168, 32, 284);
      drawCobbleRoad(384, 168, 32, 284);
      drawCobbleRoad(640, 168, 32, 284);

      // 3. Whispering Pond
      ctx.fillStyle = PALETTE_24.inkBlack;
      ctx.fillRect(216, 384, 108, 66);
      ctx.fillStyle = '#C2B280';
      ctx.fillRect(218, 386, 104, 62);
      ctx.fillStyle = PALETTE_24.waterDeep;
      ctx.fillRect(222, 390, 96, 54);
      ctx.fillStyle = PALETTE_24.waterBase;
      ctx.fillRect(226, 394, 88, 46);

      const shimmer = (tick % 48) * 0.35;
      ctx.fillStyle = PALETTE_24.waterFoam;
      ctx.fillRect(236 + shimmer, 408, 16, 3);
      ctx.fillRect(276 - shimmer, 424, 18, 3);
      ctx.fillStyle = PALETTE_24.grassLight;
      ctx.fillRect(242, 422, 10, 8);
      ctx.fillStyle = PALETTE_24.blushRose;
      ctx.fillRect(245, 420, 4, 4);

      ctx.fillStyle = PALETTE_24.woodShadow;
      ctx.fillRect(252, 382, 36, 14);
      ctx.fillStyle = PALETTE_24.woodBase;
      for (let px = 254; px < 286; px += 6) {
        ctx.fillRect(px, 384, 4, 10);
      }

      // 4. Target Path & Ripple
      const myEnt = entitiesRef.current.find(e => e.tokenId === activeTokenId);
      if (myEnt && Math.hypot(myEnt.targetX - myEnt.x, myEnt.targetY - myEnt.y) > 6) {
        ctx.save();
        ctx.strokeStyle = PALETTE_24.amberGlow;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(myEnt.x, myEnt.y);
        ctx.lineTo(myEnt.targetX, myEnt.targetY);
        ctx.stroke();
        ctx.restore();
      }
      if (worldFxRef.current.tapRipple) {
        const rp = worldFxRef.current.tapRipple;
        rp.age += 1;
        const r = rp.age * 1.4;
        ctx.strokeStyle = `rgba(255, 223, 109, ${Math.max(0, 1 - rp.age / 22)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(rp.x, rp.y, r, r * 0.55, 0, 0, Math.PI * 2);
        ctx.stroke();
        if (rp.age >= 22) worldFxRef.current.tapRipple = null;
      }

      // 5. Buildings
      TOWN_ZONES.forEach(z => {
        drawDistinctZoneBuilding(ctx, z, tick, isNight, lightsOn);
      });

      // Rooftop Pixel Cat
      const catX = 185;
      const catY = 32;
      ctx.fillStyle = PALETTE_24.inkBlack;
      ctx.fillRect(catX, catY, 10, 8);
      ctx.fillRect(catX + 8 + Math.round(Math.sin(tick * 0.08) * 2), catY - 4, 3, 6);
      ctx.fillStyle = PALETTE_24.amberGlow;
      ctx.fillRect(catX + 2, catY + 2, 2, 2);

      // 6. Update Entities
      const list = entitiesRef.current;
      for (let i = 0; i < list.length; i++) {
        const ent = list[i];
        const dx = ent.targetX - ent.x;
        const dy = ent.targetY - ent.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 1.8) {
          const speed = ent.tokenId === activeTokenId ? 2.65 : 1.95;
          ent.x += (dx / dist) * speed;
          ent.y += (dy / dist) * speed;
          ent.facing = dx >= 0 ? 1 : -1;
          ent.anim += 0.24;
          ent.moving = true;

          if (tick % 9 === 0) {
            worldFxRef.current.dust.push({
              x: ent.x - ent.facing * 8,
              y: ent.y + 2,
              vx: -ent.facing * 0.4,
              vy: -0.3,
              life: 14,
            });
            if (ent.tokenId === activeTokenId && tick % 18 === 0) sfx.step('stone');
          }
        } else {
          if (ent.moving) {
            ent.squash = 1.22;
            ent.moving = false;
          }
          ent.anim += 0.12;
        }
        ent.squash += (1 - (ent.squash || 1)) * 0.22;
        if (ent.emoteTimer > 0) ent.emoteTimer--;
        else ent.emote = null;
        if (ent.bubbleTimer > 0) ent.bubbleTimer--;
        else ent.bubble = null;
      }

      worldFxRef.current.dust = worldFxRef.current.dust.filter(d => d.life > 0);
      worldFxRef.current.dust.forEach(d => {
        d.x += d.vx;
        d.y += d.vy;
        d.life--;
        ctx.fillStyle = `rgba(246, 239, 226, ${d.life / 16})`;
        ctx.fillRect(Math.round(d.x), Math.round(d.y), 4, 4);
      });

      // 7. Y-Sorted Chogs
      const sorted = [...list].sort((a, b) => a.y - b.y);
      sorted.forEach(ent => {
        const rec = tokenRecords[ent.tokenId] || INITIAL_TOKEN_RECORDS[404];
        const isMe = ent.tokenId === activeTokenId;
        const isInspected = ent.tokenId === inspectedTokenId;

        if (isMe || isInspected) {
          ctx.strokeStyle = isMe ? PALETTE_24.waterFoam : PALETTE_24.amberGlow;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.ellipse(ent.x, ent.y + 3, 19, 8, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        drawPixelChogSprite(ctx, {
          x: ent.x,
          y: ent.y,
          traits: rec.traits,
          pixelData: rec.pixelData,
          facing: ent.facing,
          animFrame: ent.anim,
          isMoving: ent.moving,
          pose: ent.moving ? 'idle' : ent.pose || 'idle',
          squash: ent.squash || 1,
          isBlinking: (tick + ent.tokenId * 13) % 130 < 6,
          scale: 1,
        });

        const label = `${isMe ? '★ ' : ''}#${rec.tokenId} ${rec.shortName}`;
        ctx.font = 'bold 10px monospace';
        const lw = ctx.measureText(label).width + 10;
        ctx.fillStyle = 'rgba(20, 16, 28, 0.85)';
        ctx.fillRect(ent.x - lw / 2, ent.y + 7, lw, 13);
        ctx.fillStyle = isMe ? PALETTE_24.waterFoam : rec.isResident ? PALETTE_24.amberGlow : PALETTE_24.creamLight;
        ctx.textAlign = 'center';
        ctx.fillText(label, ent.x, ent.y + 17);

        if (ent.emote) {
          const popScale = ent.emoteTimer > 145 ? 1.3 : 1;
          ctx.save();
          ctx.translate(ent.x + 22, ent.y - 38 - Math.sin(tick * 0.15) * 3);
          ctx.scale(popScale, popScale);
          ctx.font = '15px monospace';
          ctx.fillText(ent.emote, 0, 0);
          ctx.restore();
        }

        if (ent.bubble && !mutedTokens.includes(ent.tokenId)) {
          const text = ent.bubble.length > 40 ? ent.bubble.slice(0, 40) + '...' : ent.bubble;
          ctx.font = '11px monospace';
          const tw = Math.min(230, ctx.measureText(text).width + 14);
          const bx = Math.max(115, Math.min(canvas.width - 115, ent.x));
          const by = ent.y - 54;
          ctx.fillStyle = PALETTE_24.inkBlack;
          ctx.fillRect(bx - tw / 2 - 2, by - 17, tw + 4, 22);
          ctx.fillStyle = PALETTE_24.uiSurface;
          ctx.fillRect(bx - tw / 2, by - 15, tw, 18);
          ctx.fillStyle = isMe ? PALETTE_24.waterFoam : PALETTE_24.amberGlow;
          ctx.fillRect(bx - tw / 2, by - 15, tw, 2);
          ctx.fillStyle = PALETTE_24.creamLight;
          ctx.fillText(text, bx, by - 2);
        }
      });

      // 8. Canopy Overlap
      const sway = Math.round(Math.sin(tick * 0.04) * 2);
      [[52, 88], [275, 92], [525, 92], [748, 88], [52, 290], [748, 290], [52, 472], [748, 472]].forEach(([tx, ty], i) => {
        ctx.fillStyle = PALETTE_24.inkBlack;
        ctx.fillRect(tx - 6, ty - 2, 12, 16);
        ctx.fillStyle = PALETTE_24.woodBase;
        ctx.fillRect(tx - 4, ty, 8, 13);
        ctx.fillStyle = PALETTE_24.inkBlack;
        ctx.fillRect(tx - 20 + sway, ty - 26, 40, 26);
        ctx.fillStyle = i % 2 === 0 ? PALETTE_24.grassBase : '#38A3A5';
        ctx.fillRect(tx - 18 + sway, ty - 24, 36, 22);
        ctx.fillStyle = PALETTE_24.grassLight;
        ctx.fillRect(tx - 14 + sway, ty - 24, 20, 7);
      });

      // Butterflies & Birds
      if (qualityTier !== 'low') {
        worldFxRef.current.butterflies.slice(0, qualityTier === 'high' ? 7 : 3).forEach(bf => {
          const bx = bf.x + Math.sin(tick * 0.03 + bf.phase) * 18;
          const by = bf.y + Math.cos(tick * 0.04 + bf.phase) * 12;
          ctx.fillStyle = lightsOn ? PALETTE_24.amberGlow : bf.color;
          const wing = tick % 10 < 5 ? 4 : 2;
          ctx.fillRect(Math.round(bx), Math.round(by), wing, 3);
        });
      }

      if (qualityTier === 'high') {
        worldFxRef.current.birds.forEach(b => {
          b.x = (b.x + b.vx) % (canvas.width + 80);
          const wingY = Math.sin(tick * 0.25) * 3;
          ctx.fillStyle = PALETTE_24.inkBlack;
          ctx.fillRect(Math.round(b.x), Math.round(b.y + wingY), 6, 2);
          ctx.fillRect(Math.round(b.x + 5), Math.round(b.y - wingY), 6, 2);
        });
      }

      // Street Lamps
      [[265, 168], [535, 168], [265, 420], [535, 420], [330, 285], [470, 285]].forEach(([lx, ly]) => {
        ctx.fillStyle = PALETTE_24.inkBlack;
        ctx.fillRect(lx - 3, ly - 24, 6, 24);
        ctx.fillStyle = lightsOn ? PALETTE_24.amberGlow : PALETTE_24.stoneLight;
        ctx.fillRect(lx - 6, ly - 28, 12, 6);
        if (lightsOn) {
          const grad = ctx.createRadialGradient(lx, ly - 25, 2, lx, ly - 25, 34);
          grad.addColorStop(0, 'rgba(255, 223, 109, 0.5)');
          grad.addColorStop(1, 'rgba(255, 223, 109, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(lx, ly - 25, 34, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Rain
      if (rainEnabled) {
        ctx.fillStyle = 'rgba(100, 232, 216, 0.45)';
        for (let r = 0; r < 36; r++) {
          const rx = (r * 73 + tick * 4) % canvas.width;
          const ry = (r * 41 + tick * 9) % canvas.height;
          ctx.fillRect(rx, ry, 2, 9);
        }
      }

      // 5-Phase Color Grading
      if (isNight) {
        ctx.fillStyle = 'rgba(18, 11, 34, 0.34)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (isGoldenHour) {
        ctx.fillStyle = 'rgba(244, 162, 54, 0.14)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      raf = requestAnimationFrame(renderTown);
    };

    raf = requestAnimationFrame(renderTown);
    return () => cancelAnimationFrame(raf);
  }, [scene, activeTokenId, inspectedTokenId, townMinutes, tokenRecords, mutedTokens, rainEnabled, qualityTier]);

  const handleTownCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = townCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const clickY = (e.clientY - rect.top) * (canvas.height / rect.height);

    const tappedChog = entitiesRef.current.find(ent => Math.hypot(ent.x - clickX, ent.y - 16 - clickY) < 28);
    if (tappedChog) {
      sfx.tone(600, 0.05);
      setInspectedTokenId(tappedChog.tokenId);
      setActiveDrawerTab('profile');
      if (tutorialStep === 2) setTutorialStep(3);
      return;
    }

    const tappedZone = TOWN_ZONES.find(
      z => Math.abs(clickX - z.x) < z.w / 2 + 12 && Math.abs(clickY - (z.y - z.h / 2)) < z.h / 2 + 20
    );
    if (tappedZone) {
      sfx.tone(520, 0.05);
      if (tappedZone.id === 'arcade') {
        setActiveDrawerTab('arcade');
        if (tutorialStep === 3) setTutorialStep(0);
      } else if (tappedZone.id === 'market') {
        setActiveDrawerTab('market');
      } else if (tappedZone.id === 'townhall' || tappedZone.id === 'plaza') {
        setActiveDrawerTab('townhall');
      } else if (tappedZone.id === 'cafe') {
        setActiveDrawerTab('chat');
        setUnreadChatCount(0);
      }
    }

    if (authMode !== 'spectator') {
      if (tutorialStep === 1) setTutorialStep(2);
      const tx = Math.max(50, Math.min(750, clickX));
      const ty = Math.max(140, Math.min(475, clickY));
      worldFxRef.current.tapRipple = { x: tx, y: ty, age: 0 };
      const me = entitiesRef.current.find(ent => ent.tokenId === activeTokenId);
      if (me) {
        me.targetX = tx;
        me.targetY = ty;
        me.pose = 'idle';
      }
    }
  };

  const triggerEmoteAndPose = (emoteIcon: string, poseName: 'idle' | 'sit' | 'wave' | 'dance' | 'laugh' | 'sleep' = 'idle') => {
    if (authMode === 'spectator') return;
    sfx.emotePop();
    const me = entitiesRef.current.find(ent => ent.tokenId === activeTokenId);
    if (me) {
      me.emote = emoteIcon;
      me.emoteTimer = 165;
      me.pose = poseName;
    }
  };

  const handleShareProfileCardPng = () => {
    sfx.win();
    const c = document.createElement('canvas');
    c.width = 420;
    c.height = 250;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = PALETTE_24.nightAbyss;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = PALETTE_24.amberGlow;
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, c.width - 16, c.height - 16);

    drawPixelChogSprite(ctx, {
      x: 88,
      y: 165,
      traits: inspectedToken.traits,
      pixelData: inspectedToken.pixelData,
      facing: 1,
      scale: 2.1,
    });

    ctx.fillStyle = PALETTE_24.amberGlow;
    ctx.font = 'bold 14px monospace';
    ctx.fillText(inspectedToken.name, 165, 58);
    ctx.fillStyle = PALETTE_24.waterFoam;
    ctx.font = '13px monospace';
    ctx.fillText(`Title: ${computeTokenTitle(inspectedToken.wins, inspectedToken.points)}`, 165, 86);
    ctx.fillStyle = PALETTE_24.creamLight;
    ctx.font = '13px monospace';
    ctx.fillText(`Record: ${inspectedToken.wins}W - ${inspectedToken.losses}L (${inspectedToken.points} pts)`, 165, 114);
    ctx.fillText(`Traits: ${inspectedToken.traits.body} • ${inspectedToken.traits.hat}`, 165, 142);
    ctx.fillStyle = PALETTE_24.stoneLight;
    ctx.fillText(`Owner: ${inspectedToken.owner} • Chog Town Monad`, 165, 195);

    const link = document.createElement('a');
    link.download = `chog-card-${inspectedToken.tokenId}.png`;
    link.href = c.toDataURL('image/png');
    link.click();
    addToast({
      type: 'info',
      title: `Saved Chog #${inspectedToken.tokenId} Collectible Card!`,
      subtitle: 'Downloaded crisp pixel PNG to your device.',
    });
  };

  return (
    <div className="min-h-screen bg-[#1A1426] text-[#F6EFE2] flex flex-col relative selection:bg-[#FFDF6D] selection:text-[#14101C]">
      {/* IRIS TRANSITION OVERLAY */}
      {irisTransition && (
        <div className="fixed inset-0 z-50 bg-[#14101C] flex items-center justify-center">
          <div className="text-center space-y-3 animate-pulse flex flex-col items-center">
            <ChogPixelPortrait traits={myToken.traits} size={72} showBadge={myToken.tokenId} />
            <div className="font-pixel-title text-xs sm:text-sm text-[#FFDF6D]">STEPPING INSIDE CHOGHOME...</div>
          </div>
        </div>
      )}

      {/* CONFETTI BURST */}
      {confettiParticles.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {confettiParticles.map(p => (
            <div
              key={p.id}
              className="w-3 h-3 absolute top-0 animate-bounce"
              style={{ left: p.left, backgroundColor: p.color, animationDuration: '0.9s' }}
            />
          ))}
        </div>
      )}

      {/* SCENE 1: LANDING PAGE */}
      {scene === 'landing' && (
        <LandingPage
          activeTraits={myToken.traits}
          activePixelData={myToken.pixelData}
          soundEnabled={soundEnabled}
          onToggleSound={() => {
            const next = !soundEnabled;
            setSoundEnabled(next);
            sfx.enabled = next;
            if (next) sfx.tone(620, 0.07);
          }}
          onEnterChogHome={() => triggerIrisTransition('entry')}
          onSpectateTown={() => {
            setAuthMode('spectator');
            setConnectedWallet(null);
            setSiweSigned(false);
            triggerIrisTransition('town');
          }}
        />
      )}

      {/* SCENE 2: ENTRY GATE */}
      {scene === 'entry' && (
        <EntryGate
          authMode={authMode}
          setAuthMode={setAuthMode}
          walletStatus={walletStatus}
          setWalletStatus={setWalletStatus}
          connectedWallet={connectedWallet}
          setConnectedWallet={setConnectedWallet}
          setSiweSigned={setSiweSigned}
          activeTokenId={activeTokenId}
          setActiveTokenId={setActiveTokenId}
          tokenRecords={tokenRecords}
          onSelectChogToken={handleSelectChogToken}
          onBackOutside={() => triggerIrisTransition('landing')}
          onSpawnInTown={() => triggerIrisTransition('town')}
        />
      )}

      {/* SCENE 3: REALTIME TOWN */}
      {scene === 'town' && (
        <div className="h-screen max-h-screen overflow-hidden flex flex-col bg-[#1A1426]">
          <TownHeader
            myToken={myToken}
            activeTokenId={activeTokenId}
            authMode={authMode}
            connectedWallet={connectedWallet}
            townMinutes={townMinutes}
            setTownMinutes={setTownMinutes}
            rainEnabled={rainEnabled}
            setRainEnabled={setRainEnabled}
            qualityTier={qualityTier}
            setQualityTier={setQualityTier}
            soundEnabled={soundEnabled}
            onToggleSound={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              sfx.enabled = next;
              if (next) sfx.tone(620, 0.07);
            }}
            onReturnLanding={() => triggerIrisTransition('landing')}
            onSwitchChog={() => triggerIrisTransition('entry')}
          />

          <ToastStack
            toasts={toasts}
            onAcceptChallenge={(gameType, opponentId) => {
              setActive1v1Game({ type: gameType, opponentId });
            }}
            onDismissToast={id => setToasts(prev => prev.filter(t => t.id !== id))}
          />

          {/* TRANSFER PROOF BANNER */}
          {transferProofBanner && (
            <div className="bg-[#2C2140] border-b-2 border-[#8CE071] px-3 py-1.5 shrink-0">
              <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-2 font-pixel-body text-sm sm:text-base">
                <div className="truncate">
                  <strong className="text-[#FFDF6D]">TOKEN MEMORY VERIFIED:</strong>{' '}
                  {transferProofBanner.name} transferred →{' '}
                  <code className="text-[#64E8D8] font-bold">{transferProofBanner.to}</code> ({transferProofBanner.wins}W, “{transferProofBanner.title}”)
                </div>
                <button onClick={() => setTransferProofBanner(null)} className="text-[#B9B4C7] hover:text-white shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* 3-STEP COACH BANNER (Compact & 1-line) */}
          {tutorialStep > 0 && (
            <div className="bg-[#2C2140] border-b-2 border-[#FFDF6D] px-3 py-1 shrink-0">
              <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-2 font-pixel-body text-xs sm:text-sm">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="px-1.5 py-0.2 rounded bg-[#FFDF6D] text-[#14101C] font-bold text-[11px] shrink-0">
                    COACH {tutorialStep}/3
                  </span>
                  <span className="text-[#F6EFE2] truncate">
                    {tutorialStep === 1 && 'Tap cobblestone roads (or use WASD / D-Pad) to stroll.'}
                    {tutorialStep === 2 && 'Tap any Chog on map to flip their Collectible Card & challenge them.'}
                    {tutorialStep === 3 && 'Tap the neon Pixel Arcade building (top-right) to play games!'}
                  </span>
                </div>
                <button
                  onClick={() => setTutorialStep(0)}
                  className="text-xs font-pixel-body underline text-[#FFDF6D] hover:text-white shrink-0"
                >
                  Skip
                </button>
              </div>
            </div>
          )}

          {/* MAIN WORKSPACE: Fits viewport perfectly without window scroll */}
          <main className="max-w-[1600px] w-full mx-auto flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 p-2 sm:p-3 overflow-hidden">
            {/* LEFT 7-8 COLUMNS: TOWN GAME WORLD */}
            <section className={`lg:col-span-7 xl:col-span-8 flex flex-col h-full min-h-0 gap-2 ${activeDrawerTab === 'town' ? 'flex' : 'hidden lg:flex'}`}>
              <div className="pixel-box rounded-xl overflow-hidden relative flex-1 min-h-0 flex flex-col justify-between bg-[#14101C]">
                {queueSeconds !== null && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-[#14101C]/95 border-2 border-[#64E8D8] px-4 py-1.5 rounded-full font-pixel-body text-sm text-[#64E8D8] flex items-center gap-2 shadow-lg">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>1v1 Arcade Queue: {queueSeconds}s</span>
                  </div>
                )}

                {/* CANVAS STAGE (Dynamic Fit with Aspect Ratio) */}
                <div className="flex-1 min-h-0 relative flex items-center justify-center p-1 sm:p-2 bg-[#14101C]">
                  <canvas
                    ref={townCanvasRef}
                    width={800}
                    height={500}
                    onClick={handleTownCanvasClick}
                    aria-label="Top-down interactive Chog Town map with 6 distinct zones and live citizens."
                    className="max-h-full max-w-full aspect-[8/5] w-auto h-auto object-contain block cursor-pointer select-none rounded-lg"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>

                {/* QUICK ZONE TELEPORT STRIP */}
                <div className="bg-[#1A1426] border-t-2 border-[#14101C] px-2 py-1.5 flex items-center gap-1.5 overflow-x-auto shrink-0">
                  <span className="font-pixel-title text-[11px] text-[#FFDF6D] shrink-0 mr-1 hidden sm:inline">
                    ZONES:
                  </span>
                  {TOWN_ZONES.map(z => {
                    const ZoneIcon =
                      z.id === 'cafe' ? Coffee :
                      z.id === 'plaza' ? Sparkles :
                      z.id === 'arcade' ? Gamepad2 :
                      z.id === 'park' ? Trees :
                      z.id === 'market' ? ShoppingBag : Landmark;
                    return (
                      <button
                        key={z.id}
                        onClick={() => {
                          const me = entitiesRef.current.find(ent => ent.tokenId === activeTokenId);
                          if (me) {
                            me.targetX = z.doorX;
                            me.targetY = z.doorY;
                            me.pose = 'idle';
                            worldFxRef.current.tapRipple = { x: z.doorX, y: z.doorY, age: 0 };
                          }
                        }}
                        className="px-2 py-1 min-h-[34px] rounded-lg bg-[#241B35] hover:bg-[#2C2140] border border-[#78718A]/50 font-pixel-body text-xs sm:text-sm text-[#F6EFE2] shrink-0 pixel-btn whitespace-nowrap flex items-center gap-1.5"
                      >
                        <ZoneIcon className="w-3.5 h-3.5 text-[#64E8D8]" />
                        <span>{z.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* DESKTOP EMOTE BAR (Visible on lg+) */}
                <div className="hidden lg:flex bg-[#1A1426] border-t border-[#14101C] px-2.5 py-1.5 items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-pixel-title text-[11px] text-[#B9B4C7] mr-1">EMOTES:</span>
                    {(
                      [
                        { label: 'Heart', emote: '❤️', icon: Heart, color: 'text-[#FFA3C2]', pose: 'idle' },
                        { label: 'Laugh', emote: '😂', icon: Smile, color: 'text-[#FFDF6D]', pose: 'laugh' },
                        { label: 'Wave',  emote: '👋', icon: Hand,  color: 'text-[#64E8D8]', pose: 'wave' },
                        { label: 'Dance', emote: '🕺', icon: Music, color: 'text-[#836EF9]', pose: 'dance' },
                        { label: 'Sit',   emote: '☕', icon: Coffee, color: 'text-[#FFA3C2]', pose: 'sit' },
                        { label: 'Zzz',   emote: '💤', icon: Moon,  color: 'text-[#7A88C9]', pose: 'sleep' },
                      ] as const
                    ).map(em => {
                      const Icon = em.icon;
                      return (
                        <button
                          key={em.label}
                          onClick={() => triggerEmoteAndPose(em.emote, em.pose)}
                          disabled={authMode === 'spectator'}
                          className="px-2.5 py-1 min-h-[34px] rounded-lg bg-[#2C2140] text-[#F6EFE2] text-xs font-pixel-body flex items-center gap-1 pixel-btn disabled:opacity-40"
                        >
                          <Icon className={`w-3.5 h-3.5 ${em.color}`} />
                          <span>{em.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="text-xs font-pixel-body text-[#B9B4C7]">
                    WASD / Click Roads to Walk
                  </div>
                </div>

                {/* MOBILE HANDHELD CONTROLLER DECK (Visible on mobile when in Town tab) */}
                <div className="lg:hidden bg-[#1A1426] border-t-2 border-[#14101C] p-2 flex items-center justify-between gap-3 shrink-0">
                  {/* 4-WAY D-PAD */}
                  {authMode !== 'spectator' ? (
                    <div className="grid grid-cols-3 gap-1 w-28 h-28 shrink-0 bg-[#14101C] p-1.5 rounded-xl border border-[#78718A]/50">
                      <div />
                      <button
                        onClick={() => movePlayerByDelta(0, -42)}
                        className="rounded-lg bg-[#2C2140] text-[#FFDF6D] flex items-center justify-center font-bold text-sm active:bg-[#FFDF6D] active:text-[#14101C] min-h-[32px]"
                        aria-label="Walk North"
                      >
                        <ArrowUp className="w-4 h-4 text-[#FFDF6D]" />
                      </button>
                      <div />
                      <button
                        onClick={() => movePlayerByDelta(-42, 0)}
                        className="rounded-lg bg-[#2C2140] text-[#FFDF6D] flex items-center justify-center font-bold text-sm active:bg-[#FFDF6D] active:text-[#14101C] min-h-[32px]"
                        aria-label="Walk West"
                      >
                        <ArrowLeft className="w-4 h-4 text-[#FFDF6D]" />
                      </button>
                      <button
                        onClick={() => triggerEmoteAndPose('👋', 'wave')}
                        className="rounded-lg bg-[#6C2BD9] text-white flex items-center justify-center text-xs active:scale-95"
                        aria-label="Wave Emote"
                      >
                        <Hand className="w-4 h-4 text-white" />
                      </button>
                      <button
                        onClick={() => movePlayerByDelta(42, 0)}
                        className="rounded-lg bg-[#2C2140] text-[#FFDF6D] flex items-center justify-center font-bold text-sm active:bg-[#FFDF6D] active:text-[#14101C] min-h-[32px]"
                        aria-label="Walk East"
                      >
                        <ArrowRight className="w-4 h-4 text-[#FFDF6D]" />
                      </button>
                      <div />
                      <button
                        onClick={() => movePlayerByDelta(0, 42)}
                        className="rounded-lg bg-[#2C2140] text-[#FFDF6D] flex items-center justify-center font-bold text-sm active:bg-[#FFDF6D] active:text-[#14101C] min-h-[32px]"
                        aria-label="Walk South"
                      >
                        <ArrowDown className="w-4 h-4 text-[#FFDF6D]" />
                      </button>
                      <div />
                    </div>
                  ) : (
                    <div className="p-2 text-xs font-pixel-body text-[#B9B4C7]">
                      Spectating Town
                    </div>
                  )}

                  {/* ACTION & EMOTE BUTTONS */}
                  <div className="flex-1 flex flex-col gap-1.5">
                    <div className="grid grid-cols-3 gap-1">
                      {(
                        [
                          { label: 'Love',  emote: '❤️', icon: Heart, color: 'text-[#FFA3C2]', pose: 'idle' },
                          { label: 'Laugh', emote: '😂', icon: Smile, color: 'text-[#FFDF6D]', pose: 'laugh' },
                          { label: 'Sit',   emote: '☕', icon: Coffee, color: 'text-[#FFA3C2]', pose: 'sit' },
                        ] as const
                      ).map(em => {
                        const Icon = em.icon;
                        return (
                          <button
                            key={em.label}
                            onClick={() => triggerEmoteAndPose(em.emote, em.pose)}
                            disabled={authMode === 'spectator'}
                            className="py-1 min-h-[34px] rounded bg-[#2C2140] text-[#F6EFE2] text-xs font-pixel-body flex items-center justify-center gap-1 pixel-btn disabled:opacity-40"
                            title={em.label}
                          >
                            <Icon className={`w-3.5 h-3.5 ${em.color}`} />
                            <span className="text-[11px]">{em.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {(
                        [
                          { label: 'Dance', emote: '🕺', icon: Music, color: 'text-[#836EF9]', pose: 'dance' },
                          { label: 'Zzz',   emote: '💤', icon: Moon,  color: 'text-[#7A88C9]', pose: 'sleep' },
                        ] as const
                      ).map(em => {
                        const Icon = em.icon;
                        return (
                          <button
                            key={em.label}
                            onClick={() => triggerEmoteAndPose(em.emote, em.pose)}
                            disabled={authMode === 'spectator'}
                            className="py-1 min-h-[34px] rounded bg-[#2C2140] text-[#F6EFE2] text-xs font-pixel-body flex items-center justify-center gap-1 pixel-btn disabled:opacity-40"
                            title={em.label}
                          >
                            <Icon className={`w-3.5 h-3.5 ${em.color}`} />
                            <span className="text-[11px]">{em.label}</span>
                          </button>
                        );
                      })}
                      <button
                        onClick={() => {
                          const me = entitiesRef.current.find(ent => ent.tokenId === activeTokenId);
                          if (me) {
                            me.bubble = 'GM from the Plaza!';
                            me.bubbleTimer = 160;
                          }
                        }}
                        disabled={authMode === 'spectator'}
                        className="py-1 min-h-[34px] rounded bg-[#FFDF6D] text-[#14101C] font-bold text-xs font-pixel-body flex items-center justify-center gap-1 pixel-btn disabled:opacity-40"
                      >
                        <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                        <span>GM</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* RIGHT 4-5 COLUMNS: SIDEBAR WORKSTATION & DRAWERS */}
            <aside className={`lg:col-span-5 xl:col-span-4 flex flex-col h-full min-h-0 gap-2 ${activeDrawerTab === 'town' ? 'hidden lg:flex' : 'flex'}`}>
              {/* TAB BAR (Pinned at top on Desktop) */}
              <div className="shrink-0 hidden lg:grid grid-cols-6 gap-1 bg-[#1A1426] p-1.5 rounded-xl border-2 border-[#14101C]">
                {[
                  { id: 'profile',  label: 'Card',   icon: Users },
                  { id: 'chat',     label: 'Chat',   icon: MessageSquare, badge: unreadChatCount },
                  { id: 'arcade',   label: 'Arcade', icon: Gamepad2 },
                  { id: 'market',   label: 'Market', icon: ShoppingBag },
                  { id: 'townhall', label: 'Hall',   icon: Trophy },
                  { id: 'code',     label: 'Code',   icon: Terminal },
                ].map(t => {
                  const Icon = t.icon;
                  const active = activeDrawerTab === t.id || (activeDrawerTab === 'town' && t.id === 'profile');
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        setActiveDrawerTab(t.id);
                        if (t.id === 'chat') setUnreadChatCount(0);
                      }}
                      className={`relative py-1.5 px-1 min-h-[42px] rounded-lg flex flex-col items-center justify-center gap-0.5 font-pixel-body text-xs transition pixel-btn ${
                        active ? 'bg-[#FFDF6D] text-[#14101C] font-bold' : 'text-[#B9B4C7] hover:bg-[#2C2140]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{t.label}</span>
                      {t.badge > 0 && (
                        <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#FF6B7A] text-white text-[10px] flex items-center justify-center font-bold">
                          {t.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* MOBILE TOP BAR FOR ACTIVE DRAWER */}
              <div className="lg:hidden flex items-center justify-between bg-[#1A1426] p-2 rounded-xl border-2 border-[#14101C] shrink-0">
                <span className="font-pixel-title text-xs text-[#FFDF6D] uppercase">
                  {activeDrawerTab === 'profile' && 'Chog Collectible Card'}
                  {activeDrawerTab === 'chat' && 'Plaza Live Chat'}
                  {activeDrawerTab === 'arcade' && 'Pixel Arcade Cabinets'}
                  {activeDrawerTab === 'market' && 'Market Floor Listings'}
                  {activeDrawerTab === 'townhall' && 'Town Hall & Transfer'}
                  {activeDrawerTab === 'code' && 'Contract Code'}
                </span>
                <button
                  onClick={() => setActiveDrawerTab('town')}
                  className="px-2.5 py-1 min-h-[34px] rounded bg-[#2C2140] text-[#64E8D8] font-pixel-body text-xs pixel-btn flex items-center gap-1"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Map</span>
                </button>
              </div>

              {/* DRAWER SCROLL CONTAINER: Smooth internal scrolling */}
              <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 pb-16 lg:pb-0">
                {(activeDrawerTab === 'profile' || (activeDrawerTab === 'town' && typeof window !== 'undefined' && window.innerWidth >= 1024)) && (
                  <ProfileDrawer
                    myToken={myToken}
                    inspectedToken={inspectedToken}
                    activeTokenId={activeTokenId}
                    authMode={authMode}
                    tokenRecords={tokenRecords}
                    onAddFriend={fid => {
                      sfx.win();
                      setTokenRecords(prev => {
                        const mine = prev[activeTokenId];
                        if (!mine || mine.friends.includes(fid)) return prev;
                        return {
                          ...prev,
                          [activeTokenId]: { ...mine, friends: [...mine.friends, fid] },
                        };
                      });
                      addToast({
                        type: 'info',
                        title: `Added #${fid} ${inspectedToken.shortName}!`,
                        subtitle: 'Stored in your Token ID friend graph.',
                      });
                    }}
                    onSendDM={() => {
                      setChatChannel('dm');
                      setActiveDrawerTab('chat');
                    }}
                    onChallenge={tid => setActive1v1Game({ type: 'four', opponentId: tid })}
                    onWalkTo={fid => {
                      const targetEnt = entitiesRef.current.find(e => e.tokenId === fid);
                      const me = entitiesRef.current.find(e => e.tokenId === activeTokenId);
                      if (targetEnt && me) {
                        me.targetX = targetEnt.x - 26;
                        me.targetY = targetEnt.y;
                        worldFxRef.current.tapRipple = { x: me.targetX, y: me.targetY, age: 0 };
                        if (window.innerWidth < 1024) setActiveDrawerTab('town');
                      }
                    }}
                    onInspect={fid => setInspectedTokenId(fid)}
                    onExportPNG={handleShareProfileCardPng}
                  />
                )}

                {activeDrawerTab === 'chat' && (
                  <ChatDrawer
                    chatChannel={chatChannel}
                    setChatChannel={setChatChannel}
                    messages={messages}
                    mutedTokens={mutedTokens}
                    typingResident={typingResident}
                    chatInput={chatInput}
                    setChatInput={setChatInput}
                    onSendChat={handleSendChat}
                    authMode={authMode}
                    tokenRecords={tokenRecords}
                    onInspect={tid => {
                      setInspectedTokenId(tid);
                      setActiveDrawerTab('profile');
                    }}
                  />
                )}

                {activeDrawerTab === 'arcade' && (
                  <ArcadeDrawer
                    myToken={myToken}
                    inspectedToken={inspectedToken}
                    activeTokenId={activeTokenId}
                    authMode={authMode}
                    onQueue1v1={() => setQueueSeconds(10)}
                    onPlay1v1={(gameId, oppId) => setActive1v1Game({ type: gameId, opponentId: oppId })}
                    onPlaySolo={cabId => setActiveSoloGame(cabId)}
                  />
                )}

                {activeDrawerTab === 'market' && <MarketDrawer />}

                {activeDrawerTab === 'townhall' && (
                  <TownHallDrawer
                    myToken={myToken}
                    activeTokenId={activeTokenId}
                    tokenRecords={tokenRecords}
                    onSimulateTokenTransfer={handleSimulateTokenTransfer}
                  />
                )}

                {activeDrawerTab === 'code' && <CodeDrawer />}
              </div>
            </aside>
          </main>

          {/* MOBILE 5-TAB BAR */}
          <nav
            aria-label="Mobile Primary Navigation"
            className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-[#1A1426] border-t-2 border-[#14101C] px-2 py-1 grid grid-cols-5 gap-1 pb-[max(0.35rem,env(safe-area-inset-bottom))]"
          >
            {[
              { id: 'town',     label: 'Town',    icon: Compass },
              { id: 'profile',  label: 'Card',    icon: Users },
              { id: 'chat',     label: 'Chat',    icon: MessageSquare, badge: unreadChatCount },
              { id: 'arcade',   label: 'Games',   icon: Gamepad2 },
              { id: 'townhall', label: 'Hall',    icon: Trophy },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeDrawerTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    sfx.tone(520, 0.04);
                    setActiveDrawerTab(tab.id);
                    if (tab.id === 'chat') setUnreadChatCount(0);
                  }}
                  className={`relative py-1.5 min-h-[46px] rounded-lg flex flex-col items-center justify-center font-pixel-body text-xs ${
                    isActive ? 'bg-[#FFDF6D] text-[#14101C] font-bold' : 'text-[#B9B4C7]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.badge > 0 && (
                    <span className="absolute top-1 right-3 w-4 h-4 rounded-full bg-[#FF6B7A] text-white text-[10px] flex items-center justify-center font-bold">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* GAME MODALS */}
      {active1v1Game?.type === 'four' && (
        <ChogFourModal
          playerToken={myToken}
          opponentToken={tokenRecords[active1v1Game.opponentId] || tokenRecords[1337] || INITIAL_TOKEN_RECORDS[1337]}
          onClose={() => setActive1v1Game(null)}
          onMatchComplete={handle1v1Complete}
        />
      )}

      {active1v1Game?.type === 'duel' && (
        <ChogDuelModal
          playerToken={myToken}
          opponentToken={tokenRecords[active1v1Game.opponentId] || tokenRecords[1337] || INITIAL_TOKEN_RECORDS[1337]}
          onClose={() => setActive1v1Game(null)}
          onMatchComplete={handle1v1Complete}
        />
      )}

      {active1v1Game?.type === 'showdown' && (
        <ChogShowdownModal
          playerToken={myToken}
          opponentToken={tokenRecords[active1v1Game.opponentId] || tokenRecords[1337] || INITIAL_TOKEN_RECORDS[1337]}
          onClose={() => setActive1v1Game(null)}
          onMatchComplete={handle1v1Complete}
        />
      )}

      {activeSoloGame && (
        <SoloArcadeModal
          gameType={activeSoloGame}
          playerToken={myToken}
          onClose={() => setActiveSoloGame(null)}
          onSaveScore={handleSaveSoloScore}
        />
      )}
    </div>
  );
}
