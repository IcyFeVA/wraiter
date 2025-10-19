import { useEffect, useCallback } from 'react';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';

export const useWindowResize = (contentRef: React.RefObject<HTMLDivElement | null>) => {
  const updateWindowHeight = useCallback(async () => {
    if (contentRef.current) {
      // Adjust the height calculation as needed
      const height = Math.min((contentRef.current as HTMLDivElement).scrollHeight + 32, 700); // 32px for padding
      const window = await getCurrentWindow();
      const { width } = await window.outerSize();
      await window.setSize(new LogicalSize(width, height));
    }
  }, [contentRef]);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      updateWindowHeight();
    });

    const currentRef = contentRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [contentRef, updateWindowHeight]);

  // Initial resize
  useEffect(() => {
    updateWindowHeight();
  }, [updateWindowHeight]);
};
