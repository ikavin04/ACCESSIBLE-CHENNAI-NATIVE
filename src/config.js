// ============================================================
// Central API Configuration
// ============================================================
// TUNNEL MODE: Using localtunnel for internet-based connectivity
// To revert to local: set USE_TUNNEL = false
// ============================================================
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const USE_TUNNEL = false;
const TUNNEL_URL = 'https://tame-foxes-greet.loca.lt';

// Always use 127.0.0.1 with adb reverse (works for both physical device and emulator)
const LOCAL_URL = 'http://127.0.0.1:5000';

export const API_BASE = USE_TUNNEL ? TUNNEL_URL : LOCAL_URL;

/**
 * Wrapper around fetch that adds tunnel bypass headers when using localtunnel.
 * Use this instead of raw fetch() for all API calls.
 */
export function apiFetch(url, options = {}) {
  if (USE_TUNNEL) {
    options.headers = {
      ...options.headers,
      'Bypass-Tunnel-Reminder': 'true',
    };
  }
  return fetch(url, options);
}
