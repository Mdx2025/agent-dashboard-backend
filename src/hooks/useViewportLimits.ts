import { useState, useEffect } from 'react';

/**
 * Viewport limits configuration based on height
 * These limits ensure no empty spaces in the layout
 * 
 * @version 1.0.1 - Dynamic viewport detection
 */
const VIEWPORT_LIMITS = {
  // Viewport height breakpoints
  breakpoints: {
    '768h':  { sessions: 6,  runs: 8,  agents: 8  },
    '900h':  { sessions: 8,  runs: 11, agents: 10 },
    '1080h': { sessions: 10, runs: 14, agents: 12 },
    '1440h': { sessions: 15, runs: 21, agents: 16 }
  },
  
  // Minimum limits (never show less than this)
  min: {
    sessions: 5,
    runs: 8,
    agents: 8
  },
  
  // Maximum limits (never show more than this)
  max: {
    sessions: 15,
    runs: 25,
    agents: 20
  }
};

/**
 * Calculate max items based on viewport height
 * @param viewportHeight - Window inner height in pixels
 * @param itemType - 'sessions' | 'runs' | 'agents'
 * @returns Maximum items to display
 */
function calculateMaxItems(viewportHeight: number, itemType: keyof typeof VIEWPORT_LIMITS.min): number {
  // Layout constants (from analysis)
  const LAYOUT_CONSTANTS = {
    taskbar: 40,
    header: 40,
    title: 60,
    kpiCards: 90,
    agentsSection: 110,
    gaps: 20
  };
  
  // Item heights in pixels
  const ITEM_HEIGHTS = {
    sessions: 70,  // card with gap
    runs: 50,      // row with padding
    agents: 45     // compact card
  };
  
  // Calculate available height
  const usedHeight = Object.values(LAYOUT_CONSTANTS).reduce((a, b) => a + b, 0);
  const availableHeight = viewportHeight - usedHeight;
  
  // Calculate max items
  const itemHeight = ITEM_HEIGHTS[itemType];
  const maxItems = Math.floor(availableHeight / itemHeight);
  
  // Apply safety limits
  const min = VIEWPORT_LIMITS.min[itemType];
  const max = VIEWPORT_LIMITS.max[itemType];
  
  return Math.max(min, Math.min(max, maxItems));
}

/**
 * Get breakpoint key from viewport height
 */
function getHeightBreakpoint(height: number): string {
  if (height >= 1440) return '1440h';
  if (height >= 1080) return '1080h';
  if (height >= 900) return '900h';
  return '768h';
}

/**
 * Hook to calculate dynamic limits based on viewport size
 * Automatically updates on resize
 */
export function useViewportLimits() {
  const [limits, setLimits] = useState({
    sessions: 5,
    runs: 8,
    agents: 8
  });
  
  const [viewport, setViewport] = useState({
    width: 1280,
    height: 768,
    breakpoint: '768h'
  });
  
  useEffect(() => {
    const updateLimits = () => {
      const height = window.innerHeight;
      const width = window.innerWidth;
      
      // Calculate limits for each item type
      const newLimits = {
        sessions: calculateMaxItems(height, 'sessions'),
        runs: calculateMaxItems(height, 'runs'),
        agents: calculateMaxItems(height, 'agents')
      };
      
      const breakpoint = getHeightBreakpoint(height);
      
      setLimits(newLimits);
      setViewport({ width, height, breakpoint });
    };
    
    // Initial calculation
    updateLimits();
    
    // Update on resize
    window.addEventListener('resize', updateLimits);
    
    // Cleanup
    return () => window.removeEventListener('resize', updateLimits);
  }, []);
  
  return {
    limits,
    viewport,
    // Utilization metrics
    utilization: {
      sessions: (items: number) => Math.round((items / limits.sessions) * 100),
      runs: (items: number) => Math.round((items / limits.runs) * 100),
      agents: (items: number) => Math.round((items / limits.agents) * 100)
    },
    // Helper to check if viewport is compact
    isCompact: viewport.height < 900,
    // Helper to check if viewport is large
    isLarge: viewport.height >= 1080
  };
}

/**
 * Hook for simple viewport detection (width only)
 */
export function useViewport() {
  const [viewport, setViewport] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
    isMobile: false,
    isTablet: false,
    isDesktop: true
  });
  
  useEffect(() => {
    const updateViewport = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setViewport({
        width,
        height,
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024
      });
    };
    
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);
  
  return viewport;
}

export default useViewportLimits;
