import React from 'react';
import { Globe, Lock } from 'lucide-react';
import { ChatMessage, TokenRecord } from '../../types/chog';
import { ChogPixelPortrait } from '../common/ChogPixelPortrait';

interface ChatDrawerProps {
  chatChannel: 'public' | 'dm';
  setChatChannel: (channel: 'public' | 'dm') => void;
  messages: ChatMessage[];
  mutedTokens: number[];
  typingResident: string | null;
  chatInput: string;
  setChatInput: (val: string) => void;
  onSendChat: (e: React.FormEvent) => void;
  authMode: 'holder' | 'demo' | 'spectator';
  tokenRecords: Record<number, TokenRecord>;
  onInspect: (tid: number) => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  chatChannel,
  setChatChannel,
  messages,
  mutedTokens,
  typingResident,
  chatInput,
  setChatInput,
  onSendChat,
  authMode,
  tokenRecords,
  onInspect,
}) => {
  const filteredMessages = messages.filter(
    m => m.channel === chatChannel && !mutedTokens.includes(m.tokenId)
  );

  return (
    <div className="pixel-box rounded-xl p-4 flex-1 flex flex-col gap-3">
      <div className="flex items-center justify-between border-b-2 border-[#14101C] pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setChatChannel('public')}
            className={`px-3 py-1.5 min-h-[38px] rounded-lg font-pixel-body text-base pixel-btn flex items-center gap-1.5 ${
              chatChannel === 'public' ? 'bg-[#64E8D8] text-[#14101C] font-bold' : 'bg-[#1A1426] text-[#B9B4C7]'
            }`}
          >
            <Globe className="w-4 h-4 shrink-0" />
            <span>Plaza Public</span>
          </button>
          <button
            onClick={() => setChatChannel('dm')}
            className={`px-3 py-1.5 min-h-[38px] rounded-lg font-pixel-body text-base pixel-btn flex items-center gap-1.5 ${
              chatChannel === 'dm' ? 'bg-[#E0467E] text-white font-bold' : 'bg-[#1A1426] text-[#B9B4C7]'
            }`}
          >
            <Lock className="w-4 h-4 shrink-0" />
            <span>Friend DMs</span>
          </button>
        </div>
        <span className="text-xs font-pixel-body text-[#B9B4C7]">1.5s rate limit</span>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto max-h-72 pr-1">
        {filteredMessages.length === 0 ? (
          <div className="bg-[#1A1426] border border-[#14101C] rounded-lg p-6 text-center font-pixel-body text-lg text-[#B9B4C7]">
            No messages in this channel yet. Break the ice with a friendly GM!
          </div>
        ) : (
          filteredMessages.map(msg => {
            const senderRec = tokenRecords[msg.tokenId] || tokenRecords[404];
            return (
              <div
                key={msg.id}
                className="bg-[#1A1426] border border-[#14101C] p-2.5 rounded-lg flex items-start gap-2.5"
              >
                <button
                  onClick={() => onInspect(msg.tokenId)}
                  title="Click to view Chog profile card"
                  className="hover:scale-105 transition-transform"
                >
                  <ChogPixelPortrait traits={senderRec.traits} size={32} />
                </button>
                <div className="flex-1 font-pixel-body leading-tight">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#FFDF6D] text-base">{msg.speaker}</span>
                    <span className="text-xs text-[#B9B4C7]">{msg.time}</span>
                  </div>
                  <p className="text-base text-[#F6EFE2] mt-0.5 select-text">{msg.text}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {typingResident && (
        <div className="text-xs font-pixel-body text-[#64E8D8] animate-pulse flex items-center gap-1.5 px-1">
          <span>●</span>
          <span>{typingResident} is typing a message in the Plaza...</span>
        </div>
      )}

      {/* CHAT INPUT FORM */}
      <form onSubmit={onSendChat} className="flex gap-2">
        <input
          type="text"
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          placeholder={authMode === 'spectator' ? 'Spectator Mode (chat disabled)' : 'Say something in Plaza...'}
          disabled={authMode === 'spectator'}
          maxLength={140}
          className="flex-1 px-3 py-2 rounded-lg bg-[#1A1426] border-2 border-[#14101C] text-[#F6EFE2] font-pixel-body text-lg focus:outline-none focus:border-[#64E8D8] disabled:opacity-40"
        />
        <button
          type="submit"
          disabled={authMode === 'spectator' || !chatInput.trim()}
          className="px-4 py-2 min-h-[44px] rounded-lg bg-[#FFDF6D] text-[#14101C] font-pixel-body text-lg font-bold pixel-btn disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
};
