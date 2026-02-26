import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePreferences } from '../context/PreferencesContext';
import {
  useVoiceInterface,
  processVoiceCommand,
  VOICE_MODE_INTRO,
  MENU_PROMPT,
  handleMenuNavigation,
} from '../utils/voiceUtils';
import LocationService from '../services/LocationService';
import MetroService from '../services/MetroService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Haversine distance
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function HomeScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [greeting, setGreeting] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [accessibleRoutes, setAccessibleRoutes] = useState([]);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [voiceSetupComplete, setVoiceSetupComplete] = useState(false);
  const voiceSetupStartedRef = useRef(false);

  const {
    preferences,
    theme,
    getThemeStyles,
    getCardStyles,
    getTextStyles,
    getButtonStyles,
    getText,
  } = usePreferences();
  const isVoiceMode = preferences.mode === 'voice';

  const {
    isListening,
    voiceFeedback,
    speak,
    setupSpeechRecognition,
    startListening,
    stopListening,
  } = useVoiceInterface('Home');

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // Load user and set greeting
  useEffect(() => {
    (async () => {
      const userData = await AsyncStorage.getItem('ac_user');
      const prefs = await AsyncStorage.getItem('ac_prefs');

      if (!userData) {
        if (!prefs) {
          setShowOnboarding(true);
        } else {
          navigation.replace('Login');
        }
        setLoadingLocation(false);
        return;
      }
      setUser(JSON.parse(userData));

      const hour = new Date().getHours();
      if (hour < 12) setGreeting(getText('goodMorning'));
      else if (hour < 18) setGreeting(getText('goodAfternoon'));
      else setGreeting(getText('goodEvening'));
    })();
  }, []);

  // Get location and nearest stations (non-blocking)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const fetchLocation = async () => {
      try {
        setLoadingLocation(true);
        const location = await LocationService.getCurrentLocation();
        setCurrentLocation(location);

        const metroStations = MetroService.METRO_STATIONS || {};
        const allStations = Object.entries(metroStations).map(
          ([name, data]) => ({ name, ...data, type: 'metro' })
        );

        const stationsWithDistance = allStations.map((station) => {
          const distance = calculateDistance(
            location.lat,
            location.lng,
            station.lat,
            station.lng
          );
          return { ...station, distance };
        });

        const nearestStations = stationsWithDistance
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 5);

        const routes = nearestStations.map((station, index) => ({
          id: index + 1,
          destination: station.name,
          type: station.type,
          line: station.line,
          distance: station.distance,
          accessibility: 'High',
          facilities: station.facilities || [],
          estimatedTime: Math.ceil(station.distance * 1.5),
          color: station.line === 'Blue' ? '#3B82F6' : '#10B981',
        }));

        setAccessibleRoutes(routes);
      } catch (error) {
        console.error('Error fetching location:', error);
        setCurrentLocation({ lat: 13.0836, lng: 80.275 });
        setAccessibleRoutes([
          {
            id: 1,
            destination: 'Chennai Central Metro Station',
            type: 'metro',
            line: 'Blue',
            distance: 0,
            accessibility: 'High',
            facilities: ['Elevator', 'Ramps', 'Tactile Paths'],
            estimatedTime: 5,
            color: '#3B82F6',
          },
          {
            id: 2,
            destination: 'Egmore Metro Station',
            type: 'metro',
            line: 'Green',
            distance: 2.5,
            accessibility: 'High',
            facilities: ['Elevator', 'Ramps'],
            estimatedTime: 10,
            color: '#10B981',
          },
        ]);
      } finally {
        if (!cancelled) setLoadingLocation(false);
      }
    };
    fetchLocation();
    return () => { cancelled = true; };
  }, [user]);

  // Voice mode setup
  useEffect(() => {
    if (!isVoiceMode || !user || voiceSetupComplete || voiceSetupStartedRef.current)
      return;
    voiceSetupStartedRef.current = true;

    (async () => {
      await speak(VOICE_MODE_INTRO, true, true);

      await setupSpeechRecognition(async (command) => {
        const result = processVoiceCommand(command);

        if (result.action === 'emergency') {
          speak(
            'Emergency mode activated, calling your emergency contact now',
            true,
            true
          ).then(async () => {
            const prefs = JSON.parse(
              (await AsyncStorage.getItem('ac_prefs')) || '{}'
            );
            if (prefs.emergencyContact) {
              navigation.navigate('Alerts', { emergency: true });
            } else {
              speak(
                'No emergency contact found, please set up your emergency contact in the Settings page',
                true,
                true
              );
            }
          });
          return;
        }

        if (result.action === 'menu') {
          speak(MENU_PROMPT, true, true);
        } else if (result.action === 'navigate') {
          const pageMap = {
            '/navigate': 'Navigate',
            '/alerts': 'Alerts',
            '/community': 'Community',
            '/settings': 'Settings',
            'Navigate': 'Navigate',
            'Alerts': 'Alerts',
            'Community': 'Community',
            'Settings': 'Settings',
            'Home': 'Home',
          };
          const dest = result.destination || 'Navigate';
          const pageName = pageMap[dest] || dest;

          speak(`Opening ${pageName} page`, false, true).then(() => {
            navigation.navigate(pageName);
          });
        } else if (result.action === 'repeat') {
          speak(VOICE_MODE_INTRO, true, true);
        } else if (result.action === 'unknown') {
          // Try menu navigation (user may have said a page name after hearing menu)
          const handled = await handleMenuNavigation(speak, navigation, 'Home', command);
          if (!handled) {
            speak(
              'I did not understand. Say Menu to hear available pages, or say Navigate, Alerts, Community, or Settings.',
              true,
              true
            );
          }
        }
      });

      setTimeout(() => startListening(), 1000);
      setVoiceSetupComplete(true);
    })();
  }, [isVoiceMode, user, voiceSetupComplete]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    navigation.replace('Login');
  };

  const quickActions = [
    {
      title: getText('navigate'),
      desc: 'Find accessible routes',
      screen: 'Navigate',
      icon: '🧭',
      colors: ['#667eea', '#764ba2'],
    },
    {
      title: getText('community'),
      desc: 'Connect & share',
      screen: 'Community',
      icon: '👥',
      colors: ['#f093fb', '#f5576c'],
    },
    {
      title: getText('settings'),
      desc: 'Preferences',
      screen: 'Settings',
      icon: '⚙️',
      colors: ['#4facfe', '#00f2fe'],
    },
  ];

  // === Onboarding Screen ===
  if (showOnboarding) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.bgPrimary }]}>
        <View style={[styles.onboardingLogoWrap, { backgroundColor: theme.accentColor }]}>
          <Text style={styles.onboardingLogoText}>Accessible{'\n'}Chennai</Text>
        </View>
        <Text style={[styles.onboardingTitle, { color: theme.textPrimary }]}>
          Accessible Chennai
        </Text>
        <Text style={[styles.onboardingSub, { color: theme.textSecondary }]}>
          Your inclusive navigation companion
        </Text>

        <View
          style={[
            styles.onboardingCard,
            { backgroundColor: theme.cardBg, borderColor: theme.borderColor, ...theme.shadow },
          ]}
        >
          <Text style={[styles.onboardingWelcome, { color: theme.textPrimary }]}>
            Welcome!
          </Text>
          <Text style={[styles.onboardingMsg, { color: theme.textSecondary }]}>
            {getText('welcomeMessage')}
          </Text>
          <TouchableOpacity
            style={[styles.getStartedBtn, { backgroundColor: theme.accentColor }]}
            onPress={handleOnboardingComplete}
          >
            <Text style={styles.getStartedText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // === Loading State ===
  if (!user) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.bgPrimary }]}>
        <Text style={{ color: theme.textPrimary, fontSize: 16 }}>
          {getText('loading')}
        </Text>
      </View>
    );
  }

  // === Main Home ===
  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim, backgroundColor: theme.bgPrimary }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Voice Mode Indicator */}
        {isVoiceMode && (
          <View
            style={[
              styles.voiceBadge,
              { backgroundColor: isListening ? theme.accentColor : 'rgba(0,0,0,0.8)' },
            ]}
          >
            <Text style={styles.voiceBadgeIcon}>🎤</Text>
            <Text style={styles.voiceBadgeText} numberOfLines={1}>
              {voiceFeedback || (isListening ? 'Listening...' : 'Voice Mode Active')}
            </Text>
          </View>
        )}

        {/* Welcome Section */}
        <View
          style={[
            styles.welcomeCard,
            {
              backgroundColor:
                preferences.theme === 'dark'
                  ? 'rgba(30,41,59,0.95)'
                  : 'rgba(255,255,255,0.95)',
              borderColor:
                preferences.theme === 'dark'
                  ? 'rgba(71,85,105,0.3)'
                  : 'rgba(226,232,240,0.5)',
              ...theme.shadow,
            },
          ]}
        >
          {/* Accent bar */}
          <View style={styles.accentBar} />

          <View style={styles.welcomeRow}>
            <View style={styles.welcomeIconWrap}>
              <Text style={styles.welcomeIcon}>👋</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.greetingText, { color: theme.textPrimary }]}
                numberOfLines={1}
              >
                {greeting}, {user?.email?.split('@')[0] || 'User'}!
              </Text>
              <Text style={[styles.subGreeting, { color: theme.textSecondary }]}>
                Your accessibility navigation hub for Chennai
              </Text>
            </View>
          </View>

          <Text style={[styles.welcomeDesc, { color: theme.textSecondary }]}>
            Navigate Chennai with confidence using our comprehensive accessibility features
          </Text>
        </View>

        {/* Accessible Routes Near You */}
        <View
          style={[
            styles.routeSection,
            {
              backgroundColor:
                preferences.theme === 'dark'
                  ? 'rgba(59,130,246,0.1)'
                  : 'rgba(59,130,246,0.05)',
              borderColor:
                preferences.theme === 'dark'
                  ? 'rgba(59,130,246,0.2)'
                  : 'rgba(59,130,246,0.15)',
              ...theme.shadow,
            },
          ]}
        >
          <View style={styles.routeHeader}>
            <View style={styles.routeTitleRow}>
              <Text style={{ fontSize: 18, color: '#3B82F6' }}>📍</Text>
              <Text style={[styles.routeTitle, { color: theme.textPrimary }]}>
                Accessible Routes Near You
              </Text>
            </View>
            {currentLocation && (
              <View style={styles.locationActive}>
                <View style={styles.greenDot} />
                <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                  Location Active
                </Text>
              </View>
            )}
          </View>

          {loadingLocation ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                Finding accessible routes near you...
              </Text>
            </View>
          ) : (
            <>
              {accessibleRoutes.map((route) => (
                <TouchableOpacity
                  key={route.id}
                  style={[
                    styles.routeCard,
                    {
                      backgroundColor:
                        preferences.theme === 'dark'
                          ? 'rgba(255,255,255,0.05)'
                          : 'rgba(255,255,255,0.8)',
                      borderColor:
                        preferences.theme === 'dark'
                          ? 'rgba(255,255,255,0.1)'
                          : 'rgba(0,0,0,0.05)',
                    },
                  ]}
                  onPress={() =>
                    navigation.navigate('Navigate', {
                      destination: route.destination,
                    })
                  }
                >
                  <View
                    style={[
                      styles.routeIconWrap,
                      { backgroundColor: `${route.color}20` },
                    ]}
                  >
                    <Text style={{ fontSize: 22, color: route.color }}>
                      {route.type === 'metro' ? '🚇' : '🚌'}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.routeNameRow}>
                      <Text
                        style={[styles.routeName, { color: theme.textPrimary }]}
                        numberOfLines={1}
                      >
                        {route.destination}
                      </Text>
                      <View
                        style={[
                          styles.lineBadge,
                          { backgroundColor: `${route.color}20` },
                        ]}
                      >
                        <Text
                          style={[styles.lineBadgeText, { color: route.color }]}
                        >
                          {route.line} Line
                        </Text>
                      </View>
                    </View>

                    <View style={styles.routeMeta}>
                      <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                        🚶{' '}
                        {route.distance < 1
                          ? `${Math.round(route.distance * 1000)}m`
                          : `${route.distance.toFixed(1)}km`}
                      </Text>
                      <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                        •
                      </Text>
                      <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                        ~{route.estimatedTime} min
                      </Text>
                      <Text style={{ color: '#10B981', fontWeight: '600', fontSize: 13 }}>
                        {route.accessibility}
                      </Text>
                    </View>

                    {route.facilities.length > 0 && (
                      <View style={styles.facilitiesRow}>
                        {route.facilities.slice(0, 3).map((f, idx) => (
                          <View
                            key={idx}
                            style={[
                              styles.facilityBadge,
                              {
                                backgroundColor:
                                  preferences.theme === 'dark'
                                    ? 'rgba(16,185,129,0.2)'
                                    : 'rgba(16,185,129,0.1)',
                              },
                            ]}
                          >
                            <Text style={styles.facilityText}>{f}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}

              {accessibleRoutes.length === 0 && (
                <View style={styles.emptyRoutes}>
                  <Text style={{ fontSize: 40, opacity: 0.5 }}>📍</Text>
                  <Text style={{ color: theme.textSecondary, textAlign: 'center' }}>
                    No accessible routes found nearby. Try enabling location access.
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.planRouteBtn, { backgroundColor: theme.accentColor }]}
                onPress={() => navigation.navigate('Navigate')}
              >
                <Text style={{ fontSize: 16 }}>🧭</Text>
                <Text style={styles.planRouteBtnText}>Plan Custom Route</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            {getText('quickActions')}
          </Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.quickActionCard,
                  {
                    backgroundColor: action.colors[0],
                    ...theme.shadow,
                  },
                ]}
                onPress={() => navigation.navigate(action.screen)}
              >
                <Text style={styles.quickActionIcon}>{action.icon}</Text>
                <Text style={styles.quickActionTitle}>{action.title}</Text>
                <Text style={styles.quickActionDesc}>{action.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tips Section */}
        <View
          style={[
            styles.tipCard,
            {
              backgroundColor:
                preferences.theme === 'dark'
                  ? 'rgba(139,92,246,0.1)'
                  : 'rgba(139,92,246,0.05)',
              borderColor:
                preferences.theme === 'dark'
                  ? 'rgba(139,92,246,0.2)'
                  : 'rgba(139,92,246,0.15)',
              ...theme.shadow,
            },
          ]}
        >
          <Text style={[styles.tipTitle, { color: theme.textPrimary }]}>
            💡 Pro Tip of the Day
          </Text>
          <Text style={[styles.tipText, { color: theme.textSecondary }]}>
            Use voice mode for hands-free navigation! Enable it in Settings →
            Accessibility Mode → Voice Control for a fully guided experience.
          </Text>
        </View>
      </ScrollView>

      {/* AI Assistant FAB — hidden in voice mode */}
      {!isVoiceMode && (
        <TouchableOpacity
          style={styles.aiFab}
          onPress={() => navigation.navigate('AIAssistant')}
          activeOpacity={0.8}
          accessibilityLabel="Open AI Assistant"
          accessibilityRole="button"
        >
          <Text style={{ fontSize: 24 }}>🤖</Text>
        </TouchableOpacity>
      )}

      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, { backgroundColor: theme.navBg, borderTopColor: theme.borderColor }]}>
        {[
          { label: getText('home'), icon: '🏠', screen: 'Home', active: true },
          { label: getText('navigate'), icon: '🧭', screen: 'Navigate' },
          { label: getText('alerts'), icon: '🔔', screen: 'Alerts' },
          { label: getText('community'), icon: '👥', screen: 'Community' },
          { label: getText('settings'), icon: '⚙️', screen: 'Settings' },
        ].map((item, i) => (
          <TouchableOpacity
            key={i}
            style={styles.navItem}
            onPress={() => {
              if (!item.active) navigation.navigate(item.screen);
            }}
          >
            <Text style={{ fontSize: 22 }}>{item.icon}</Text>
            <Text
              style={[
                styles.navLabel,
                { color: item.active ? theme.accentColor : theme.textSecondary },
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  scrollContent: { padding: 12, paddingBottom: 100 },
  // Onboarding
  onboardingLogoWrap: {
    width: 100,
    height: 100,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  onboardingLogoText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 20,
  },
  onboardingTitle: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
  onboardingSub: { fontSize: 14, marginBottom: 24 },
  onboardingCard: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
  },
  onboardingWelcome: { fontSize: 20, fontWeight: '600', marginBottom: 16 },
  onboardingMsg: { fontSize: 14, lineHeight: 22, marginBottom: 24 },
  getStartedBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  getStartedText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  // Voice badge
  voiceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 8,
    marginBottom: 12,
  },
  voiceBadgeIcon: { fontSize: 14 },
  voiceBadgeText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  // Welcome
  welcomeCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#3B82F6',
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    marginTop: 4,
  },
  welcomeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#1E40AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeIcon: { fontSize: 22, color: '#fff' },
  greetingText: { fontSize: 20, fontWeight: '800' },
  subGreeting: { fontSize: 14, marginTop: 2 },
  welcomeDesc: { fontSize: 14, lineHeight: 20 },
  // Routes section
  routeSection: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  routeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeTitle: { fontSize: 18, fontWeight: '700' },
  locationActive: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  loadingWrap: { alignItems: 'center', paddingVertical: 40 },
  loadingText: { marginTop: 16, fontSize: 14 },
  // Route card
  routeCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
    gap: 12,
  },
  routeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 },
  routeName: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  lineBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 4 },
  lineBadgeText: { fontSize: 11, fontWeight: '600' },
  routeMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  facilitiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  facilityBadge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
  facilityText: { fontSize: 11, color: '#10B981', fontWeight: '500' },
  emptyRoutes: { alignItems: 'center', padding: 32 },
  planRouteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 10,
    marginTop: 8,
  },
  planRouteBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  // Quick actions
  quickActionsSection: { marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  quickActionsGrid: { flexDirection: 'row', gap: 12 },
  quickActionCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  quickActionIcon: { fontSize: 28, marginBottom: 8 },
  quickActionTitle: { color: '#fff', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  quickActionDesc: { color: 'rgba(255,255,255,0.85)', fontSize: 11, textAlign: 'center', marginTop: 4 },
  // Tips
  tipCard: { padding: 18, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  tipTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  tipText: { fontSize: 14, lineHeight: 22 },
  // Bottom nav
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 8,
    paddingBottom: 20,
  },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navLabel: { fontSize: 10, marginTop: 2, fontWeight: '500' },
  // AI FAB
  aiFab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1976d2',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    zIndex: 10,
  },
});
