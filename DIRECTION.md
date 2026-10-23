# DIRECTION.md — Chog Town Architecture & Design System

## 1. Reference Grounding & Domain Identity
- **Product:** Chog Town — A retro 8-bit virtual pixel town built for Monad Testnet Chog NFT holders during the Monad Chogathon.
- **Reference Grounding:** Classic 16-bit / 8-bit Game Boy Advance & SNES pixel RPGs (Mother 3, Pokémon Emerald, Stardew Valley), fused with Monad's official brand palette (`#836EF9` electric purple, `#200052` deep indigo, `#F6EFE2` warm cream, `#FFDF6D` monad amber).
- **The Brief:** Walk, talk, and compete with fellow Chog holders in a live pixel world where wins and memories attach directly to the NFT token ID.
- **Three-Word Feel:** Tactile, nostalgic, alive.
- **Category Cliché Refused:** Rejected generic "Web3 neon glassmorphism" (ambient cyan/violet blur meshes, frosted floating cards, glowing borders) and sterile DeFi dashboard templates. Everything in Chog Town is physically grounded in pixel art grid mathematics, bitmap font rendering, and authentic 8-bit sound.

## 2. Three Concept Sentences
1. *Chog Town is an interactive 8-bit arcade cabinet* where every physical keypress and jump triggers crisp procedural audio and responsive pixel-doubled canvas animations.
2. *Chog Town is a persistent living village square* where AI residents and human holders stroll cobblestones, share chat bubbles, and challenge each other to parlor games.
3. *Chog Town is an immutable digital trophy case* where all match records, titles, and accolades are permanently bound to the ERC-721 token ID rather than ephemeral wallet sessions.

## 3. Design Tokens & Palette Rationale
- **Color Palette (Authentic 24-Color Retro Set):**
  - Background & Shell: `#1A1426` (Dusk Plum), `#14101C` (Ink Black)
  - Monad Accents: `#836EF9` (Electric Violet), `#FFDF6D` (Amber Glow), `#64E8D8` (Plaza Teal)
  - Nature & Ground: `#3E8948` (Grass Mid), `#265C32` (Grass Shadow), `#63C74D` (Grass Light), `#8B7355` (Cobblestone)
  - Architectural Accents: `#A8383B` (Terracotta Brick), `#D08159` (Warm Wood), `#FFE891` (Lantern Glow)
  - Text & Legibility: `#F6EFE2` (Warm Cream primary, contrast > 9:1 against dusk plum), `#B9B4C7` (Muted Lavendar secondary, contrast > 4.8:1)
- **Typography:**
  - Headers / Badges / Numbers: `'Press Start 2P', monospace` (crisp pixel titles, calibrated sizes 11px to 30px)
  - Dialogue / Body / Logs: `'VT323', monospace` (high-readability pixel text, 16px to 24px)
- **Geometry & Borders:**
  - Pixel boxes: Double-bordered simulated 3D bevels (`border-2 border-[#14101C] shadow-[inset_0_2px_0_rgba(255,255,255,0.15)]`)
  - No arbitrary floating rounded pill docks on desktop.

## 4. Architectural Modularization
- Replaced the single-file 4,999-line monolith (`chogtown.tsx`) with 22 structured modules:
  - `src/types/chog.ts`: Full TypeScript domain contracts
  - `src/constants/`: Separated `palette.ts`, `traits.ts`, `records.ts`, `zones.ts`, `market.ts`
  - `src/audio/pixelAudio.ts`: Dedicated Web Audio API synthesizer
  - `src/graphics/`: Isolated `spriteRenderer.ts` (8-layer procedural generator) & `landmarkRenderer.ts` (6 zone landmarks)
  - `src/components/common/`: Reusable pixel portrait avatar
  - `src/components/games/`: Modular 1v1 and solo arcade modal components
  - `src/components/landing/`: Parallax interactive hero, CHOGHOME cottage, live preview
  - `src/components/drawers/`: Town Hall, Arcade, Market, Chat, Profile, Code drawers
  - `src/components/town/`: TownHeader, EntryGate, ToastStack
  - `src/App.tsx`: Clean ~350-line state coordinator
