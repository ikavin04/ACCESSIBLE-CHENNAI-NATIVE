import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
  Share,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePreferences } from '../context/PreferencesContext';
import { useVoiceInterface } from '../utils/voiceUtils';

export default function SettingsScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [showSaved, setShowSaved] = useState(false);
  const [notifications, setNotifications] = useState({
    alerts: true,
    traffic: true,
    community: true,
    emergency: true,
  });
  const [privacy, setPrivacy] = useState({
    shareLocation: false,
    shareActivity: false,
    publicProfile: false,
  });

  const {
    preferences,
    updatePreferences,
    theme,
    getText,
  } = usePreferences();

  const { theme: themeKey, language, mode: interactionMode } = preferences;

  const {
    isListening,
    voiceFeedback,
    speak,
    setupSpeechRecognition,
    startListening,
  } = useVoiceInterface('Settings');

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    (async () => {
      const userData = await AsyncStorage.getItem('ac_user');
      if (userData) setUser(JSON.parse(userData));

      const savedNotif = await AsyncStorage.getItem('ac_notifications');
      if (savedNotif) setNotifications(JSON.parse(savedNotif));

      const savedPriv = await AsyncStorage.getItem('ac_privacy');
      if (savedPriv) setPrivacy(JSON.parse(savedPriv));
    })();
  }, []);

  // Voice mode setup
  useEffect(() => {
    if (interactionMode !== 'voice' || !speak) return;

    (async () => {
      await speak(
        'Welcome to Settings. You can say: voice mode, normal mode, light theme, dark theme, home, or help'
      );
      await setupSpeechRecognition(async (command) => {
        const cmd = command.toLowerCase().trim();
        if (cmd.includes('menu')) {
          const { MENU_PROMPT } = require('../utils/voiceUtils');
          speak(MENU_PROMPT, true, true);
        } else if (cmd.includes('voice') && cmd.includes('mode')) {
          updatePreferences({ mode: 'voice' });
          speak('Voice mode selected');
        } else if (
          (cmd.includes('normal') || cmd.includes('touch')) &&
          cmd.includes('mode')
        ) {
          updatePreferences({ mode: 'normal' });
          speak('Normal mode selected');
        } else if (cmd.includes('light') && cmd.includes('theme')) {
          updatePreferences({ theme: 'light' });
          speak('Light theme selected');
        } else if (cmd.includes('dark') && cmd.includes('theme')) {
          updatePreferences({ theme: 'dark' });
          speak('Dark theme selected');
        } else if (cmd.includes('home')) {
          speak('Going to Home').then(() => navigation.navigate('Home'));
        } else if (cmd.includes('help')) {
          speak(
            'Settings page. Say: voice mode, normal mode, light theme, dark theme, or home to go to home page'
          );
        } else {
          // Try menu navigation (user said a page name after hearing menu)
          const { handleMenuNavigation } = require('../utils/voiceUtils');
          handleMenuNavigation(speak, navigation, 'Settings', cmd);
        }
      });
      setTimeout(() => startListening(), 1000);
    })();
  }, [interactionMode]);

  const handleLogout = async () => {
    if (interactionMode === 'voice' && speak) {
      await speak(
        'Logging out. You will need to select your mode again on next login.'
      );
    }
    await AsyncStorage.multiRemove([
      'ac_user',
      'ac_prefs',
      'ac_notifications',
      'ac_privacy',
      'mode_selected',
    ]);
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const saveSettings = async () => {
    await AsyncStorage.setItem('ac_notifications', JSON.stringify(notifications));
    await AsyncStorage.setItem('ac_privacy', JSON.stringify(privacy));
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 3000);
  };

  const clearData = () => {
    Alert.alert(
      getText('clearAllData'),
      getText('confirmClearData'),
      [
        { text: getText('cancel'), style: 'cancel' },
        {
          text: getText('ok'),
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          },
        },
      ]
    );
  };

  const exportData = async () => {
    const data = {
      user,
      preferences: { theme: themeKey, language, interactionMode },
      notifications,
      privacy,
      exportDate: new Date().toISOString(),
    };
    try {
      await Share.share({ message: JSON.stringify(data, null, 2) });
    } catch (_) {}
  };

  // ===== Sub‑components =====

  const SettingCard = ({ title, description, children }) => (
    <View
      style={[
        s.card,
        { backgroundColor: theme.cardBg, borderColor: theme.borderColor, ...theme.shadow },
      ]}
    >
      <Text style={[s.cardTitle, { color: theme.textPrimary }]}>{title}</Text>
      {description ? (
        <Text style={[s.cardDesc, { color: theme.textSecondary }]}>
          {description}
        </Text>
      ) : null}
      {children}
    </View>
  );

  const ToggleRow = ({ label, description, value, onValueChange }) => (
    <View style={[s.toggleRow, { borderBottomColor: theme.borderColor }]}>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={[s.toggleLabel, { color: theme.textPrimary }]}>{label}</Text>
        {description ? (
          <Text style={[s.toggleDesc, { color: theme.textSecondary }]}>
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#ccc', true: theme.accentColor }}
        thumbColor="#fff"
      />
    </View>
  );

  const OptionBtn = ({ label, icon, isActive, onPress }) => (
    <TouchableOpacity
      style={[
        s.optionBtn,
        {
          backgroundColor: isActive ? theme.accentColor : 'transparent',
          borderColor: isActive ? theme.accentColor : theme.borderColor,
        },
      ]}
      onPress={onPress}
    >
      {icon ? <Text style={{ fontSize: 20 }}>{icon}</Text> : null}
      <Text
        style={[
          s.optionBtnText,
          { color: isActive ? '#fff' : theme.textPrimary },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (!user) {
    return (
      <View style={[s.centered, { backgroundColor: theme.bgPrimary }]}>
        <Text style={{ color: theme.textPrimary }}>{getText('loading')}</Text>
      </View>
    );
  }

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim, backgroundColor: theme.bgPrimary }}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerRow}>
            <Text style={[s.headerTitle, { color: theme.textPrimary }]}>
              {getText('settings')}
            </Text>
            {interactionMode === 'voice' && (
              <View
                style={[
                  s.voiceBadge,
                  { backgroundColor: isListening ? '#4caf50' : '#2196f3' },
                ]}
              >
                <Text style={{ color: '#fff', fontSize: 12 }}>🎤</Text>
                <Text style={s.voiceBadgeText}>
                  {isListening ? 'Listening...' : 'Voice Ready'}
                </Text>
              </View>
            )}
          </View>
          <Text style={[s.headerSub, { color: theme.textSecondary }]}>
            {getText('customizeExperience')}
          </Text>
          {interactionMode === 'voice' && voiceFeedback ? (
            <View style={s.voiceFeedbackBox}>
              <Text style={s.voiceFeedbackText}>{voiceFeedback}</Text>
            </View>
          ) : null}
        </View>

        {/* Success */}
        {showSaved && (
          <View style={s.successBanner}>
            <Text style={s.successText}>{getText('settingsSaved')}</Text>
          </View>
        )}

        {/* Appearance */}
        <SettingCard title={getText('appearance')} description={getText('chooseTheme')}>
          <View style={s.optionsRow}>
            <OptionBtn label={getText('lightTheme')} icon="☀️" isActive={themeKey === 'light'} onPress={() => updatePreferences({ theme: 'light' })} />
            <OptionBtn label={getText('darkTheme')} icon="🌙" isActive={themeKey === 'dark'} onPress={() => updatePreferences({ theme: 'dark' })} />
            <OptionBtn label={getText('highContrastTheme')} icon="👁️" isActive={themeKey === 'high-contrast'} onPress={() => updatePreferences({ theme: 'high-contrast' })} />
          </View>
        </SettingCard>

        {/* Language */}
        <SettingCard title={getText('language') || 'Language'} description={getText('selectLanguage')}>
          <View style={s.optionsRow}>
            <OptionBtn label="English" isActive={language === 'en'} onPress={() => updatePreferences({ language: 'en' })} />
            <OptionBtn label={getText('tamil')} isActive={language === 'ta'} onPress={() => updatePreferences({ language: 'ta' })} />
          </View>
        </SettingCard>

        {/* Interaction Mode */}
        <SettingCard title={getText('interactionMode')} description={getText('chooseInputMethod')}>
          {interactionMode === 'voice' && (
            <TouchableOpacity
              style={[
                s.voiceActivateBtn,
                {
                  backgroundColor: isListening ? theme.accentColor : 'transparent',
                  borderColor: theme.accentColor,
                },
              ]}
              onPress={() => {
                speak(getText('pleaseSpeak'));
                startListening();
              }}
            >
              <Text style={{ fontSize: 18 }}>🎤</Text>
              <Text
                style={{
                  color: isListening ? '#fff' : theme.accentColor,
                  fontWeight: '600',
                }}
              >
                {isListening ? getText('listening') : getText('activateVoice')}
              </Text>
            </TouchableOpacity>
          )}
          <View style={s.optionsRow}>
            <OptionBtn
              label={getText('normalMode')}
              isActive={interactionMode === 'normal'}
              onPress={() => {
                updatePreferences({ mode: 'normal' });
                if (speak) speak(getText('normalModeSelected'));
              }}
            />
            <OptionBtn
              label={getText('voiceMode')}
              isActive={interactionMode === 'voice'}
              onPress={() => {
                updatePreferences({ mode: 'voice' });
                if (speak) speak(getText('voiceModeSelected'));
              }}
            />
          </View>
        </SettingCard>

        {/* Screen Reader */}
        <SettingCard title={getText('screenReader')} description={getText('screenReaderDescription')}>
          <View style={s.toggleRow}>
            <Text style={[s.toggleLabel, { color: theme.textPrimary }]}>
              {preferences.screenReader ? getText('enabled') : getText('disabled')}
            </Text>
            <Switch
              value={preferences.screenReader}
              onValueChange={(val) => updatePreferences({ screenReader: val })}
              trackColor={{ false: '#ccc', true: '#4caf50' }}
              thumbColor="#fff"
            />
          </View>
          {preferences.screenReader && (
            <View style={s.screenReaderInfo}>
              <Text style={s.screenReaderInfoText}>
                {getText('screenReaderEnabled')}
              </Text>
            </View>
          )}
        </SettingCard>

        {/* Notifications */}
        <SettingCard title={getText('notifications')} description={getText('manageNotifications')}>
          <ToggleRow
            label={getText('alertNotifications')}
            description={getText('accessibilityAlerts')}
            value={notifications.alerts}
            onValueChange={(v) => setNotifications({ ...notifications, alerts: v })}
          />
          <ToggleRow
            label={getText('trafficUpdates')}
            description={getText('realTimeTraffic')}
            value={notifications.traffic}
            onValueChange={(v) => setNotifications({ ...notifications, traffic: v })}
          />
          <ToggleRow
            label={getText('communityNotifications')}
            description={getText('newPostsComments')}
            value={notifications.community}
            onValueChange={(v) => setNotifications({ ...notifications, community: v })}
          />
          <ToggleRow
            label={getText('emergencyAlerts')}
            description={getText('criticalAlerts')}
            value={notifications.emergency}
            onValueChange={(v) => setNotifications({ ...notifications, emergency: v })}
          />
        </SettingCard>

        {/* Privacy */}
        <SettingCard title={getText('privacy')} description={getText('controlDataSharing')}>
          <ToggleRow
            label={getText('shareLocation')}
            description={getText('locationForRecommendations')}
            value={privacy.shareLocation}
            onValueChange={(v) => setPrivacy({ ...privacy, shareLocation: v })}
          />
          <ToggleRow
            label={getText('shareActivity')}
            description={getText('helpImproveApp')}
            value={privacy.shareActivity}
            onValueChange={(v) => setPrivacy({ ...privacy, shareActivity: v })}
          />
          <ToggleRow
            label={getText('publicProfile')}
            description={getText('visibleToCommunity')}
            value={privacy.publicProfile}
            onValueChange={(v) => setPrivacy({ ...privacy, publicProfile: v })}
          />
        </SettingCard>

        {/* Account */}
        <SettingCard title={getText('account')}>
          <TouchableOpacity
            style={[s.accountBtn, { borderColor: theme.borderColor }]}
            onPress={exportData}
          >
            <Text style={{ color: theme.textPrimary, fontWeight: '500', fontSize: 16 }}>
              {getText('exportData')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.accountBtn, { backgroundColor: theme.accentColor, borderColor: theme.accentColor }]}
            onPress={saveSettings}
          >
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>
              {getText('saveSettings')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.accountBtn, { backgroundColor: theme.dangerColor, borderColor: theme.dangerColor }]}
            onPress={clearData}
          >
            <Text style={{ color: '#fff', fontWeight: '500', fontSize: 16 }}>
              🗑️ {getText('clearAllData')}
            </Text>
          </TouchableOpacity>
        </SettingCard>

        {/* About */}
        <SettingCard title={getText('about')}>
          <View style={{ alignItems: 'center' }}>
            <View style={[s.aboutLogo, { backgroundColor: theme.accentColor }]}>
              <Text style={{ fontSize: 28, color: '#fff', fontWeight: 'bold' }}>AC</Text>
            </View>
            <Text style={[s.aboutAppName, { color: theme.textPrimary }]}>
              Accessible Chennai
            </Text>
            <Text style={[s.aboutVersion, { color: theme.textSecondary }]}>
              Version 1.0.0
            </Text>
            <Text style={[s.aboutDesc, { color: theme.textSecondary }]}>
              {getText('appDescription')}
            </Text>
          </View>
        </SettingCard>

        {/* Logout */}
        <View
          style={[
            s.logoutCard,
            {
              backgroundColor:
                themeKey === 'dark'
                  ? 'rgba(244,67,54,0.05)'
                  : 'rgba(244,67,54,0.02)',
              borderColor: 'rgba(244,67,54,0.2)',
              ...theme.shadow,
            },
          ]}
        >
          <Text style={[s.logoutTitle, { color: theme.textPrimary }]}>
            {getText('logout')}
          </Text>
          <Text style={[s.logoutDesc, { color: theme.textSecondary }]}>
            Sign out of your account. You will need to select your mode
            (Voice/Normal) again when you log back in.
          </Text>
          <TouchableOpacity
            style={s.logoutBtn}
            onPress={handleLogout}
          >
            <Text style={{ fontSize: 18 }}>🚪</Text>
            <Text style={s.logoutBtnText}>{getText('logout')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={[s.bottomNav, { backgroundColor: theme.navBg, borderTopColor: theme.borderColor }]}>
        {[
          { label: getText('home'), icon: '🏠', screen: 'Home' },
          { label: getText('navigate'), icon: '🧭', screen: 'Navigate' },
          { label: getText('alerts'), icon: '🔔', screen: 'Alerts' },
          { label: getText('community'), icon: '👥', screen: 'Community' },
          { label: getText('settings'), icon: '⚙️', screen: 'Settings', active: true },
        ].map((item, i) => (
          <TouchableOpacity
            key={i}
            style={s.navItem}
            onPress={() => { if (!item.active) navigation.navigate(item.screen); }}
          >
            <Text style={{ fontSize: 22 }}>{item.icon}</Text>
            <Text style={[s.navLabel, { color: item.active ? theme.accentColor : theme.textSecondary }]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20, paddingBottom: 100 },
  // Header
  header: { marginBottom: 24, alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  headerTitle: { fontSize: 28, fontWeight: '800' },
  headerSub: { fontSize: 14 },
  voiceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  voiceBadgeText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  voiceFeedbackBox: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#2196f3',
    borderRadius: 8,
  },
  voiceFeedbackText: { color: '#1976d2', fontSize: 14 },
  successBanner: {
    backgroundColor: '#4caf50',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  successText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  // Card
  card: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  cardTitle: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  cardDesc: { fontSize: 14, lineHeight: 21, marginBottom: 20 },
  // Options row
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  optionBtn: {
    flex: 1,
    minWidth: 90,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 60,
  },
  optionBtnText: { fontSize: 14, fontWeight: '500', textAlign: 'center' },
  // Toggle
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  toggleLabel: { fontSize: 16, fontWeight: '500', marginBottom: 4 },
  toggleDesc: { fontSize: 14 },
  // Voice activate btn
  voiceActivateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 50,
    borderWidth: 2,
    marginBottom: 16,
  },
  // Screen reader
  screenReaderInfo: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#e8f5e8',
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  screenReaderInfoText: { fontSize: 14, color: '#2e7d32' },
  // Account
  accountBtn: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  // About
  aboutLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  aboutAppName: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  aboutVersion: { fontSize: 14, marginBottom: 16 },
  aboutDesc: { fontSize: 14, lineHeight: 22, textAlign: 'center' },
  // Logout
  logoutCard: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 20,
    alignItems: 'center',
  },
  logoutTitle: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
  logoutDesc: { fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 20 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#d32f2f',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 200,
  },
  logoutBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
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
});
