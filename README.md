# 🏰 Chog Town — Auto-Pixel Chog on Monad Mainnet (Chain 143)

> **Auto-Pixel Chog**: Connect your Monad wallet, automatically discover your real Chog Genesis NFTs from on-chain contracts, and witness them seamlessly converted into authentic 16-bit retro pixel citizens that walk, dance, emote, and play in Chog Town without ever breaking or leaving a blank character.

---

## ⚡ 1. Monad Mainnet Network & Contract Details

The entire application has been fully migrated to **Monad Mainnet (Chain ID 143)**:

| Parameter | Mainnet Specification | Notes |
| :--- | :--- | :--- |
| **Network Name** | **Monad** | Monad Mainnet |
| **Chain ID** | **143** (`0x8f`) | Switches seamlessly via EIP-3085 / EIP-3326 |
| **Native Currency** | **MON** (18 decimals) | Used for all gas and token transactions |
| **RPC Endpoint** | `https://rpc.monad.xyz` | Batched multicall support |
| **Block Explorer** | `https://monadscan.com` | Monad Mainnet explorer |
| **NFT Contract** | `0xc96d31F8626c6D03Fae5dCD3d61e3FB9F4a73763` | ERC-721 Chog Genesis (Supply: 1,969) |
| **Token ID Range** | `1` to `1,969` | Total verified supply |
| **Fungible Disambiguation** | `$CHOG` (`0x350035555E10d9AfAF1566AaebfCeD5BA6C27777`) | **NOT** used for NFT ownership |

---

## 🎨 2. How Auto-Pixel Chog Works (The Hybrid Pipeline)

The core architecture uses a **Hybrid Rigging + Pure WASM Conversion Pipeline** that delivers pixel-perfect fidelity without sacrificing animation responsiveness:

```
[On-Chain NFT WebP / IPFS]
           │
           ▼
[Server-Side WebP WASM Decoder (@jsquash/webp)]
           │ (Decompressed 1000x1000 RGBA in <80ms)
           ▼
[Head Anatomy Cropper] (Upper 62% bounds, background auto-subtracted)
           │
           ▼
[Area-Averaging Downscaler] (Downscaled to 32x26 Town Sprite Density)
           │
           ▼
[Color Quantization & Palette Snapping]
  • 24-Color Retro Palette (PALETTE_24)
  • Up to 8 Sampled Artwork Accent Colors (preserves unique furs, items, visors)
           │
           ▼
[Pixel Art Polish & Outline]
  • 1px #14101C Dark Contour Outline
  • Top-Left Lighting Direction
  • 2x2 Feature Protection (eyes, mouth, visors stay sharp)
           │
           ▼
[Town Animation Rig Composition]
  • Head Matrix anchored to Standard Animated Body Rig
  • Squashes, stretches, bobs during walk cycle
  • Hand-drawn Trait Overlays from TRAIT_MAPPING
  • 4x PNG Collectible Portrait Streamed to Client
```

### Why Pure WASM + Pure JS?
- Traditional C++ image libraries like `sharp` frequently encounter node-gyp compilation failures, architecture mismatches, or binary lockups on newer Node environments (e.g. Node 25 on Windows/Linux).
- Chog Town uses `@jsquash/webp` (Google Chrome Labs WebAssembly libwebp decoder) combined with `pngjs`. It decodes 1000x1000 WebP images in **~70ms** with zero native dependencies, zero build friction, and 100% deterministic cross-platform execution.

---

## 🛡️ 3. Four-Tier Fallback Resilience

The converter guarantees that **no holder ever sees a blank or broken character**:

1. **Tier 1 (Instant Disk/Memory Cache):**
   - Sprites keyed by `tokenId + pipelineVersion` (e.g. `.cache/sprites/7_v1.2.json`).
   - Response latency: **< 10ms** (far exceeding the 300ms SLA).
2. **Tier 2 (Fresh On-Demand Server Conversion):**
   - Fetches original artwork via multi-gateway fallback (`magic.decentralized-content.com`, `ipfs.io`, `cloudflare-ipfs.com`, `dweb.link`).
   - Converts and writes cache in under 2.5 seconds.
3. **Tier 3 (Trait-Only Procedural Overlays):**
   - If image sources fail, synthesizes the Chog from on-chain attributes via `TRAIT_MAPPING`.
4. **Tier 4 (Harmonized Default Look):**
   - Employs a deterministic fallback 32x26 head matrix and 4x PNG portrait with the holder's Token ID badge and a friendly "Using default look" status.

---

## 🕹️ 4. Holder & Player Experience (UX Polish)

- **One-Tap Monad Network Switching:**
  - If a wallet is connected to an alternate chain, a prominent alert banner prompts one-click switching to Monad Mainnet (`0x8f`).
- **Multi-Step Pixel Progress:**
  - Realtime feedback during scanning: *"Connecting to Monad Mainnet..."* → *"Reading metadata from IPFS..."* → *"Painting 16-bit pixel sprites..."*.
- **Before & After Reveal Showcase:**
  - **Side-by-Side Mode:** View the original 1000x1000 NFT alongside the 16-bit pixel citizen.
  - **Flip Mode:** Tap or click to flip between original NFT art and pixel sprite.
  - **Re-Pixelate Button:** Allows live re-rendering on demand.
- **Carousel & Accessibility:**
  - Multi-Chog carousel with keyboard navigation (`ArrowLeft` / `ArrowRight`), swipe gestures, and 44px+ touch targets.
- **Plaza Spawning:**
  - Clicking *"Play as Chog #X"* triggers a pop-in squash animation, sparkle burst, retro victory audio jingle, and an *"I'm home!"* speech bubble.
- **Token-Bound Profile Card & PNG Export:**
  - Card Front: 16-bit pixel portrait, on-chain record, badges, and friends graph.
  - Card Back: Displays the original Genesis NFT artwork thumbnail alongside token traits.
  - Downloadable 420x250 crisp PNG card with pixel art and metadata.
- **Dynamic Landing Page Cursor Follower:**
  - The cursor-following sprite on the landing page automatically becomes the holder's auto-pixelated Chog upon connection.

---

## 🔍 5. Verification & Testing

### Automated 12-Token Pipeline Verification
Run the verification suite testing 12 real Monad Genesis Chogs:
```bash
node scripts/verify_tokens.mjs
```

**Verified Test Set:**
- **#1** (`CHOG #1462` — Pink Skin, Yellow 143 Jersey, MCGA)
- **#7** (`CHOG #1468` — Pink Skin, Wizard Hat, Rainbow Puke, Red Tuxedo)
- **#47** (`CHOG #1508` — MMGA Cap, Anime Glass, Fwog, Yellow 143 Jersey)
- **#86** (`CHOG #1547` — Origin, Spartan Helmet)
- **#89** (`CHOG #1550` — Russian Hat, Teary)
- **#91** (`CHOG #1552` — BTC Cap, Sunset Visor)
- **#97** (`CHOG #1558` — Peace Hat, Purple Laser)
- **#132** (`CHOG #1593` — Propeller Beanie, Cyber Pilot)
- **#170** (`CHOG #1631` — Black Skin, Tuxedo)
- **#244** (`CHOG #1705` — Red Skin, Banana Suit)
- **#404** (`CHOG #1865` — Shark Suit, Gradient Visor)
- **#1462** (`CHOG #953` — MMGA Cap, Teary)

### Live Server Endpoints:
- `GET /api/health` — Verifies Monad Mainnet configuration
- `GET /api/wallet/:address/chogs` — Discovers owned Chog token IDs and metadata
- `GET /api/chog/:tokenId/sprite` — Returns JSON sprite matrix and palette
- `GET /api/chog/:tokenId/portrait` — Direct streaming 4x PNG with 24hr CDN cache headers
- `GET /api/admin/unmapped-traits` — Realtime telemetry of all unseen traits

### Judge / Demo Modes:
- **Instant Demo Pass:** Click "30s Demo Pass" at the Entry Gate to test with pre-cached real Genesis Chogs (#7 Wizard Hat, #47 MMGA Cap, #132 Propeller Beanie).
- **Custom Address Lookup:** Enter any 42-character Monad Mainnet address (e.g. `0x84113421a8a564b594ee9ae78c875310332d7023` for Holder 1 with 47 Chogs, or `0xb496b250afb266110296747c94e99dde94075ee0` for Holder 2 with 28 Chogs) to scan live ownership on chain 143.
