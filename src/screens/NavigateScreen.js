import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  SectionList,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ExpoLocation from 'expo-location';
import { usePreferences } from '../context/PreferencesContext';
import { useVoiceInterface } from '../utils/voiceUtils';
import LocationService from '../services/LocationService';
import MetroNavigation from '../components/MetroNavigation';
import MTCBusNavigation from '../components/MTCBusNavigation';

// ==================== CHENNAI LOCATIONS (with categories — mirrors web) ====================
const CHENNAI_LOCATIONS = [
  // Metro Stations
  { name: 'AG-DMS Metro Station', category: 'Metro Station' },
  { name: 'Airport Metro Station', category: 'Metro Station' },
  { name: 'Alandur Metro Station', category: 'Metro Station' },
  { name: 'Anna Nagar East Metro Station', category: 'Metro Station' },
  { name: 'Anna Nagar Tower Metro Station', category: 'Metro Station' },
  { name: 'Arumbakkam Metro Station', category: 'Metro Station' },
  { name: 'Ashok Nagar Metro Station', category: 'Metro Station' },
  { name: 'Chennai Central Metro Station', category: 'Metro Station' },
  { name: 'CMBT Metro Station', category: 'Metro Station' },
  { name: 'Egmore Metro Station', category: 'Metro Station' },
  { name: 'Ekkattuthangal Metro Station', category: 'Metro Station' },
  { name: 'Government Estate Metro Station', category: 'Metro Station' },
  { name: 'Guindy Metro Station', category: 'Metro Station' },
  { name: 'High Court Metro Station', category: 'Metro Station' },
  { name: 'Kilpauk Metro Station', category: 'Metro Station' },
  { name: 'Koyambedu Metro Station', category: 'Metro Station' },
  { name: 'LIC Metro Station', category: 'Metro Station' },
  { name: 'Little Mount Metro Station', category: 'Metro Station' },
  { name: 'Mannady Metro Station', category: 'Metro Station' },
  { name: 'Meenambakkam Metro Station', category: 'Metro Station' },
  { name: 'Nandanam Metro Station', category: 'Metro Station' },
  { name: 'Nanganallur Metro Station', category: 'Metro Station' },
  { name: 'Nehru Park Metro Station', category: 'Metro Station' },
  { name: 'Pachaiyappas College Metro Station', category: 'Metro Station' },
  { name: 'Park Town Metro Station', category: 'Metro Station' },
  { name: 'Saidapet Metro Station', category: 'Metro Station' },
  { name: 'Shenoy Nagar Metro Station', category: 'Metro Station' },
  { name: 'St. Thomas Mount Metro Station', category: 'Metro Station' },
  { name: 'Teynampet Metro Station', category: 'Metro Station' },
  { name: 'Thirumangalam Metro Station', category: 'Metro Station' },
  { name: 'Thousand Lights Metro Station', category: 'Metro Station' },
  { name: 'Vadapalani Metro Station', category: 'Metro Station' },
  // Railway Stations
  { name: 'Chennai Beach Railway Station', category: 'Railway Station' },
  { name: 'Chennai Central Railway Station', category: 'Railway Station' },
  { name: 'Chennai Egmore Railway Station', category: 'Railway Station' },
  { name: 'Chepauk Railway Station', category: 'Railway Station' },
  { name: 'Chetpet Railway Station', category: 'Railway Station' },
  { name: 'Chintadripet Railway Station', category: 'Railway Station' },
  { name: 'Chromepet Railway Station', category: 'Railway Station' },
  { name: 'Fort Railway Station', category: 'Railway Station' },
  { name: 'Guindy Railway Station', category: 'Railway Station' },
  { name: 'Indira Nagar Railway Station', category: 'Railway Station' },
  { name: 'Kasturba Nagar Railway Station', category: 'Railway Station' },
  { name: 'Kodambakkam Railway Station', category: 'Railway Station' },
  { name: 'Kotturpuram Railway Station', category: 'Railway Station' },
  { name: 'Light House Railway Station', category: 'Railway Station' },
  { name: 'Mambalam Railway Station', category: 'Railway Station' },
  { name: 'Nungambakkam Railway Station', category: 'Railway Station' },
  { name: 'Pallavaram Railway Station', category: 'Railway Station' },
  { name: 'Park Town Railway Station', category: 'Railway Station' },
  { name: 'Perambur Railway Station', category: 'Railway Station' },
  { name: 'Tambaram Railway Station', category: 'Railway Station' },
  { name: 'Thiruvallikeni Railway Station', category: 'Railway Station' },
  { name: 'Tirusulam Railway Station', category: 'Railway Station' },
  { name: 'Velachery Railway Station', category: 'Railway Station' },
  { name: 'Villivakkam Railway Station', category: 'Railway Station' },
  // Hospitals
  { name: 'Apollo Hospital Greams Road', category: 'Hospital' },
  { name: 'Apollo Hospital Vanagaram', category: 'Hospital' },
  { name: 'Apollo Spectra Hospital OMR', category: 'Hospital' },
  { name: 'Billroth Hospital', category: 'Hospital' },
  { name: 'Cancer Institute Adyar', category: 'Hospital' },
  { name: 'Fortis Malar Hospital Adyar', category: 'Hospital' },
  { name: 'Gleneagles Global Health City', category: 'Hospital' },
  { name: 'Global Health City', category: 'Hospital' },
  { name: 'Government General Hospital', category: 'Hospital' },
  { name: 'Government KMC Hospital', category: 'Hospital' },
  { name: 'Government Royapettah Hospital', category: 'Hospital' },
  { name: 'Institute of Mental Health', category: 'Hospital' },
  { name: 'Kauvery Hospital', category: 'Hospital' },
  { name: 'Kilpauk Medical College', category: 'Hospital' },
  { name: 'Madras Medical College', category: 'Hospital' },
  { name: 'Mehta Hospital', category: 'Hospital' },
  { name: 'MIOT International Hospital', category: 'Hospital' },
  { name: 'Rajiv Gandhi Government General Hospital', category: 'Hospital' },
  { name: 'Sankara Nethralaya', category: 'Hospital' },
  { name: 'Sri Ramachandra Medical Centre', category: 'Hospital' },
  { name: 'Stanley Medical College', category: 'Hospital' },
  { name: 'Voluntary Health Services Hospital', category: 'Hospital' },
  // Shopping
  { name: 'Ampa Skywalk Mall', category: 'Shopping' },
  { name: 'Broadway', category: 'Shopping' },
  { name: 'Burma Bazaar', category: 'Shopping' },
  { name: 'Chennai Citi Centre', category: 'Shopping' },
  { name: 'EA Mall OMR', category: 'Shopping' },
  { name: 'Express Avenue Mall', category: 'Shopping' },
  { name: 'Forum Vijaya Mall Vadapalani', category: 'Shopping' },
  { name: 'George Town', category: 'Shopping' },
  { name: 'Grand Square Mall', category: 'Shopping' },
  { name: 'Marina Mall', category: 'Shopping' },
  { name: 'Parrys Corner', category: 'Shopping' },
  { name: 'Phoenix MarketCity Velachery', category: 'Shopping' },
  { name: 'Pondy Bazaar', category: 'Shopping' },
  { name: 'Ritchie Street', category: 'Shopping' },
  { name: 'Sowcarpet', category: 'Shopping' },
  { name: 'Spencer Plaza Mount Road', category: 'Shopping' },
  { name: 'VR Chennai Mall Anna Nagar', category: 'Shopping' },
  // Education
  { name: 'Anna University', category: 'Education' },
  { name: 'Ethiraj College', category: 'Education' },
  { name: 'IIT Madras', category: 'Education' },
  { name: 'Loyola College', category: 'Education' },
  { name: 'Madras Christian College', category: 'Education' },
  { name: 'MOP Vaishnav College', category: 'Education' },
  { name: 'Pachaiyappas College', category: 'Education' },
  { name: 'Presidency College', category: 'Education' },
  { name: 'SRM University', category: 'Education' },
  { name: 'SSN College of Engineering', category: 'Education' },
  { name: 'Stella Maris College', category: 'Education' },
  { name: 'University of Madras', category: 'Education' },
  { name: 'VIT Chennai', category: 'Education' },
  // Landmark
  { name: 'Anna Centenary Library', category: 'Landmark' },
  { name: 'Anna Memorial', category: 'Landmark' },
  { name: 'Arignar Anna Zoological Park', category: 'Landmark' },
  { name: 'Birla Planetarium', category: 'Landmark' },
  { name: 'Connemara Library', category: 'Landmark' },
  { name: 'Fort St. George', category: 'Landmark' },
  { name: 'Government Museum Egmore', category: 'Landmark' },
  { name: 'Guindy National Park', category: 'Landmark' },
  { name: 'High Court Chennai', category: 'Landmark' },
  { name: 'Kalakshetra', category: 'Landmark' },
  { name: 'Kapaleeshwarar Temple Mylapore', category: 'Landmark' },
  { name: 'Light House Marina', category: 'Landmark' },
  { name: 'MGR Memorial', category: 'Landmark' },
  { name: 'Parthasarathy Temple Triplicane', category: 'Landmark' },
  { name: 'Ripon Building', category: 'Landmark' },
  { name: 'San Thome Cathedral', category: 'Landmark' },
  { name: 'Theosophical Society Adyar', category: 'Landmark' },
  { name: 'Vadapalani Murugan Temple', category: 'Landmark' },
  { name: 'Valluvar Kottam', category: 'Landmark' },
  { name: 'Victory War Memorial', category: 'Landmark' },
  { name: 'Vivekananda House', category: 'Landmark' },
  // Bus Stop
  { name: 'Adyar Bus Depot', category: 'Bus Stop' },
  { name: 'Anna Bus Terminus', category: 'Bus Stop' },
  { name: 'Broadway Bus Terminus', category: 'Bus Stop' },
  { name: 'Chennai Mofussil Bus Terminus (CMBT)', category: 'Bus Stop' },
  { name: 'Chromepet Bus Stand', category: 'Bus Stop' },
  { name: 'Koyambedu Bus Stand', category: 'Bus Stop' },
  { name: 'Poonamallee Bus Stand', category: 'Bus Stop' },
  { name: 'T Nagar Bus Stand', category: 'Bus Stop' },
  { name: 'Tambaram Bus Stand', category: 'Bus Stop' },
  { name: 'Velachery Bus Depot', category: 'Bus Stop' },
  // Airport
  { name: 'Chennai International Airport', category: 'Airport' },
  // IT Park
  { name: 'Ascendas IT Park', category: 'IT Park' },
  { name: 'DLF IT Park', category: 'IT Park' },
  { name: 'ELCOT IT Park', category: 'IT Park' },
  { name: 'Olympia Tech Park', category: 'IT Park' },
  { name: 'RMZ Millenia', category: 'IT Park' },
  { name: 'Ramanujan IT City', category: 'IT Park' },
  { name: 'Tidel Park', category: 'IT Park' },
  { name: 'SP Infocity', category: 'IT Park' },
  { name: 'Taramani IT Corridor', category: 'IT Park' },
  // Beach
  { name: 'Besant Nagar Beach', category: 'Beach' },
  { name: 'Elliot Beach', category: 'Beach' },
  { name: 'Injambakkam Beach', category: 'Beach' },
  { name: 'Kovalam Beach', category: 'Beach' },
  { name: 'Mahabalipuram Beach', category: 'Beach' },
  { name: 'Marina Beach', category: 'Beach' },
  { name: 'Muttukadu Beach', category: 'Beach' },
  { name: 'Palavakkam Beach', category: 'Beach' },
  { name: 'Thiruvanmiyur Beach', category: 'Beach' },
  // Area
  { name: 'Adyar', category: 'Area' },
  { name: 'Alandur', category: 'Area' },
  { name: 'Alwarpet', category: 'Area' },
  { name: 'Ambattur', category: 'Area' },
  { name: 'Anna Nagar East', category: 'Area' },
  { name: 'Anna Nagar West', category: 'Area' },
  { name: 'Ashok Nagar', category: 'Area' },
  { name: 'Avadi', category: 'Area' },
  { name: 'Besant Nagar', category: 'Area' },
  { name: 'Chepauk', category: 'Area' },
  { name: 'Chetpet', category: 'Area' },
  { name: 'Chintadripet', category: 'Area' },
  { name: 'Chromepet', category: 'Area' },
  { name: 'Egmore', category: 'Area' },
  { name: 'George Town', category: 'Area' },
  { name: 'Gopalapuram', category: 'Area' },
  { name: 'Guindy', category: 'Area' },
  { name: 'Kanchipuram', category: 'Area' },
  { name: 'Kilpauk', category: 'Area' },
  { name: 'Kodambakkam', category: 'Area' },
  { name: 'Little Mount', category: 'Area' },
  { name: 'Madhavaram', category: 'Area' },
  { name: 'Madipakkam', category: 'Area' },
  { name: 'Meenambakkam', category: 'Area' },
  { name: 'Mylapore', category: 'Area' },
  { name: 'Nanganallur', category: 'Area' },
  { name: 'Nungambakkam', category: 'Area' },
  { name: 'Pallavaram', category: 'Area' },
  { name: 'Park Town', category: 'Area' },
  { name: 'Perambur', category: 'Area' },
  { name: 'Perungudi', category: 'Area' },
  { name: 'Poonamallee', category: 'Area' },
  { name: 'Royapettah', category: 'Area' },
  { name: 'Royapuram', category: 'Area' },
  { name: 'Saidapet', category: 'Area' },
  { name: 'Sholinganallur', category: 'Area' },
  { name: 'T. Nagar (Thyagaraya Nagar)', category: 'Area' },
  { name: 'Tambaram East', category: 'Area' },
  { name: 'Tambaram West', category: 'Area' },
  { name: 'Teynampet', category: 'Area' },
  { name: 'Thiruvanmiyur', category: 'Area' },
  { name: 'Thoraipakkam', category: 'Area' },
  { name: 'Thousand Lights', category: 'Area' },
  { name: 'Tondiarpet', category: 'Area' },
  { name: 'Triplicane', category: 'Area' },
  { name: 'Vadapalani', category: 'Area' },
  { name: 'Velachery', category: 'Area' },
  { name: 'Washermanpet', category: 'Area' },
  // Road
  { name: '100 Feet Road Vadapalani', category: 'Road' },
  { name: 'Anna Salai', category: 'Road' },
  { name: 'Arcot Road', category: 'Road' },
  { name: 'Cathedral Road', category: 'Road' },
  { name: 'ECR (East Coast Road)', category: 'Road' },
  { name: 'GST Road (Grand Southern Trunk Road)', category: 'Road' },
  { name: 'Inner Ring Road', category: 'Road' },
  { name: 'Kodambakkam High Road', category: 'Road' },
  { name: 'Mount Road', category: 'Road' },
  { name: 'OMR (Old Mahabalipuram Road)', category: 'Road' },
  { name: 'Outer Ring Road', category: 'Road' },
  { name: 'Poonamallee High Road', category: 'Road' },
  { name: 'Sardar Patel Road', category: 'Road' },
  { name: 'TTK Road', category: 'Road' },
];

// Flat name list for voice fuzzy matching

// Category helpers (mirrors web LocationDropdownPicker)
const getCategoryIcon = (cat) => {
  const icons = {
    'Metro Station': '🚇', 'Railway Station': '🚂', 'Hospital': '🏥',
    'Shopping': '🛍️', 'Education': '🎓', 'Landmark': '🏛️',
    'Bus Stop': '🚌', 'Airport': '✈️', 'IT Park': '🏢',
    'Beach': '🏖️', 'Area': '📍', 'Road': '🛣️',
  };
  return icons[cat] || '📍';
};
const getCategoryColor = (cat) => {
  const colors = {
    'Metro Station': '#2196F3', 'Railway Station': '#FF9800', 'Hospital': '#F44336',
    'Shopping': '#E91E63', 'Education': '#9C27B0', 'Landmark': '#FF5722',
    'Bus Stop': '#4CAF50', 'Airport': '#00BCD4', 'IT Park': '#607D8B',
    'Beach': '#03A9F4', 'Area': '#795548', 'Road': '#9E9E9E',
  };
  return colors[cat] || '#757575';
};

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshteinDistance(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function similarityScore(input, candidate) {
  const a = normalizeText(input);
  const b = normalizeText(candidate);
  if (a === b) return 1;
  if (b.includes(a)) return 0.9;
  if (a.includes(b)) return 0.85;
  // Word-level matching (e.g. "marina" matches "marina beach")
  const aWords = a.split(' ');
  const bWords = b.split(' ');
  const matchedWords = aWords.filter(w => bWords.some(bw => bw.includes(w) || w.includes(bw)));
  if (matchedWords.length > 0 && matchedWords.length >= aWords.length * 0.5) {
    return 0.7 + (0.2 * matchedWords.length / Math.max(aWords.length, bWords.length));
  }
  const dist = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - dist / maxLen;
}

function matchLocationFromDataset(input) {
  if (!input || input.trim().length < 2) {
    return { matches: [], bestMatch: null };
  }
  const scored = CHENNAI_LOCATIONS.map(loc => ({
    name: loc.name,
    category: loc.category,
    score: similarityScore(input, loc.name),
  }))
    .filter(m => m.score >= 0.45)
    .sort((a, b) => b.score - a.score);

  // Get top matches (score within 0.1 of best)
  const topMatches = scored.length > 0
    ? scored.filter(m => m.score >= scored[0].score - 0.1).slice(0, 5)
    : [];

  return {
    matches: topMatches,
    bestMatch: topMatches.length > 0 ? topMatches[0] : null
  };
}

// ==================== MAIN COMPONENT ====================
export default function NavigateScreen({ navigation }) {
  const { theme, getText, preferences } = usePreferences();
  const isVoiceMode = preferences.mode === 'voice';

  // Voice interface
  const {
    isListening,
    voiceFeedback,
    speak,
    setupSpeechRecognition,
    startListening,
    stopListening,
  } = useVoiceInterface('Navigate');

  // State
  const [transportMode, setTransportMode] = useState('general');
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fromLocked, setFromLocked] = useState(false);
  const [toLocked, setToLocked] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(null); // 'from' | 'to' | null
  const [locationSearch, setLocationSearch] = useState('');

  // Voice flow
  const [voiceFlowStep, setVoiceFlowStep] = useState(null);
  const [voiceFlowData, setVoiceFlowData] = useState({
    startLocation: '',
    destination: '',
    selectedRouteIndex: null,
    pendingMatches: [],
  });
  const [voiceSetupComplete, setVoiceSetupComplete] = useState(false);

  // Refs to avoid stale closures
  const voiceFlowStepRef = useRef(null);
  const voiceFlowDataRef = useRef({ startLocation: '', destination: '', selectedRouteIndex: null, pendingMatches: [] });
  const routesRef = useRef([]);
  const handleVoiceFlowCommandRef = useRef(null);
  const voiceSetupStartedRef = useRef(false);

  // Keep refs in sync
  useEffect(() => { voiceFlowStepRef.current = voiceFlowStep; }, [voiceFlowStep]);
  useEffect(() => { voiceFlowDataRef.current = voiceFlowData; }, [voiceFlowData]);
  useEffect(() => { routesRef.current = routes; }, [routes]);

  // ==================== VOICE: selectRouteByVoice ====================
  const selectRouteByVoice = useCallback(async (index) => {
    const currentRoutes = routesRef.current;
    if (index < 0 || index >= currentRoutes.length) {
      await speak('Invalid route number.', false, false);
      return;
    }
    const route = currentRoutes[index];
    setSelectedRoute(route);

    let travelMode = 'transit';
    const routeType = (route.type || route.mode || '').toLowerCase();
    if (routeType.includes('cab') || routeType.includes('taxi') || routeType.includes('driving') || routeType.includes('car')) {
      travelMode = 'driving';
    } else if (routeType.includes('walk')) {
      travelMode = 'walking';
    }

    const origin = encodeURIComponent(voiceFlowDataRef.current.startLocation);
    const destination = encodeURIComponent(voiceFlowDataRef.current.destination);
    const dirflg = travelMode === 'walking' ? 'w' : travelMode === 'driving' ? 'd' : 'r';
    const googleMapsUrl = `https://maps.google.com/maps?saddr=${origin}&daddr=${destination}&dirflg=${dirflg}`;

    await Linking.openURL(googleMapsUrl).catch(() => {});
    await speak(`Opening Route ${index + 1} in Google Maps.`, false, false);

    setVoiceFlowStep(null);
    voiceFlowStepRef.current = null;
  }, [speak]);

  // ==================== VOICE: performRouteSearch ====================
  const performRouteSearch = useCallback(async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const mockRoutes = [
        {
          mode: 'Walk + Metro',
          type: 'Metro',
          duration: '25 mins',
          distance: '8.9 km',
          cost: '\u20B920',
          estimatedTime: 25,
          accessibilityScore: 100,
          accessibility: 'High',
          hasLift: true,
          busRoutes: [],
          realTimeInfo: { nextMetroArrival: '2 mins', crowdLevel: 'Low' },
          accessibilityFeatures: ['Elevator', 'Tactile Paths', 'Audio Announcements', 'Wheelchair Ramp'],
          carbonFootprint: '0.2 kg CO2',
        },
        {
          mode: 'Bus Route',
          type: 'Low-floor bus',
          duration: '35 mins',
          distance: '12.3 km',
          cost: '\u20B915',
          estimatedTime: 35,
          accessibilityScore: 75,
          accessibility: 'Medium',
          hasLift: false,
          busRoutes: ['M70', 'S12'],
          realTimeInfo: { nextBusArrival: '5 mins', crowdLevel: 'Medium' },
          accessibilityFeatures: ['Low-floor Entry', 'Priority Seating'],
          carbonFootprint: '0.5 kg CO2',
        },
        {
          mode: 'Wheelchair Accessible Cab',
          type: 'Wheelchair accessible cab',
          duration: '20 mins',
          distance: '10.1 km',
          cost: '\u20B9250',
          estimatedTime: 20,
          accessibilityScore: 95,
          accessibility: 'High',
          hasLift: false,
          busRoutes: [],
          realTimeInfo: { crowdLevel: 'Low' },
          accessibilityFeatures: ['Wheelchair Support', 'Door-to-door Service', 'Ramp Access'],
          carbonFootprint: '1.2 kg CO2',
        },
      ];

      setRoutes(mockRoutes);
      routesRef.current = mockRoutes;
      setVoiceFlowData(prev => ({ ...prev, _lastRoutes: mockRoutes }));
      voiceFlowDataRef.current = { ...voiceFlowDataRef.current, _lastRoutes: mockRoutes };
      setVoiceFlowStep('SELECT_ROUTE');
      voiceFlowStepRef.current = 'SELECT_ROUTE';

      let announcement = `I found ${mockRoutes.length} accessible routes. `;
      announcement += `Route 1. ${mockRoutes[0].type}${mockRoutes[0].hasLift ? ' with lift access' : ''}. Travel time ${mockRoutes[0].estimatedTime} minutes. `;
      announcement += `Route 2. ${mockRoutes[1].type}. Travel time ${mockRoutes[1].estimatedTime} minutes. `;
      announcement += `Route 3. ${mockRoutes[2].type}. Travel time ${mockRoutes[2].estimatedTime} minutes. `;
      announcement += 'Say the route number to continue.';
      await speak(announcement, false, false);
    } catch (err) {
      await speak('No routes found. Try again.', true, false);
      setVoiceFlowStep('BOTH_LOCKED');
      voiceFlowStepRef.current = 'BOTH_LOCKED';
    } finally {
      setIsLoading(false);
    }
  }, [speak]);

  // ==================== VOICE: repeatCurrentStepMessage ====================
  const repeatCurrentStepMessage = useCallback(async () => {
    const step = voiceFlowStepRef.current;
    const data = voiceFlowDataRef.current;
    switch (step) {
      case 'START_LOCATION': await speak('Where are you starting from?', true, false); break;
      case 'PICK_START_MATCH': await speak('Say Option 1, 2, or 3', true, false); break;
      case 'CONFIRM_START': await speak(`${data.startLocation}, yes or no?`, true, false); break;
      case 'DESTINATION': await speak('Where do you want to go?', true, false); break;
      case 'PICK_DEST_MATCH': await speak('Say Option 1, 2, or 3', true, false); break;
      case 'CONFIRM_DESTINATION': await speak(`${data.destination}, yes or no?`, true, false); break;
      case 'CHOOSE_MODE': await speak('Walk or Public Transport?', true, false); break;
      case 'BOTH_LOCKED': await speak('Say Find Accessible Routes.', true, false); break;
      case 'SELECT_ROUTE': {
        const rts = voiceFlowDataRef.current._lastRoutes;
        if (rts && rts.length > 0) {
          let msg = `Route 1. ${rts[0].type}${rts[0].hasLift ? ' with lift access' : ''}. Travel time ${rts[0].estimatedTime} minutes. `;
          msg += `Route 2. ${rts[1].type}. Travel time ${rts[1].estimatedTime} minutes. `;
          msg += `Route 3. ${rts[2].type}. Travel time ${rts[2].estimatedTime} minutes. `;
          msg += 'Say the route number to continue.';
          await speak(msg, true, false);
        } else {
          await speak('Say 1, 2, or 3 to select a route.', true, false);
        }
        break;
      }
      default: await speak('Say Repeat', true, false);
    }
  }, [speak]);

  // ==================== VOICE FLOW COMMAND HANDLER ====================
  const handleVoiceFlowCommand = useCallback(async (transcript) => {
    const command = transcript.toLowerCase().trim();
    const currentStep = voiceFlowStepRef.current;
    const currentData = voiceFlowDataRef.current;

    // MENU — global command, available from any screen
    if (command.includes('menu')) {
      const { MENU_PROMPT, handleMenuNavigation } = require('../utils/voiceUtils');
      await speak(MENU_PROMPT, true, false);
      return;
    }

    // EMERGENCY
    if (command.includes('emergency') || command.includes('help me')) {
      await speak('Emergency mode activated. Calling emergency contact.', true, false);
      return;
    }

    // REPEAT
    if (command.includes('repeat') || command.includes('say again') || command.includes('again')) {
      await repeatCurrentStepMessage();
      return;
    }

    // CHANGE START
    if (command.includes('change starting') || command.includes('change from') || command.includes('change start')) {
      setFromLocked(false);
      setFromLocation('');
      setVoiceFlowStep('START_LOCATION');
      voiceFlowStepRef.current = 'START_LOCATION';
      setVoiceFlowData(prev => ({ ...prev, startLocation: '' }));
      voiceFlowDataRef.current = { ...voiceFlowDataRef.current, startLocation: '' };
      await speak('Tell me new starting location.', false, false);
      return;
    }

    // CHANGE DESTINATION
    if (command.includes('change destination') || command.includes('change to location') || command.includes('change where')) {
      setToLocked(false);
      setToLocation('');
      setVoiceFlowStep('DESTINATION');
      voiceFlowStepRef.current = 'DESTINATION';
      setVoiceFlowData(prev => ({ ...prev, destination: '' }));
      voiceFlowDataRef.current = { ...voiceFlowDataRef.current, destination: '' };
      await speak('Tell me new destination.', false, false);
      return;
    }

    // MENU PAGE NAVIGATION — after user heard menu, they say a page name
    {
      const { handleMenuNavigation } = require('../utils/voiceUtils');
      const handled = await handleMenuNavigation(speak, navigation, 'Navigate', command);
      if (handled) return;
    }

    // ========== START_LOCATION ==========
    if (currentStep === 'START_LOCATION') {
      if (command.includes('find') || command.includes('search') || command.includes('book')) {
        await speak('First, tell me your starting location', false, false);
        return;
      }
      const location = transcript.trim();
      if (location.length < 2) {
        await speak('Could not catch that, say your starting location again', false, false);
        return;
      }
      const { matches, bestMatch } = matchLocationFromDataset(location);
      if (!bestMatch) {
        await speak(`Could not find ${location}, try again`, false, false);
        return;
      }
      if (matches.length === 1 || bestMatch.score >= 0.85) {
        setVoiceFlowData(prev => ({ ...prev, startLocation: bestMatch.name }));
        voiceFlowDataRef.current = { ...voiceFlowDataRef.current, startLocation: bestMatch.name };
        setVoiceFlowStep('CONFIRM_START');
        voiceFlowStepRef.current = 'CONFIRM_START';
        await speak(`Starting from ${bestMatch.name}, correct?`, false, false);
      } else {
        const topOptions = matches.slice(0, 3);
        setVoiceFlowData(prev => ({ ...prev, pendingMatches: topOptions }));
        voiceFlowDataRef.current = { ...voiceFlowDataRef.current, pendingMatches: topOptions };
        setVoiceFlowStep('PICK_START_MATCH');
        voiceFlowStepRef.current = 'PICK_START_MATCH';
        let msg = '';
        topOptions.forEach((m, i) => { msg += `Option ${i + 1}, ${m.name}, `; });
        msg += 'which one?';
        await speak(msg, false, false);
      }
      return;
    }

    // ========== PICK_START_MATCH ==========
    if (currentStep === 'PICK_START_MATCH') {
      const pending = currentData.pendingMatches || [];
      let picked = null;
      if (command.includes('1') || command.includes('one') || command.includes('first')) picked = pending[0];
      else if (command.includes('2') || command.includes('two') || command.includes('second')) picked = pending[1];
      else if (command.includes('3') || command.includes('three') || command.includes('third')) picked = pending[2];
      if (picked) {
        setVoiceFlowData(prev => ({ ...prev, startLocation: picked.name, pendingMatches: [] }));
        voiceFlowDataRef.current = { ...voiceFlowDataRef.current, startLocation: picked.name, pendingMatches: [] };
        setVoiceFlowStep('CONFIRM_START');
        voiceFlowStepRef.current = 'CONFIRM_START';
        await speak(`Starting from ${picked.name}, correct?`, false, false);
      } else {
        await speak('Say Option 1, 2, or 3', false, false);
      }
      return;
    }

    // ========== CONFIRM_START ==========
    if (currentStep === 'CONFIRM_START') {
      if (command.includes('yes') || command.includes('correct') || command.includes('confirm') || command.includes('right') || command.includes('yeah') || command.includes('yep') || command.includes('sure') || command.includes('okay') || command.includes('ok')) {
        const loc = currentData.startLocation;
        setFromLocation(loc);
        setFromLocked(true);
        await speak(`Got it, ${loc}, now where do you want to go?`, false, false);
        setVoiceFlowStep('DESTINATION');
        voiceFlowStepRef.current = 'DESTINATION';
      } else if (command.includes('no') || command.includes('wrong') || command.includes('incorrect') || command.includes('nope') || command.includes('change')) {
        setVoiceFlowStep('START_LOCATION');
        voiceFlowStepRef.current = 'START_LOCATION';
        setVoiceFlowData(prev => ({ ...prev, startLocation: '' }));
        voiceFlowDataRef.current = { ...voiceFlowDataRef.current, startLocation: '' };
        await speak('Okay, say your starting location again', false, false);
      } else {
        // Check if mic echoed the location name — ignore silently to prevent loop
        const locLower = (currentData.startLocation || '').toLowerCase();
        if (locLower && (command.includes(locLower) || locLower.includes(command)) && command.length > 2) {
          console.log('[VOICE] Echo detected in CONFIRM_START, re-prompting once');
          await speak('Say Yes to confirm, or No to change.', false, false);
        } else {
          await speak(`${currentData.startLocation}, yes or no?`, false, false);
        }
      }
      return;
    }

    // ========== DESTINATION ==========
    if (currentStep === 'DESTINATION') {
      if (command.includes('find') || command.includes('search') || command.includes('book')) {
        await speak('Tell me your destination first', false, false);
        return;
      }
      const location = transcript.trim();
      if (location.length < 2) {
        await speak('Could not catch that, say your destination again', false, false);
        return;
      }
      const { matches, bestMatch } = matchLocationFromDataset(location);
      if (!bestMatch) {
        await speak(`Could not find ${location}, try again`, false, false);
        return;
      }
      if (matches.length === 1 || bestMatch.score >= 0.85) {
        setVoiceFlowData(prev => ({ ...prev, destination: bestMatch.name }));
        voiceFlowDataRef.current = { ...voiceFlowDataRef.current, destination: bestMatch.name };
        setVoiceFlowStep('CONFIRM_DESTINATION');
        voiceFlowStepRef.current = 'CONFIRM_DESTINATION';
        await speak(`Going to ${bestMatch.name}, correct?`, false, false);
      } else {
        const topOptions = matches.slice(0, 3);
        setVoiceFlowData(prev => ({ ...prev, pendingMatches: topOptions }));
        voiceFlowDataRef.current = { ...voiceFlowDataRef.current, pendingMatches: topOptions };
        setVoiceFlowStep('PICK_DEST_MATCH');
        voiceFlowStepRef.current = 'PICK_DEST_MATCH';
        let msg = '';
        topOptions.forEach((m, i) => { msg += `Option ${i + 1}, ${m.name}, `; });
        msg += 'which one?';
        await speak(msg, false, false);
      }
      return;
    }

    // ========== PICK_DEST_MATCH ==========
    if (currentStep === 'PICK_DEST_MATCH') {
      const pending = currentData.pendingMatches || [];
      let picked = null;
      if (command.includes('1') || command.includes('one') || command.includes('first')) picked = pending[0];
      else if (command.includes('2') || command.includes('two') || command.includes('second')) picked = pending[1];
      else if (command.includes('3') || command.includes('three') || command.includes('third')) picked = pending[2];
      if (picked) {
        setVoiceFlowData(prev => ({ ...prev, destination: picked.name, pendingMatches: [] }));
        voiceFlowDataRef.current = { ...voiceFlowDataRef.current, destination: picked.name, pendingMatches: [] };
        setVoiceFlowStep('CONFIRM_DESTINATION');
        voiceFlowStepRef.current = 'CONFIRM_DESTINATION';
        await speak(`Going to ${picked.name}, correct?`, false, false);
      } else {
        await speak('Say Option 1, 2, or 3', false, false);
      }
      return;
    }

    // ========== CONFIRM_DESTINATION ==========
    if (currentStep === 'CONFIRM_DESTINATION') {
      if (command.includes('yes') || command.includes('correct') || command.includes('confirm') || command.includes('right') || command.includes('yeah') || command.includes('yep') || command.includes('sure') || command.includes('okay') || command.includes('ok')) {
        const loc = currentData.destination;
        setToLocation(loc);
        setToLocked(true);
        await speak(`Got it, ${loc}, walk or public transport?`, false, false);
        setVoiceFlowStep('CHOOSE_MODE');
        voiceFlowStepRef.current = 'CHOOSE_MODE';
      } else if (command.includes('no') || command.includes('wrong') || command.includes('incorrect') || command.includes('nope') || command.includes('change')) {
        setVoiceFlowStep('DESTINATION');
        voiceFlowStepRef.current = 'DESTINATION';
        setVoiceFlowData(prev => ({ ...prev, destination: '' }));
        voiceFlowDataRef.current = { ...voiceFlowDataRef.current, destination: '' };
        await speak('Okay, say your destination again', false, false);
      } else {
        // Check if mic echoed the location name — ignore silently to prevent loop
        const locLower = (currentData.destination || '').toLowerCase();
        if (locLower && (command.includes(locLower) || locLower.includes(command)) && command.length > 2) {
          console.log('[VOICE] Echo detected in CONFIRM_DESTINATION, re-prompting once');
          await speak('Say Yes to confirm, or No to change.', false, false);
        } else {
          await speak(`${currentData.destination}, yes or no?`, false, false);
        }
      }
      return;
    }

    // ========== CHOOSE_MODE ==========
    if (currentStep === 'CHOOSE_MODE') {
      if (command.includes('walk') || command.includes('walking') || command.includes('on foot') || command.includes('by foot')) {
        const addChennai = (loc) => {
          const lower = loc.toLowerCase();
          return (lower.includes('chennai') || lower.includes('tamil nadu')) ? loc : `${loc}, Chennai, Tamil Nadu`;
        };
        const origin = encodeURIComponent(addChennai(currentData.startLocation));
        const dest = encodeURIComponent(addChennai(currentData.destination));
        const googleMapsUrl = `https://maps.google.com/maps?saddr=${origin}&daddr=${dest}&dirflg=w`;
        await Linking.openURL(googleMapsUrl).catch(() => {});
        await speak('Opening walking directions in Google Maps.', false, false);
        setVoiceFlowStep(null);
        voiceFlowStepRef.current = null;
        return;
      } else if (command.includes('public') || command.includes('transport') || command.includes('bus') || command.includes('metro') || command.includes('train')) {
        await speak('Public transport, say Find Routes', false, false);
        setVoiceFlowStep('BOTH_LOCKED');
        voiceFlowStepRef.current = 'BOTH_LOCKED';
      } else {
        await speak('Say Walk or Public Transport', false, false);
      }
      return;
    }

    // ========== BOTH_LOCKED ==========
    if (currentStep === 'BOTH_LOCKED') {
      if (command.includes('find') || command.includes('route') || command.includes('search') || command.includes('go')) {
        await speak('Searching accessible routes.', false, false);
        setVoiceFlowStep('FINDING_ROUTES');
        voiceFlowStepRef.current = 'FINDING_ROUTES';
        await performRouteSearch();
      } else {
        await speak('Say Find Accessible Routes.', false, false);
      }
      return;
    }

    // ========== SELECT_ROUTE ==========
    if (currentStep === 'SELECT_ROUTE') {
      const cleaned = command.replace(/[^a-z0-9\s]/g, '').trim();
      if (cleaned.includes('open map') || cleaned.includes('open google') || cleaned.includes('navigate')) {
        await speak('Please select a route number first.', false, false);
        return;
      }
      if (cleaned === '1' || cleaned === 'one' || cleaned.includes('route 1') || cleaned.includes('first') || command.includes('1')) {
        selectRouteByVoice(0);
      } else if (cleaned === '2' || cleaned === 'two' || cleaned.includes('route 2') || cleaned.includes('second') || command.includes('2')) {
        selectRouteByVoice(1);
      } else if (cleaned === '3' || cleaned === 'three' || cleaned.includes('route 3') || cleaned.includes('third') || command.includes('3')) {
        selectRouteByVoice(2);
      } else {
        await speak('Invalid selection. Say 1, 2, or 3.', false, false);
      }
      return;
    }

    // ========== FINDING_ROUTES ==========
    if (currentStep === 'FINDING_ROUTES') {
      await speak('Still loading, please wait', false, false);
      return;
    }

    // DEFAULT
    const stepHints = {
      'START_LOCATION': 'Say a location name like T Nagar or Marina Beach',
      'PICK_START_MATCH': 'Say Option 1, 2, or 3',
      'CONFIRM_START': 'Say Yes or No',
      'DESTINATION': 'Say your destination name',
      'PICK_DEST_MATCH': 'Say Option 1, 2, or 3',
      'CONFIRM_DESTINATION': 'Say Yes or No',
      'CHOOSE_MODE': 'Say Walk or Public Transport',
      'BOTH_LOCKED': 'Say Find Routes',
      'SELECT_ROUTE': 'Say 1, 2, or 3 to select a route',
    };
    const hint = stepHints[currentStep] || 'Say Repeat';
    await speak(hint, false, false);
  }, [speak, selectRouteByVoice, performRouteSearch, repeatCurrentStepMessage]);

  // Store ref
  useEffect(() => {
    handleVoiceFlowCommandRef.current = handleVoiceFlowCommand;
  }, [handleVoiceFlowCommand]);

  // ==================== RESET ON MOUNT ====================
  useEffect(() => {
    setFromLocation('');
    setToLocation('');
    setRoutes([]);
    setSelectedRoute(null);
    setFromLocked(false);
    setToLocked(false);
    setError('');
    setVoiceFlowStep(null);
    voiceFlowStepRef.current = null;
    setVoiceFlowData({ startLocation: '', destination: '', selectedRouteIndex: null, pendingMatches: [] });
    voiceFlowDataRef.current = { startLocation: '', destination: '', selectedRouteIndex: null, pendingMatches: [] };
  }, []);

  // ==================== VOICE MODE SETUP ====================
  useEffect(() => {
    if (!isVoiceMode) {
      // Clean up when leaving voice mode
      setVoiceSetupComplete(false);
      voiceSetupStartedRef.current = false;
      setVoiceFlowStep(null);
      voiceFlowStepRef.current = null;
      setFromLocked(false);
      setToLocked(false);
      stopListening();
      return;
    }

    // Guard against double initialization
    if (voiceSetupComplete || voiceSetupStartedRef.current) {
      return;
    }
    voiceSetupStartedRef.current = true;

    const startVoiceFlow = async () => {
      try {
        await setupSpeechRecognition((transcript) => {
          if (handleVoiceFlowCommandRef.current) {
            handleVoiceFlowCommandRef.current(transcript);
          }
        });

        await new Promise(resolve => setTimeout(resolve, 500));
        await speak('Where are you starting from?', true, false);
        setVoiceFlowStep('START_LOCATION');
        voiceFlowStepRef.current = 'START_LOCATION';
        await new Promise(resolve => setTimeout(resolve, 400));
        startListening();
        setVoiceSetupComplete(true);
      } catch (err) {
        console.error('Error starting voice flow:', err);
        voiceSetupStartedRef.current = false;
      }
    };

    startVoiceFlow();
  }, [isVoiceMode, voiceSetupComplete, setupSpeechRecognition, speak, startListening, stopListening]);

  // ==================== CLEANUP ON UNMOUNT ====================
  useEffect(() => {
    return () => {
      if (stopListening) stopListening();
    };
  }, [stopListening]);

  // ==================== MANUAL SEARCH ====================
  const handleSearch = async () => {
    if (!fromLocation || !toLocation) {
      setError(getText('pleaseEnterBothLocations') || 'Please enter both locations');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const routeOptions = await LocationService.generateRouteOptions(fromLocation, toLocation);
      setRoutes(routeOptions);
      routesRef.current = routeOptions;
    } catch (err) {
      setError(getText('failedToFindRoutes') || 'Failed to find routes');
    } finally {
      setIsLoading(false);
    }
  };

  const clearNavigationData = () => {
    setFromLocation('');
    setToLocation('');
    setRoutes([]);
    setSelectedRoute(null);
    setFromLocked(false);
    setToLocked(false);
    setError('');
    setVoiceFlowStep(null);
    voiceFlowStepRef.current = null;
    setVoiceFlowData({ startLocation: '', destination: '', selectedRouteIndex: null, pendingMatches: [] });
    voiceFlowDataRef.current = { startLocation: '', destination: '', selectedRouteIndex: null, pendingMatches: [] };
  };

  const openRouteInGoogleMaps = (route) => {
    const start = encodeURIComponent(fromLocation);
    const end = encodeURIComponent(toLocation);
    Linking.openURL(`https://maps.google.com/maps?saddr=${start}&daddr=${end}&dirflg=r`).catch(() => {});
  };

  // ==================== LOCATION PICKER (A-Z like web) ====================
  const [selectedCategory, setSelectedCategory] = useState('All');
  const sectionListRef = useRef(null);

  const filteredLocations = useMemo(() => {
    let locs = CHENNAI_LOCATIONS;
    if (selectedCategory !== 'All') {
      locs = locs.filter(l => l.category === selectedCategory);
    }
    if (locationSearch.length > 0) {
      const q = locationSearch.toLowerCase();
      locs = locs.filter(l =>
        l.name.toLowerCase().includes(q) || l.category.toLowerCase().includes(q)
      );
    }
    return locs.sort((a, b) => a.name.localeCompare(b.name));
  }, [locationSearch, selectedCategory]);

  const groupedSections = useMemo(() => {
    const groups = {};
    filteredLocations.forEach(loc => {
      const letter = loc.name[0].toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(loc);
    });
    return ALPHABET
      .filter(l => groups[l])
      .map(l => ({ title: l, data: groups[l] }));
  }, [filteredLocations]);

  const availableLetters = useMemo(() => {
    return new Set(groupedSections.map(s => s.title));
  }, [groupedSections]);

  const scrollToLetter = (letter) => {
    const idx = groupedSections.findIndex(s => s.title === letter);
    if (idx >= 0 && sectionListRef.current) {
      sectionListRef.current.scrollToLocation({ sectionIndex: idx, itemIndex: 0, animated: true, viewOffset: 40 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const useCurrentLocation = async () => {
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required');
        return;
      }
      const loc = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced });
      const [geo] = await ExpoLocation.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      const address = geo ? [geo.name, geo.street, geo.district, geo.city].filter(Boolean).join(', ') : `${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`;
      selectLocation(address);
    } catch (err) {
      Alert.alert('Location Error', 'Could not get your current location');
    }
  };

  const CATEGORIES = ['All', 'Metro Station', 'Railway Station', 'Hospital', 'Shopping', 'Education', 'Landmark', 'Bus Stop', 'Airport', 'IT Park', 'Beach', 'Area', 'Road'];

  const selectLocation = (locName) => {
    const name = typeof locName === 'object' ? (locName.name || String(locName)) : String(locName || '');
    if (showLocationPicker === 'from') {
      setFromLocation(name);
    } else {
      setToLocation(name);
    }
    setShowLocationPicker(null);
    setLocationSearch('');
    setSelectedCategory('All');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // ==================== ROUTE ICON ====================
  const getRouteIcon = (mode) => {
    if (mode.includes('Bus')) return '🚌';
    if (mode.includes('Metro')) return '🚇';
    if (mode.includes('Walk')) return '🚶';
    if (mode.includes('Cab')) return '🚕';
    return '🚗';
  };

  const getAccessibilityColor = (score) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  // ==================== STYLES ====================
  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bgPrimary },
    scrollContent: { padding: 16, paddingBottom: 100 },
    // Header
    headerCard: {
      padding: 20,
      borderRadius: 16,
      marginBottom: 16,
      backgroundColor: '#667eea',
    },
    headerTitle: { fontSize: 24, fontWeight: '700', color: '#fff', textAlign: 'center' },
    headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginTop: 4 },
    // Voice indicator
    voiceBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isListening ? theme.accentColor : 'rgba(0,0,0,0.7)',
      padding: 10,
      borderRadius: 25,
      marginBottom: 12,
    },
    voiceBannerText: { color: '#fff', fontSize: 13, fontWeight: '500', marginLeft: 8 },
    voiceDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: isListening ? '#4caf50' : '#fff',
    },
    // Transport tabs
    tabRow: {
      flexDirection: 'row',
      backgroundColor: theme.bgSecondary,
      borderRadius: 16,
      marginBottom: 16,
      overflow: 'hidden',
    },
    tab: {
      flex: 1,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabActive: { backgroundColor: theme.cardBg },
    tabText: { fontSize: 13, color: theme.textSecondary },
    tabTextActive: { fontSize: 13, color: theme.textPrimary, fontWeight: '600' },
    // Input section
    sectionCard: {
      backgroundColor: theme.cardBg,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.borderColor,
    },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: theme.textPrimary, marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '500', color: theme.textPrimary, marginBottom: 6 },
    inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    input: {
      flex: 1,
      padding: 12,
      borderWidth: 2,
      borderRadius: 8,
      fontSize: 14,
      color: theme.textPrimary,
      backgroundColor: theme.inputBg,
    },
    inputLocked: { borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.08)', fontWeight: '600' },
    inputNormal: { borderColor: theme.borderColor },
    lockBadge: {
      marginLeft: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: '#10B981',
    },
    lockText: { color: '#fff', fontWeight: '600', fontSize: 13 },
    browseBtn: {
      marginLeft: 8,
      padding: 12,
      borderRadius: 8,
      backgroundColor: '#667eea',
    },
    browseBtnText: { color: '#fff', fontSize: 16 },
    // Buttons
    searchBtn: {
      flex: 1,
      backgroundColor: theme.accentColor,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchBtnDisabled: { opacity: 0.5 },
    searchBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    clearBtn: {
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.borderColor,
      marginLeft: 10,
    },
    clearBtnText: { color: theme.textSecondary, fontSize: 14, fontWeight: '500' },
    errorBox: {
      padding: 12,
      marginBottom: 14,
      backgroundColor: '#ffebee',
      borderRadius: 8,
    },
    errorText: { color: '#c62828', fontSize: 14 },
    // Route card
    routeCard: {
      backgroundColor: theme.cardBg,
      borderRadius: 16,
      padding: 20,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: theme.borderColor,
    },
    routeHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    routeIcon: { fontSize: 22, marginRight: 8 },
    routeTitle: { fontSize: 17, fontWeight: '600', color: theme.textPrimary },
    routeStats: { flexDirection: 'row', marginTop: 8 },
    statBlock: { marginRight: 24 },
    statLabel: { fontSize: 11, color: theme.textSecondary, textTransform: 'uppercase' },
    statValue: { fontSize: 15, fontWeight: '600', color: theme.textPrimary },
    costValue: { fontSize: 15, fontWeight: '600', color: '#22c55e' },
    accessBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
      alignSelf: 'flex-start',
    },
    accessBadgeText: { fontSize: 11, fontWeight: '600' },
    // Live info section
    liveBox: {
      backgroundColor: theme.bgTertiary,
      padding: 12,
      borderRadius: 8,
      marginVertical: 10,
      borderWidth: 1,
      borderColor: theme.borderColor,
    },
    liveHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    liveTitle: { fontSize: 11, fontWeight: '600', color: theme.textPrimary },
    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
    liveRow: { flexDirection: 'row', flexWrap: 'wrap' },
    liveItem: { marginRight: 20, marginBottom: 4 },
    liveLabel: { fontSize: 11, color: theme.textSecondary },
    liveValue: { fontSize: 12, fontWeight: '600', color: theme.textPrimary },
    // Features
    featureRow: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 8 },
    featureTag: {
      backgroundColor: '#dcfce7',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      marginRight: 6,
      marginBottom: 6,
    },
    featureText: { fontSize: 11, fontWeight: '500', color: '#166534' },
    // Route actions
    routeActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 14,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: theme.borderColor,
    },
    carbonText: { fontSize: 12, color: theme.textSecondary },
    mapBtn: {
      backgroundColor: '#4285F4',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    mapBtnText: { color: '#fff', fontSize: 13, fontWeight: '600', marginLeft: 4 },
    // Bus route tags
    busTag: {
      backgroundColor: '#007bff',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
      marginLeft: 6,
    },
    busTagText: { color: '#fff', fontSize: 11, fontWeight: '600' },
    // Modal — A-Z Location Picker
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.cardBg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      height: '90%',
      paddingTop: 16,
      paddingHorizontal: 12,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 8,
      marginBottom: 12,
    },
    modalTitle: { fontSize: 18, fontWeight: '700', color: theme.textPrimary },
    modalCloseBtnText: { color: '#667eea', fontWeight: '600', fontSize: 15, padding: 4 },
    modalSearchInput: {
      padding: 12,
      borderRadius: 10,
      backgroundColor: theme.inputBg,
      borderWidth: 1,
      borderColor: theme.borderColor,
      fontSize: 14,
      color: theme.textPrimary,
      marginBottom: 8,
      marginHorizontal: 4,
    },
    // Use Current Location
    currentLocBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      marginHorizontal: 4,
      marginBottom: 8,
      borderWidth: 1.5,
      borderColor: '#667eea',
      borderStyle: 'dashed',
      borderRadius: 10,
    },
    currentLocIcon: { fontSize: 16, marginRight: 8 },
    currentLocText: { fontSize: 14, color: '#667eea', fontWeight: '600' },
    // Category filter
    categoryScroll: { maxHeight: 40, marginBottom: 8 },
    categoryPill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: theme.bgSecondary,
      marginRight: 6,
    },
    categoryPillActive: { backgroundColor: '#667eea' },
    categoryPillText: { fontSize: 12, color: theme.textSecondary },
    categoryPillTextActive: { fontSize: 12, color: '#fff', fontWeight: '600' },
    // Section headers
    sectionHeader: {
      backgroundColor: theme.bgSecondary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderColor,
    },
    sectionHeaderText: { fontSize: 14, fontWeight: '700', color: theme.textPrimary },
    // Location items
    locationItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderColor,
    },
    catDot: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    locationItemText: { fontSize: 14, fontWeight: '500', color: theme.textPrimary },
    locationCategoryText: { fontSize: 11, color: theme.textSecondary, marginTop: 1 },
    // A-Z sidebar
    alphabetBar: {
      width: 22,
      paddingVertical: 4,
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    alphabetBtn: { paddingVertical: 1.5 },
    alphabetText: { fontSize: 10, fontWeight: '700', color: '#667eea' },
    alphabetTextDisabled: { color: theme.textSecondary, opacity: 0.35 },
    modalFooter: {
      textAlign: 'center',
      fontSize: 12,
      color: theme.textSecondary,
      paddingVertical: 8,
    },
    // Voice flow step indicator
    voiceStepCard: {
      backgroundColor: theme.accentColor + '15',
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.accentColor + '40',
    },
    voiceStepText: { fontSize: 14, fontWeight: '500', color: theme.accentColor, textAlign: 'center' },
  });

  // ==================== RENDER ====================
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.headerCard}>
          <Text style={styles.headerTitle}>🧭 {getText('navigate') || 'Navigate'} {getText('chennai') || 'Chennai'}</Text>
          <Text style={styles.headerSubtitle}>{getText('discoverAccessibleRoutes') || 'Discover accessible routes across Chennai'}</Text>
        </View>

        {/* Voice Mode Indicator */}
        {isVoiceMode && (
          <View style={styles.voiceBanner}>
            <View style={styles.voiceDot} />
            <Text style={styles.voiceBannerText}>
              {voiceFeedback || (isListening ? 'Listening...' : 'Voice Mode Active')}
            </Text>
          </View>
        )}

        {/* Voice Flow Step Indicator */}
        {isVoiceMode && voiceFlowStep && (
          <View style={styles.voiceStepCard}>
            <Text style={styles.voiceStepText}>
              {voiceFlowStep === 'START_LOCATION' && '📍 Say your starting location'}
              {voiceFlowStep === 'PICK_START_MATCH' && '🔢 Say Option 1, 2, or 3'}
              {voiceFlowStep === 'CONFIRM_START' && `✅ ${String(voiceFlowData.startLocation || '')} — Say Yes or No`}
              {voiceFlowStep === 'DESTINATION' && '📍 Say your destination'}
              {voiceFlowStep === 'PICK_DEST_MATCH' && '🔢 Say Option 1, 2, or 3'}
              {voiceFlowStep === 'CONFIRM_DESTINATION' && `✅ ${String(voiceFlowData.destination || '')} — Say Yes or No`}
              {voiceFlowStep === 'CHOOSE_MODE' && '🚶 Walk or 🚌 Public Transport?'}
              {voiceFlowStep === 'BOTH_LOCKED' && '🔍 Say "Find Routes"'}
              {voiceFlowStep === 'FINDING_ROUTES' && '⏳ Searching routes...'}
              {voiceFlowStep === 'SELECT_ROUTE' && '🛤️ Say 1, 2, or 3'}
            </Text>
          </View>
        )}

        {/* Transport Mode Tabs */}
        <View style={styles.tabRow}>
          {[
            { key: 'general', label: '🚗 General' },
            { key: 'metro', label: '🚇 Metro' },
            { key: 'bus', label: '🚌 Bus' },
          ].map(t => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, transportMode === t.key && styles.tabActive]}
              onPress={() => {
                setTransportMode(t.key);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={transportMode === t.key ? styles.tabTextActive : styles.tabText}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Conditional Content Based on Transport Mode */}
        {transportMode === 'metro' ? (
          <MetroNavigation />
        ) : transportMode === 'bus' ? (
          <MTCBusNavigation />
        ) : (
        <>
        {/* Location Inputs */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{getText('findRoute') || 'Find Your Route'}</Text>

          {/* FROM */}
          <Text style={styles.label}>{getText('from') || 'From'}</Text>
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={[styles.input, fromLocked ? styles.inputLocked : styles.inputNormal]}
              onPress={() => {
                if (isVoiceMode && fromLocked) return;
                setShowLocationPicker('from');
              }}
              disabled={isVoiceMode && fromLocked}
            >
              <Text style={{ color: fromLocation ? theme.textPrimary : theme.textSecondary, fontSize: 14, fontWeight: fromLocked ? '600' : '400' }}>
                {fromLocation || (getText('enterStartingLocation') || 'Enter starting location')}
              </Text>
            </TouchableOpacity>
            {isVoiceMode && fromLocked && (
              <View style={styles.lockBadge}><Text style={styles.lockText}>🔒</Text></View>
            )}
            {!isVoiceMode && (
              <TouchableOpacity style={styles.browseBtn} onPress={() => setShowLocationPicker('from')}>
                <Text style={styles.browseBtnText}>🔍</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* TO */}
          <Text style={styles.label}>{getText('to') || 'To'}</Text>
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={[styles.input, toLocked ? styles.inputLocked : styles.inputNormal]}
              onPress={() => {
                if (isVoiceMode && toLocked) return;
                setShowLocationPicker('to');
              }}
              disabled={isVoiceMode && toLocked}
            >
              <Text style={{ color: toLocation ? theme.textPrimary : theme.textSecondary, fontSize: 14, fontWeight: toLocked ? '600' : '400' }}>
                {toLocation || (getText('enterDestination') || 'Enter destination')}
              </Text>
            </TouchableOpacity>
            {isVoiceMode && toLocked && (
              <View style={styles.lockBadge}><Text style={styles.lockText}>🔒</Text></View>
            )}
            {!isVoiceMode && (
              <TouchableOpacity style={styles.browseBtn} onPress={() => setShowLocationPicker('to')}>
                <Text style={styles.browseBtnText}>🔍</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Error */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity
              style={[styles.searchBtn, (isLoading || !fromLocation || !toLocation) && styles.searchBtnDisabled]}
              disabled={isLoading || !fromLocation || !toLocation}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                handleSearch();
              }}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.searchBtnText}>🔍 {getText('findRoutes') || 'Find Routes'}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.clearBtn} onPress={clearNavigationData}>
              <Text style={styles.clearBtnText}>🗑️ {getText('delete') || 'Clear'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Route Results */}
        {routes.length > 0 && (
          <View>
            <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>
              {getText('availableRoutes') || 'Available Routes'} ({routes.length})
            </Text>

            {routes.map((route, index) => (
              <View key={route.id || index} style={[styles.routeCard, selectedRoute === route && { borderColor: '#007bff', borderWidth: 2 }]}>
                {/* Route Header */}
                <View style={styles.routeHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={styles.routeIcon}>{getRouteIcon(route.mode || '')}</Text>
                      <Text style={styles.routeTitle}>{route.mode || 'Route'}</Text>
                      {Array.isArray(route.busRoutes) && route.busRoutes.map((br, idx) => (
                        <View key={idx} style={styles.busTag}>
                          <Text style={styles.busTagText}>{br}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={styles.routeStats}>
                      <View style={styles.statBlock}>
                        <Text style={styles.statLabel}>Duration</Text>
                        <Text style={styles.statValue}>{route.duration || '-'}</Text>
                      </View>
                      <View style={styles.statBlock}>
                        <Text style={styles.statLabel}>Distance</Text>
                        <Text style={styles.statValue}>{route.distance || '-'}</Text>
                      </View>
                      <View style={styles.statBlock}>
                        <Text style={styles.statLabel}>Cost</Text>
                        <Text style={styles.costValue}>{route.cost || '-'}</Text>
                      </View>
                    </View>
                  </View>
                  <View>
                    <View style={[styles.accessBadge, { backgroundColor: getAccessibilityColor(route.accessibilityScore || 0) + '20' }]}>
                      <Text style={[styles.accessBadgeText, { color: getAccessibilityColor(route.accessibilityScore || 0) }]}>
                        {route.accessibilityScore || 0}% Accessible
                      </Text>
                    </View>
                    {route.realTimeInfo && (
                      <View style={{ marginTop: 6, alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                          Next: {route.realTimeInfo.nextMetroArrival || route.realTimeInfo.nextBusArrival || '-'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Live Updates */}
                {route.realTimeInfo && (
                  <View style={styles.liveBox}>
                    <View style={styles.liveHeader}>
                      <Text style={styles.liveTitle}>LIVE UPDATES</Text>
                      <View style={styles.liveDot} />
                    </View>
                    <View style={styles.liveRow}>
                      {route.realTimeInfo.nextMetroArrival && (
                        <View style={styles.liveItem}>
                          <Text style={styles.liveLabel}>Next Metro</Text>
                          <Text style={styles.liveValue}>{route.realTimeInfo.nextMetroArrival}</Text>
                        </View>
                      )}
                      {route.realTimeInfo.nextBusArrival && (
                        <View style={styles.liveItem}>
                          <Text style={styles.liveLabel}>Next Bus</Text>
                          <Text style={styles.liveValue}>{route.realTimeInfo.nextBusArrival}</Text>
                        </View>
                      )}
                      <View style={styles.liveItem}>
                        <Text style={styles.liveLabel}>Crowd Level</Text>
                        <Text style={[styles.liveValue, {
                          color: route.realTimeInfo.crowdLevel === 'High' ? '#ef4444' :
                            route.realTimeInfo.crowdLevel === 'Medium' ? '#f59e0b' : '#22c55e'
                        }]}>
                          {route.realTimeInfo.crowdLevel}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Accessibility Features */}
                {route.accessibilityFeatures && route.accessibilityFeatures.length > 0 && (
                  <View style={styles.featureRow}>
                    {route.accessibilityFeatures.slice(0, 4).map((f, i) => (
                      <View key={i} style={styles.featureTag}>
                        <Text style={styles.featureText}>{f}</Text>
                      </View>
                    ))}
                    {route.accessibilityFeatures.length > 4 && (
                      <View style={[styles.featureTag, { backgroundColor: '#f3f4f6' }]}>
                        <Text style={[styles.featureText, { color: '#6b7280' }]}>+{route.accessibilityFeatures.length - 4} more</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Actions */}
                <View style={styles.routeActions}>
                  <Text style={styles.carbonText}>Carbon: {route.carbonFootprint || '-'}</Text>
                  <TouchableOpacity
                    style={styles.mapBtn}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      openRouteInGoogleMaps(route);
                    }}
                  >
                    <Text style={styles.mapBtnText}>🗺️ View on Map</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
        </>
        )}
      </ScrollView>

      {/* Location Picker Modal — A-Z with categories (like web) */}
      <Modal visible={showLocationPicker !== null} transparent animationType="slide" onRequestClose={() => { setShowLocationPicker(null); setLocationSearch(''); setSelectedCategory('All'); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {showLocationPicker === 'from' ? 'Select Starting Location' : 'Select Destination'}
              </Text>
              <TouchableOpacity onPress={() => { setShowLocationPicker(null); setLocationSearch(''); setSelectedCategory('All'); }}>
                <Text style={styles.modalCloseBtnText}>✕ Close</Text>
              </TouchableOpacity>
            </View>

            {/* Search */}
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Search Chennai locations..."
              placeholderTextColor={theme.textSecondary}
              value={locationSearch}
              onChangeText={setLocationSearch}
              autoFocus
            />

            {/* Use Current Location */}
            <TouchableOpacity style={styles.currentLocBtn} onPress={useCurrentLocation}>
              <Text style={styles.currentLocIcon}>📍</Text>
              <Text style={styles.currentLocText}>Use Current Location</Text>
            </TouchableOpacity>

            {/* Category Filter Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={{ paddingHorizontal: 4 }}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryPill, selectedCategory === cat && styles.categoryPillActive]}
                  onPress={() => { setSelectedCategory(cat); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <Text style={[styles.categoryPillText, selectedCategory === cat && styles.categoryPillTextActive]}>
                    {cat === 'All' ? 'All' : `${getCategoryIcon(cat)} ${cat}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Location List + A-Z Index */}
            <View style={{ flex: 1, flexDirection: 'row' }}>
              {/* SectionList */}
              <SectionList
                ref={sectionListRef}
                sections={groupedSections}
                keyExtractor={(item, i) => `${item.name}_${i}`}
                renderSectionHeader={({ section }) => (
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionHeaderText}>{section.title}</Text>
                  </View>
                )}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.locationItem} onPress={() => selectLocation(item.name)}>
                    <View style={[styles.catDot, { backgroundColor: getCategoryColor(item.category) }]}>
                      <Text style={{ fontSize: 12 }}>{getCategoryIcon(item.category)}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.locationItemText}>{item.name}</Text>
                      <Text style={styles.locationCategoryText}>{item.category}</Text>
                    </View>
                  </TouchableOpacity>
                )}
                stickySectionHeadersEnabled
                style={{ flex: 1 }}
                keyboardShouldPersistTaps="handled"
                initialNumToRender={20}
                maxToRenderPerBatch={15}
                windowSize={10}
                ListEmptyComponent={<Text style={{ textAlign: 'center', padding: 20, color: theme.textSecondary }}>No locations found</Text>}
              />

              {/* A-Z Index sidebar */}
              <View style={styles.alphabetBar}>
                {ALPHABET.map(letter => {
                  const available = availableLetters.has(letter);
                  return (
                    <TouchableOpacity
                      key={letter}
                      onPress={() => available && scrollToLetter(letter)}
                      style={styles.alphabetBtn}
                      disabled={!available}
                    >
                      <Text style={[styles.alphabetText, !available && styles.alphabetTextDisabled]}>
                        {letter}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Footer */}
            <Text style={styles.modalFooter}>{filteredLocations.length} locations</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}
