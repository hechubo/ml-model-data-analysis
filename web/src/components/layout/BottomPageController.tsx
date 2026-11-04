import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { PAGES, PageId } from './SidebarNav';

interface BottomPageControllerProps {
  activePage: PageId;
  onSelectPage: (page: PageId) => void;
}

export const BottomPageController: React.FC<BottomPageControllerProps> = ({
  activePage,
  onSelectPage,
}) => {
  const currentIndex = PAGES.findIndex((p) => p.id === activePage);
  const prevPage = currentIndex > 0 ? PAGES[currentIndex - 1] : null;
  const nextPage =
    currentIndex < PAGES.length - 1 ? PAGES[currentIndex + 1] : null;

  return (
    <div className="fixed bottom-4 inset-x-0 z-40 pointer-events-none flex justify-center px-4">
      <div className="pointer-events-auto rounded-2xl bg-[#070C1A]/90 border border-slate-700/80 backdrop-blur-2xl px-4 py-2 shadow-[0_20px_50px_rgba(0,0,0,0.75)] flex items-center gap-4">
        <button
          type="button"
          disabled={!prevPage}
          onClick={() => prevPage && onSelectPage(prevPage.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
            prevPage
              ? 'bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700'
              : 'opacity-35 cursor-not-allowed text-slate-500'
          }`}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {prevPage ? `${prevPage.num} ${prevPage.shortTitle}` : '第一页'}
          </span>
        </button>

        {/* Progress Dots */}
        <div className="flex items-center gap-1.5 px-2">
          {PAGES.map((p, idx) => {
            const isCurrent = idx === currentIndex;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPage(p.id)}
                title={`${p.num} ${p.shortTitle}`}
                className={`h-2 rounded-full transition-all ${
                  isCurrent
                    ? 'w-7 bg-gradient-to-r from-cyan-400 to-emerald-400 shadow-[0_0_10px_rgba(6,182,212,0.6)]'
                    : idx < currentIndex
                    ? 'w-2 bg-emerald-500/60 hover:bg-emerald-400'
                    : 'w-2 bg-slate-700 hover:bg-slate-500'
                }`}
              />
            );
          })}
          <span className="ml-2 text-[11px] font-mono text-slate-400">
            {currentIndex + 1} / {PAGES.length}
          </span>
        </div>

        <button
          type="button"
          disabled={!nextPage}
          onClick={() => nextPage && onSelectPage(nextPage.id)}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            nextPage
              ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 hover:brightness-110 shadow-[0_0_20px_rgba(6,182,212,0.35)]'
              : 'opacity-35 cursor-not-allowed bg-slate-800 text-slate-500'
          }`}
        >
          <span>
            {nextPage
              ? `下一页: ${nextPage.num} ${nextPage.shortTitle}`
              : '已完成全链路探索'}
          </span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
