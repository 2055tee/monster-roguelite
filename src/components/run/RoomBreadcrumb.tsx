import type { RoomType } from '@/lib/game/types';

const ROOM_ICON: Record<RoomType, string> = {
  combat: '⚔',
  rest: '🛏',
  boss: '👑',
};

export function RoomBreadcrumb({
  roomLayout,
  currentRoomIndex,
}: {
  roomLayout: RoomType[];
  currentRoomIndex: number;
}) {
  return (
    <div className="flex items-center justify-center gap-2 border-b border-slate-800 bg-slate-900 px-4 py-3">
      {roomLayout.map((room, idx) => {
        const isCurrent = idx === currentRoomIndex;
        const isPast = idx < currentRoomIndex;
        return (
          <div
            key={idx}
            className={`flex h-9 w-9 items-center justify-center rounded-full border text-base ${
              isCurrent
                ? 'border-indigo-400 bg-indigo-600/40 ring-2 ring-indigo-400'
                : isPast
                  ? 'border-slate-600 bg-slate-800 opacity-60'
                  : 'border-slate-700 bg-slate-800/60'
            }`}
            title={`Room ${idx + 1}: ${room}`}
          >
            {ROOM_ICON[room]}
          </div>
        );
      })}
    </div>
  );
}
