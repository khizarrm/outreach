'use client';

import React, { useState, useEffect } from 'react';
import type { OrchestratorResponse } from '@/lib/api';
import { PersonCard } from './person-card';
import { LoadingSkeleton } from './loading-skeleton';
import { EmptyState } from './empty-state';

interface SearchResultsProps {
  loading: boolean;
  error: string | null;
  data: OrchestratorResponse | null;
}

type DisplayState = 'idle' | 'loading' | 'results' | 'empty' | 'error' | 'no-results';

export function SearchResults({ loading, error, data }: SearchResultsProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [displayState, setDisplayState] = useState<DisplayState>('idle');

  // Orchestrate exit → enter transitions
  useEffect(() => {
    let newState: DisplayState = 'idle';

    if (loading) {
      newState = 'loading';
    } else if (error) {
      newState = 'error';
    } else if (data) {
      if (data.message === "No verified emails found") {
        newState = 'empty';
      } else if (data.people && data.people.length > 0) {
        newState = 'results';
      } else {
        newState = 'no-results';
      }
    }

    // Only trigger transition if state actually changed
    if (newState !== displayState && displayState !== 'idle') {
      setIsExiting(true);
      setTimeout(() => {
        setDisplayState(newState);
        setIsExiting(false);
      }, 300); // Match fadeOutDown duration
    } else if (displayState === 'idle') {
      setDisplayState(newState);
    }
  }, [loading, error, data, displayState]);

  // Minimum height to prevent layout shift
  const containerClass = "mt-6 sm:mt-8 min-h-[200px]";

  if (displayState === 'error' && error) {
    return (
      <div className={`${containerClass} ${isExiting ? 'animate-fade-out-down' : 'animate-slide-up-fade'} px-4`}>
        <div className="max-w-2xl mx-auto bg-[#151515] border border-[#2a2a2a] rounded-2xl p-5 sm:p-6 text-center">
          <div className="text-2xl sm:text-3xl mb-2 opacity-30">✕</div>
          <p className="text-sm font-light text-[#e8e8e8]/80 leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  if (displayState === 'loading') {
    return <LoadingSkeleton isExiting={isExiting} />;
  }

  if (displayState === 'idle' || !data) {
    return null;
  }

  if (displayState === 'empty') {
    return (
      <div className={`${containerClass} ${isExiting ? 'animate-fade-out-down' : 'animate-slide-up-fade'}`}>
        <EmptyState people={data.people} company={data.company} />
      </div>
    );
  }

  if (displayState === 'results' && data.people && data.people.length > 0) {
    const person = data.people[0];
    return (
      <div className={`${containerClass} ${isExiting ? 'animate-fade-out-down' : 'animate-slide-up-fade'}`}>
        <div className="max-w-3xl mx-auto">
          <PersonCard
            person={person}
            favicon={data.favicon}
            companyName={data.company}
            index={0}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`${containerClass} ${isExiting ? 'animate-fade-out-down' : 'animate-slide-up-fade'} text-center px-4`}>
      <div className="max-w-2xl mx-auto bg-[#151515] border border-[#2a2a2a] rounded-2xl p-5 sm:p-6">
        <div className="text-2xl sm:text-3xl mb-2 opacity-30">∅</div>
        <p className="text-sm font-light text-[#6a6a6a]">
          No results found
        </p>
      </div>
    </div>
  );
}

