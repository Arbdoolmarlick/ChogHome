import React from 'react';
import { FileCode2, Clapperboard, Database, KeyRound } from 'lucide-react';

export const CodeDrawer: React.FC = () => {
  return (
    <div className="pixel-box rounded-xl p-4 flex-1 flex flex-col gap-3 overflow-y-auto max-h-[540px] font-pixel-body text-base">
      <div className="flex items-center gap-1.5 border-b-2 border-[#14101C] pb-2">
        <FileCode2 className="w-4 h-4 text-[#64E8D8]" />
        <h3 className="font-pixel-title text-xs text-[#64E8D8]">
          NEXT.JS + SUPABASE RLS + SIWE + DEMO SCRIPT
        </h3>
      </div>

      <div className="bg-[#14101C] border border-[#2C2140] p-3 rounded">
        <div className="text-[#FFDF6D] font-bold mb-1 flex items-center gap-1.5">
          <Clapperboard className="w-4 h-4 text-[#FFDF6D]" />
          <span>60–90s Judge Demo Script</span>
        </div>
        <p className="text-[#F6EFE2] text-sm leading-relaxed">
          1. <strong>0:00-0:15 (Landing):</strong> Move cursor to walk the pixel Chog across the hills, click to jump, and walk into the <em>CHOGHOME</em> door to trigger the pixel iris-wipe.<br />
          2. <strong>0:15-0:30 (Entry & Town):</strong> Click 30s Demo Mode (or SIWE Holder), pick Token #404, spawn in Central Plaza, pop a Wave emote, and tap AI Resident Glitch (#1337).<br />
          3. <strong>0:30-0:60 (1v1 & Solo Arcade):</strong> Challenge #1337 to Chog Duel or Chog Four, win +20 points for Token #404.<br />
          4. <strong>0:60-0:90 (Town Hall Transfer Demo):</strong> Open Town Hall → click "Simulate Sale → 0xB0B...7777" and show that all wins, titles, and badges stay attached to Token #404!
        </p>
      </div>

      <div className="bg-[#14101C] border border-[#2C2140] p-3 rounded">
        <div className="text-[#64E8D8] font-bold mb-1 flex items-center gap-1.5">
          <Database className="w-4 h-4 text-[#64E8D8]" />
          <span>Supabase Postgres Schema (Token-Keyed + RLS)</span>
        </div>
        <pre className="text-xs text-[#B9B4C7] overflow-x-auto whitespace-pre-wrap">{`create table tokens (
  token_id bigint primary key,
  owner_wallet text not null,
  traits jsonb not null,
  wins int default 0,
  losses int default 0,
  points int default 0,
  title text default 'Town Newcomer',
  badges text[] default '{}',
  cosmetics text[] default '{}'
);
alter table tokens enable row level security;
create policy "Public read tokens" on tokens for select using (true);`}</pre>
      </div>

      <div className="bg-[#14101C] border border-[#2C2140] p-3 rounded">
        <div className="text-[#E0467E] font-bold mb-1 flex items-center gap-1.5">
          <KeyRound className="w-4 h-4 text-[#E0467E]" />
          <span>.env.example (Server-Only Secrets)</span>
        </div>
        <pre className="text-xs text-[#B9B4C7] overflow-x-auto whitespace-pre-wrap">{`NEXT_PUBLIC_MONAD_CHAIN_ID=143
NEXT_PUBLIC_MONAD_RPC_URL=https://rpc.monad.xyz
NEXT_PUBLIC_CHOG_CONTRACT=0xc96d31F8626c6D03Fae5dCD3d61e3FB9F4a73763
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-key
ANTHROPIC_API_KEY=sk-ant-server-only`}</pre>
      </div>
    </div>
  );
};
