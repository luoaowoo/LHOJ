import { useCallback, useEffect, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, IconButton } from '@mui/material';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { hydroAssetUrl } from '../lib/endpoint';
import type { CarouselSlide } from '../lib/homepage';

const autoplayDelay = 5000;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    try {
      const query = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReduced(query.matches);
      const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    } catch {
      // matchMedia can be unavailable in some embedded browsers.
      return undefined;
    }
  }, []);
  return reduced;
}

function slideSrc(image: string): string {
  return image.startsWith('/') ? hydroAssetUrl(image) ?? image : image;
}

function SlideContent({ slide, onError }: { slide: CarouselSlide; onError: () => void }) {
  return (
    <Box
      component="img"
      src={slideSrc(slide.image)}
      alt={slide.title || '首页轮播图'}
      loading="lazy"
      onError={onError}
      sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
    />
  );
}

export default function HomeCarousel({ slides }: { slides: CarouselSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [broken, setBroken] = useState<Record<string, boolean>>({});
  const reducedMotion = usePrefersReducedMotion();
  const touchStart = useRef<number | null>(null);

  const usable = slides.filter((slide) => !broken[slide.id]);
  const count = usable.length;
  const active = count ? index % count : 0;

  const go = useCallback((delta: number) => {
    setIndex((current) => (count ? (current + delta + count) % count : 0));
  }, [count]);

  useEffect(() => {
    // The global reduced-motion CSS rule kills transitions but cannot stop a
    // JS timer, so autoplay has to opt out explicitly.
    if (reducedMotion || paused || count < 2) return undefined;
    const timer = setInterval(() => go(1), autoplayDelay);
    return () => clearInterval(timer);
  }, [reducedMotion, paused, count, go]);

  useEffect(() => { if (count && index >= count) setIndex(0); }, [count, index]);

  if (!count) return null;

  return (
    <Box
      role="region"
      aria-roledescription="carousel"
      aria-label="首页轮播图"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null; }}
      onTouchEnd={(event) => {
        const start = touchStart.current;
        const end = event.changedTouches[0]?.clientX;
        if (start === null || end === undefined) return;
        if (Math.abs(end - start) > 40) go(end < start ? 1 : -1);
        touchStart.current = null;
      }}
      sx={{
        position: 'relative',
        borderRadius: 3,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'action.hover',
        aspectRatio: { xs: '16 / 9', sm: '21 / 8' },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          height: '100%',
          transform: `translateX(-${active * 100}%)`,
          transition: 'transform 320ms ease',
        }}
      >
        {usable.map((slide) => {
          const isExternal = /^https?:/i.test(slide.link);
          const inner = (
            <SlideContent
              slide={slide}
              onError={() => setBroken((current) => ({ ...current, [slide.id]: true }))}
            />
          );
          return (
            <Box key={slide.id} sx={{ flex: '0 0 100%', height: '100%', minWidth: 0 }}>
              {!slide.link ? inner : isExternal ? (
                <Box component="a" href={slide.link} target="_blank" rel="noopener noreferrer" sx={{ display: 'block', height: '100%' }}>{inner}</Box>
              ) : (
                <Box component={RouterLink} to={slide.link} sx={{ display: 'block', height: '100%' }}>{inner}</Box>
              )}
            </Box>
          );
        })}
      </Box>

      {count > 1 ? (
        <>
          <IconButton
            aria-label="上一张"
            onClick={() => go(-1)}
            sx={{ position: 'absolute', top: '50%', left: 8, transform: 'translateY(-50%)', width: 44, height: 44, color: 'common.white', bgcolor: 'rgba(0,0,0,0.32)', '&:hover': { bgcolor: 'rgba(0,0,0,0.48)' } }}
          >
            <ChevronLeft size={20} />
          </IconButton>
          <IconButton
            aria-label="下一张"
            onClick={() => go(1)}
            sx={{ position: 'absolute', top: '50%', right: 8, transform: 'translateY(-50%)', width: 44, height: 44, color: 'common.white', bgcolor: 'rgba(0,0,0,0.32)', '&:hover': { bgcolor: 'rgba(0,0,0,0.48)' } }}
          >
            <ChevronRight size={20} />
          </IconButton>
          <Box sx={{ position: 'absolute', bottom: 4, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 0.5 }}>
            {usable.map((slide, dot) => (
              <Box
                key={slide.id}
                component="button"
                type="button"
                aria-label={`第 ${dot + 1} 张`}
                aria-current={dot === active}
                onClick={() => setIndex(dot)}
                sx={{
                  width: 44,
                  height: 28,
                  border: 0,
                  background: 'none',
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                  '&::after': {
                    content: '""',
                    width: dot === active ? 18 : 7,
                    height: 7,
                    borderRadius: 4,
                    bgcolor: dot === active ? 'common.white' : 'rgba(255,255,255,0.55)',
                    transition: 'width 160ms ease, background-color 160ms ease',
                  },
                }}
              />
            ))}
          </Box>
        </>
      ) : null}
    </Box>
  );
}
