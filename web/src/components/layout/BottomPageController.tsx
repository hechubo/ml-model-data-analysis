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
    <div className="fixed bottom-5 inset-x-0 z-40 pointer-events-none flex justify-center px-4">
      <div className="pointer-events-auto rounded-full bg-[#080E1C]/92 border border-white/10 backdrop-blur-2xl px-3 py-2 shadow-[0_18px_50px_rgba(0,0,0,0.55)] flex items-center gap-3">
        <button
          type="button"
          disabled={!prevPage}
          onClick={() => prevPage && onSelectPage(prevPage.id)}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] transition-all ${
            prevPage
              ? 'text-slate-200 hover:bg-white/[0.06]'
              : 'opacity-30 cursor-not-allowed text-slate-500'
          }`}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {prevPage ? prevPage.shortTitle : '首页'}
          </span>
        </button>

        <div className="flex items-center gap-1.5 px-2">
          {PAGES.map((p, idx) => {
            const isCurrent = idx === currentIndex;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPage(p.id)}
                title={`${p.num} ${p.shortTitle}`}
                className={`h-1.5 rounded-full transition-all ${
                  isCurrent
                    ? 'w-6 bg-gradient-to-r from-cyan-400 to-emerald-400'
                    : idx < currentIndex
                    ? 'w-1.5 bg-emerald-400/50 hover:bg-emerald-300'
                    : 'w-1.5 bg-white/15 hover:bg-white/30'
                }`}
              />
            );
          })}
          <span className="ml-2 text-[11px] font-mono text-slate-500">
            {String(currentIndex + 1).padStart(2, '0')}/{PAGES.length}
          </span>
        </div>

        <button
          type="button"
          disabled={!nextPage}
          onClick={() => nextPage && onSelectPage(nextPage.id)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-semibold transition-all ${
            nextPage
              ? 'bg-white text-slate-950 hover:bg-cyan-50'
              : 'opacity-30 cursor-not-allowed bg-white/10 text-slate-400'
          }`}
        >
          <span>
            {nextPage ? `下一章 · ${nextPage.shortTitle}` : '演示结束'}
          </span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
