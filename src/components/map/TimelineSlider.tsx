'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';

interface TimelineSliderProps {
  minYear: number;
  maxYear: number;
  currentYear: number;
  onYearChange: (year: number) => void;
  isPlaying?: boolean;
  onPlayPause?: () => void;
}

export function TimelineSlider({
  minYear,
  maxYear,
  currentYear,
  onYearChange,
  isPlaying = false,
  onPlayPause,
}: TimelineSliderProps) {
  const [internalPlaying, setInternalPlaying] = useState(isPlaying);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const playing = onPlayPause !== undefined ? isPlaying : internalPlaying;
  const setPlaying = onPlayPause || setInternalPlaying;

  // Format year for display
  const formatYear = (year: number): string => {
    if (year < 0) {
      return `${Math.abs(year)} BCE`;
    } else if (year === 0) {
      return '1 CE';
    } else {
      return `${year} CE`;
    }
  };

  // Track current year in a ref for interval access
  const currentYearRef = useRef(currentYear);
  useEffect(() => {
    currentYearRef.current = currentYear;
  }, [currentYear]);

  // Handle animation
  useEffect(() => {
    if (playing) {
      const step = Math.max(1, Math.floor((maxYear - minYear) / 100));
      intervalRef.current = setInterval(() => {
        const next = currentYearRef.current + step;
        if (next > maxYear) {
          setPlaying(false);
          onYearChange(maxYear);
        } else {
          onYearChange(next);
        }
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [playing, maxYear, minYear, onYearChange, setPlaying]);

  const handlePlayPause = () => {
    if (currentYear >= maxYear) {
      onYearChange(minYear);
    }
    setPlaying(!playing);
  };

  const handleReset = () => {
    setPlaying(false);
    onYearChange(minYear);
  };

  const handleEnd = () => {
    setPlaying(false);
    onYearChange(maxYear);
  };

  // Generate tick marks for major time periods
  const getTicks = () => {
    const ticks: { year: number; label: string }[] = [];
    const range = maxYear - minYear;

    // Add meaningful historical markers
    const significantYears = [
      -10000, -5000, -3000, -2000, -1000, -500, 0, 500, 1000, 1500, 1800, 1900, 2000,
    ].filter((y) => y >= minYear && y <= maxYear);

    significantYears.forEach((year) => {
      ticks.push({
        year,
        label: formatYear(year),
      });
    });

    return ticks;
  };

  const ticks = getTicks();

  return (
    <div className="w-full bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4">
      <div className="flex items-center gap-4">
        {/* Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleReset}
            title="Go to start"
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button
            variant="default"
            size="icon"
            className="h-10 w-10"
            onClick={handlePlayPause}
            title={playing ? 'Pause' : 'Play'}
          >
            {playing ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleEnd}
            title="Go to end"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Slider */}
        <div className="flex-1 space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">
              {formatYear(currentYear)}
            </span>
            <span className="text-xs text-gray-500">
              {formatYear(minYear)} — {formatYear(maxYear)}
            </span>
          </div>
          <Slider
            value={[currentYear]}
            min={minYear}
            max={maxYear}
            step={1}
            onValueChange={([value]) => onYearChange(value)}
            className="cursor-pointer"
          />
          {/* Tick marks */}
          <div className="relative h-4">
            {ticks.map(({ year, label }) => {
              const percentage = ((year - minYear) / (maxYear - minYear)) * 100;
              return (
                <div
                  key={year}
                  className="absolute transform -translate-x-1/2"
                  style={{ left: `${percentage}%` }}
                >
                  <div className="w-px h-2 bg-gray-300 mx-auto" />
                  <span className="text-[10px] text-gray-400 whitespace-nowrap">
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
