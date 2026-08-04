'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

// Safely register ScrollTrigger if available
let ScrollTrigger = null;
try {
  ScrollTrigger = require('gsap/ScrollTrigger')?.ScrollTrigger || require('gsap/ScrollTrigger');
  if (ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
} catch (e) {
  // ScrollTrigger optional fallback
}

export default function SplitText({
  text = '',
  className = '',
  delay = 50,
  duration = 1.25,
  ease = 'power3.out',
  splitType = 'chars',
  from = { opacity: 0, y: 40 },
  to = { opacity: 1, y: 0 },
  threshold = 0.1,
  rootMargin = '-100px',
  textAlign = 'center',
  tag = 'p',
  onLetterAnimationComplete = undefined,
}) {
  const containerRef = useRef(null);
  const animationCompletedRef = useRef(false);
  const onCompleteRef = useRef(onLetterAnimationComplete);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    onCompleteRef.current = onLetterAnimationComplete;
  }, [onLetterAnimationComplete]);

  useEffect(() => {
    if (typeof document !== 'undefined' && document.fonts) {
      if (document.fonts.status === 'loaded') {
        setFontsLoaded(true);
      } else {
        document.fonts.ready.then(() => {
          setFontsLoaded(true);
        });
      }
    } else {
      setFontsLoaded(true);
    }
  }, []);

  // Split items into React elements for SSR safety & cross-platform reliability
  const items = useMemo(() => {
    if (!text) return [];
    if (splitType.includes('words')) {
      return text.split(' ').map((word, wIdx) => ({
        key: `word-${wIdx}`,
        content: word,
        isWord: true,
      }));
    }
    // Default split by characters
    return text.split('').map((char, cIdx) => ({
      key: `char-${cIdx}`,
      content: char === ' ' ? '\u00A0' : char,
      isWord: false,
    }));
  }, [text, splitType]);

  useGSAP(
    () => {
      if (!containerRef.current || !text || !fontsLoaded) return;
      if (animationCompletedRef.current) return;

      const elements = containerRef.current.querySelectorAll('.split-item');
      if (!elements || elements.length === 0) return;

      const tween = gsap.fromTo(
        elements,
        { ...from },
        {
          ...to,
          duration,
          ease,
          stagger: delay / 1000,
          onComplete: () => {
            animationCompletedRef.current = true;
            if (onCompleteRef.current) onCompleteRef.current();
          },
          willChange: 'transform, opacity',
        }
      );

      return () => {
        tween.kill();
      };
    },
    {
      dependencies: [text, delay, duration, ease, splitType, JSON.stringify(from), JSON.stringify(to), fontsLoaded],
      scope: containerRef,
    }
  );

  const Tag = tag || 'p';

  return (
    <Tag
      ref={containerRef}
      className={`split-parent inline-block overflow-hidden ${className}`}
      style={{ textAlign }}
      suppressHydrationWarning
    >
      {items.map((item) => (
        <span
          key={item.key}
          className="split-item inline-block will-change-transform opacity-0"
          style={{ whiteSpace: item.content === '\u00A0' ? 'pre' : 'normal' }}
          suppressHydrationWarning
        >
          {item.content}
          {item.isWord ? '\u00A0' : ''}
        </span>
      ))}
    </Tag>
  );
}
