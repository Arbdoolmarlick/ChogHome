import React, { useState } from 'react';
import { ExternalLink, ShoppingBag } from 'lucide-react';
import { MARKET_LISTINGS } from '../../constants/market';
import { INITIAL_TOKEN_RECORDS } from '../../constants/records';
import { ChogPixelPortrait } from '../common/ChogPixelPortrait';

interface MarketDrawerProps {
  isLoadingMarket?: boolean;
}

export const MarketDrawer: React.FC<MarketDrawerProps> = ({ isLoadingMarket = false }) => {
  const [marketTraitFilter, setMarketTraitFilter] = useState('ALL');
  const [marketSort, setMarketSort] = useState('price_asc');

  const filtered = MARKET_LISTINGS
    .filter(item => marketTraitFilter === 'ALL' || item.traits.body === marketTraitFilter)
    .sort((a, b) => (marketSort === 'price_asc' ? a.priceMon - b.priceMon : b.priceMon - a.priceMon));

  return (
    <div className="pixel-box rounded-xl p-4 flex-1 flex flex-col gap-3 overflow-y-auto max-h-[540px]">
      <div className="flex items-center justify-between border-b-2 border-[#14101C] pb-2">
        <div className="flex items-center gap-2.5">
          <ChogPixelPortrait traits={INITIAL_TOKEN_RECORDS[88].traits} size={38} />
          <div>
            <div className="flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-[#FFDF6D]" />
              <h3 className="font-pixel-title text-xs text-[#FFDF6D]">CHOG MARKET STALLS</h3>
            </div>
            <p className="font-pixel-body text-sm text-[#B9B4C7]">
              Inspector Pip (#88): “Every Chog sold keeps its wins & titles!”
            </p>
          </div>
        </div>
        <select
          value={marketSort}
          onChange={e => setMarketSort(e.target.value)}
          aria-label="Sort market listings"
          className="bg-[#1A1426] border-2 border-[#14101C] rounded-lg px-2 py-1 font-pixel-body text-sm text-[#F6EFE2]"
        >
          <option value="price_asc">Price: Low → High</option>
          <option value="price_desc">Price: High → Low</option>
        </select>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {['ALL', 'Mint Cyber', 'Golden Chog', 'Classic Purple', 'Forest Moss'].map(tr => (
          <button
            key={tr}
            onClick={() => setMarketTraitFilter(tr)}
            className={`px-2.5 py-1 rounded-lg font-pixel-body text-sm shrink-0 transition pixel-btn ${
              marketTraitFilter === tr ? 'bg-[#64E8D8] text-[#14101C] font-bold' : 'bg-[#1A1426] text-[#B9B4C7]'
            }`}
          >
            {tr}
          </button>
        ))}
      </div>

      {isLoadingMarket ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {[1, 2, 3, 4].map(sk => (
            <div
              key={sk}
              className="bg-[#1A1426] border-2 border-[#14101C] rounded-lg p-3 h-28 animate-pulse flex flex-col justify-between"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-12 h-12 rounded bg-[#2C2140]" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 bg-[#2C2140] rounded w-3/4" />
                  <div className="h-3 bg-[#2C2140] rounded w-1/2" />
                </div>
              </div>
              <div className="h-7 bg-[#2C2140] rounded w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {filtered.map(item => (
            <div
              key={item.tokenId}
              className="bg-[#1A1426] border-2 border-[#14101C] hover:border-[#FFDF6D] rounded-xl p-3 flex flex-col justify-between gap-2.5 transition-transform hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-2.5">
                <ChogPixelPortrait traits={item.traits} size={50} showBadge={item.tokenId} />
                <div className="font-pixel-body leading-tight">
                  <div className="text-[#F6EFE2] font-bold text-base">{item.name}</div>
                  <div className="text-sm text-[#FFDF6D] font-bold">{item.priceMon} MON</div>
                  <div className="text-xs text-[#64E8D8]">{item.rarity}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 font-pixel-body text-xs">
                <span className="px-1.5 py-0.5 rounded bg-[#241B35] text-[#B9B4C7]">{item.traits.body}</span>
                <span className="px-1.5 py-0.5 rounded bg-[#241B35] text-[#B9B4C7]">{item.traits.hat}</span>
              </div>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="w-full py-1.5 min-h-[38px] rounded-lg bg-[#2C2140] hover:bg-[#382B52] border border-[#64E8D8] text-[#64E8D8] font-pixel-body text-sm font-bold flex items-center justify-center gap-1 pixel-btn"
              >
                <span>View on {item.marketplace}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
