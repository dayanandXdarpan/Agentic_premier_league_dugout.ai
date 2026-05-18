import { useState, useEffect, useRef, useCallback } from 'react';

export interface BatterInfo { name: string; runs: number; balls: number; fours: number; sixes: number; }
export interface BowlerInfo { name: string; overs: string; runs: number; wickets: number; economy: string; }

// Define the shape of the structured data based on the Gemini JSON contract
export interface AgentEventContent {
  question?: string;
  options?: string[];
  explanation?: string;
  prediction?: string;
  probability?: number;
  stylized_text?: string;
  stylized_text_en?: string;
  stylized_text_hi?: string;
  stylized_text_bho?: string;
  persona?: string;
  coins_awarded?: number;
  fun_fact?: string;
  // Match state fields
  team1?: string;
  team2?: string;
  score1?: string;
  score2?: string;
  overs?: string;
  batting?: string;
  status?: string;
  venue?: string;
  batters?: BatterInfo[];
  bowler?: BowlerInfo;
  last_over?: string[];
}

export interface AgentEvent {
  type: 'poll' | 'insight' | 'oracle' | 'commentary' | 'trivia' | 'points_update' | 'match_state';
  id: string;
  timestamp: string;
  title: string;
  content: AgentEventContent;
}

export type ConnectionState = 'connecting' | 'connected' | 'error' | 'closed';

export interface MatchState {
  team1: string;
  team2: string;
  score1: string;
  score2: string;
  overs: string;
  batting: string;
  status: string;
  venue: string;
  batters?: BatterInfo[];
  bowler?: BowlerInfo;
  last_over?: string[];
}

const DEFAULT_MATCH_STATE: MatchState = {
  team1: 'KKR',
  team2: 'SRH',
  score1: '——',
  score2: '——',
  overs: '0.0',
  batting: 'KKR',
  status: 'Connecting...',
  venue: 'MA Chidambaram Stadium, Chennai',
};

export const useLiveMatch = () => {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [fanCoins, setFanCoins] = useState<number>(100); // Starting coins
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [matchState, setMatchState] = useState<MatchState>(DEFAULT_MATCH_STATE);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);

  const connect = useCallback(() => {
    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    setConnectionState('connecting');

    const eventSource = new EventSource(`${baseUrl}/api/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setConnectionState('connected');
      reconnectAttempts.current = 0;
      console.log('✅ SSE connection established');

      // Fetch initial match state via REST
      fetch(`${baseUrl}/api/match-state`)
        .then(res => res.json())
        .then(data => {
          if (data.data) {
            setMatchState(prev => ({ ...prev, ...data.data, status: 'Live' }));
          }
        })
        .catch(err => console.warn('Could not fetch initial match state:', err));
    };

    eventSource.onmessage = (event) => {
      try {
        // Skip SSE keepalive comments
        if (event.data.startsWith(':')) return;

        const parsedData: AgentEvent = JSON.parse(event.data);

        // Handle points updates (don't render as card)
        if (parsedData.type === 'points_update' && parsedData.content.coins_awarded !== undefined) {
          setFanCoins(prev => prev + (parsedData.content.coins_awarded ?? 0));
          // Still add to feed so user sees the result
          setEvents(prev => [...prev, parsedData]);
          return;
        }

        // Handle match state updates (don't render as card)
        if (parsedData.type === 'match_state') {
          setMatchState(prev => ({
            ...prev,
            ...parsedData.content,
            status: 'Live',
          }));
          return;
        }

        // All other events go to the feed
        setEvents(prev => [...prev, parsedData]);
      } catch (error) {
        console.error('Error parsing SSE event data:', error, event.data);
      }
    };

    eventSource.onerror = () => {
      setConnectionState('error');
      eventSource.close();

      // Exponential backoff reconnection
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      reconnectAttempts.current += 1;
      console.warn(`SSE connection lost. Reconnecting in ${delay / 1000}s (attempt ${reconnectAttempts.current})...`);

      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  return { events, fanCoins, setFanCoins, connectionState, matchState };
};
