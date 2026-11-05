import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import rawPayload from './data/ames_analytics_payload.json';
import { AnalyticsPayload } from './types/analytics';
import { AmbientBackground } from './components/ui/AmbientBackground';
import {
  PAGES,
  PageId,
  TopStageStepper,
} from './components/layout/SidebarNav';
import { BottomPageController } from './components/layout/BottomPageController';
import { Page1HeroPipeline } from './components/views/Page1HeroPipeline';
import { Page2OutlierMissingLab } from './components/views/Page2OutlierMissingLab';
import { Page3SkewnessMorphLab } from './components/views/Page3SkewnessMorphLab';
import { Page4FeatureDiscoveryStudio } from './components/views/Page4FeatureDiscoveryStudio';
import { Page5Topology3DSankey } from './components/views/Page5Topology3DSankey';
import { View4SpatialParallel } from './components/views/View4SpatialParallel';
import { Page7AblationSandboxShap } from './components/views/Page7AblationSandboxShap';

const initialPayload = rawPayload as unknown as AnalyticsPayload;

export const App: React.FC = () => {
  const [payload] = useState<AnalyticsPayload>(initialPayload);
  const [activePage, setActivePage] = useState<PageId>('page-1-hero');
  const [apiOnline, setApiOnline] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.status === 'ok') setApiOnline(true);
      })
      .catch(() => setApiOnline(false));
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName || '';
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) return;

      const idx = PAGES.findIndex((p) => p.id === activePage);

      // Space / Enter: advance within-page derivation (presentation clicker)
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('ames:step-forward'));
        return;
      }

      if (e.key === 'ArrowRight' && idx < PAGES.length - 1) {
        setActivePage(PAGES[idx + 1].id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (e.key === 'ArrowLeft' && idx > 0) {
        setActivePage(PAGES[idx - 1].id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activePage]);

  const handleSelectPage = (page: PageId) => {
    setActivePage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#05080F] text-slate-100 relative">
      <AmbientBackground />

      <TopStageStepper
        activePage={activePage}
        onSelectPage={handleSelectPage}
        kpis={payload.summary_kpis}
        apiOnline={apiOnline}
      />

      <main className="relative z-10 flex-1 max-w-[1680px] w-full mx-auto px-4 sm:px-6 lg:px-7 pt-5 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={activePage}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {activePage === 'page-1-hero' && (
              <Page1HeroPipeline
                payload={payload}
                onNavigate={handleSelectPage}
              />
            )}
            {activePage === 'page-2-outlier-missing' && (
              <Page2OutlierMissingLab payload={payload} />
            )}
            {activePage === 'page-3-skewness-morph' && (
              <Page3SkewnessMorphLab payload={payload} />
            )}
            {activePage === 'page-4-feature-discovery' && (
              <Page4FeatureDiscoveryStudio payload={payload} />
            )}
            {activePage === 'page-5-topology-3d' && (
              <Page5Topology3DSankey payload={payload} />
            )}
            {activePage === 'page-6-spatial-parallel' && (
              <View4SpatialParallel payload={payload} />
            )}
            {activePage === 'page-7-ablation-shap' && (
              <Page7AblationSandboxShap
                payload={payload}
                apiOnline={apiOnline}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomPageController
        activePage={activePage}
        onSelectPage={handleSelectPage}
      />
    </div>
  );
};

export default App;
