import { useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

export const useWindowResize = (contentRef: React.RefObject<HTMLDivElement | null>) => {
  const updateWindowHeight = useCallback(async () => {
    if (contentRef.current) {
      const height = Math.min((contentRef.current as HTMLDivElement).scrollHeight + 32, 700); // 32px for padding
      await invoke('resize_window', { height });
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
