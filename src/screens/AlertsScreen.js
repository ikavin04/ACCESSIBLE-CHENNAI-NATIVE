import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { usePreferences } from '../context/PreferencesContext';
import { useVoiceInterface } from '../utils/voiceUtils';
import { API_BASE, apiFetch } from '../config';

export default function AlertsScreen({ navigation }) {
  const { theme, getText, preferences } = usePreferences();
  const isVoiceMode = preferences.mode === 'voice';

  const {
    isListening,
    voiceFeedback,
    speak,
    setupSpeechRecognition,
    startListening,
  } = useVoiceInterface('Alerts');

  const [alerts, setAlerts] = useState([]);
  const [metroAlerts, setMetroAlerts] = useState([]);
  const [category, setCategory] = useState('transport');
  const [message, setMessage] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Metro line colors
  const metroLineColors = {
    'Blue Line': '#1976d2',
    'Green Line': '#4caf50',
  };

  // Generate metro alerts
  const generateMetroAlerts = useCallback(() => {
    return [
      {
        id: 1,
        line: 'Blue Line',
        stations: ['Central', 'Government Estate'],
        type: 'delay',
        message: '5-minute delay due to technical issues',
        severity: 'medium',
        timestamp: new Date(Date.now() - 10 * 60000),
        estimated: '15 mins',
      },
      {
        id: 2,
        line: 'Green Line',
        stations: ['Koyambedu'],
        type: 'maintenance',
        message: 'Elevator maintenance in progress - use alternate routes',
        severity: 'high',
        timestamp: new Date(Date.now() - 30 * 60000),
        estimated: '2 hours',
      },
      {
        id: 3,
        line: 'Blue Line',
        stations: ['Airport', 'Meenambakkam'],
        type: 'crowding',
        message: 'High passenger volume during peak hours',
        severity: 'low',
        timestamp: new Date(Date.now() - 5 * 60000),
        estimated: '1 hour',
      },
      {
        id: 4,
        line: 'Green Line',
        stations: ['Anna Nagar East'],
        type: 'accessibility',
        message: 'Tactile path under repair - assistance available',
        severity: 'high',
        timestamp: new Date(Date.now() - 45 * 60000),
        estimated: '3 hours',
      },
    ];
  }, []);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return '#ff5722';
      case 'medium': return '#ff9800';
      case 'low': return '#4caf50';
      default: return '#2196f3';
    }
  };

  const getTimeDifference = (timestamp) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`${API_BASE}/api/alerts`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(Array.isArray(data) ? data : []);
      } else {
        setAlerts([]);
      }
    } catch (err) {
      console.log('Could not fetch alerts:', err.message);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const readAlerts = useCallback(async () => {
    const accessibilityAlerts = metroAlerts
      .filter(a => a.type === 'accessibility' || a.type === 'maintenance')
      .slice(0, 3);
    if (accessibilityAlerts.length === 0) {
      await speak('You have no accessibility alerts at this time. Say Repeat to hear again. Say Clear Alerts to dismiss.', true, true);
      return;
    }
    let msg = `You have ${accessibilityAlerts.length} alert${accessibilityAlerts.length > 1 ? 's' : ''}. `;
    accessibilityAlerts.forEach((a, i) => {
      msg += `Alert ${i + 1}: ${a.message} at ${a.stations.join(' and ')} ${a.line}. `;
    });
    msg += 'Say Repeat to hear again. Say Clear Alerts to dismiss all alerts.';
    await speak(msg, true, true);
  }, [metroAlerts, speak]);

  // Init
  useEffect(() => {
    fetchAlerts();
    setMetroAlerts(generateMetroAlerts());

    const interval = setInterval(() => {
      setMetroAlerts(generateMetroAlerts());
    }, 30000);

    return () => clearInterval(interval);
  }, [generateMetroAlerts]);

  // Voice commands
  useEffect(() => {
    if (!isVoiceMode) return;

    (async () => {
      await setupSpeechRecognition(async (transcript) => {
        const cmd = transcript.toLowerCase().trim();
        if (cmd.includes('menu')) {
          const { MENU_PROMPT, handleMenuNavigation } = require('../utils/voiceUtils');
          speak(MENU_PROMPT, true, true);
        } else if (cmd.includes('refresh') || cmd.includes('update')) {
          speak('Refreshing alerts.', false, true);
          fetchAlerts();
          setMetroAlerts(generateMetroAlerts());
        } else if (cmd.includes('repeat') || cmd.includes('again')) {
          readAlerts();
        } else if (cmd.includes('clear')) {
          speak('Clearing all alerts.', false, true);
          setAlerts([]);
          setMetroAlerts([]);
        } else if (cmd.includes('transport') || cmd.includes('metro') || cmd.includes('bus')) {
          speak('Transport alerts selected.', false, true);
          setCategory('transport');
        } else if (cmd.includes('accessibility') || cmd.includes('access')) {
          speak('Accessibility alerts selected.', false, true);
          setCategory('accessibility');
        } else if (cmd.includes('emergency')) {
          speak('Emergency mode activated.', true, true);
        } else if (cmd.includes('back') || cmd.includes('home')) {
          speak('Going back.', false, true);
          navigation.navigate('Home');
        } else {
          // Try menu navigation (user said a page name after hearing menu)
          const { handleMenuNavigation } = require('../utils/voiceUtils');
          handleMenuNavigation(speak, navigation, 'Alerts', cmd);
        }
      });
    })();

    const timer = setTimeout(async () => {
      startListening();
      await readAlerts();
    }, 800);

    return () => clearTimeout(timer);
  }, [isVoiceMode]);

  const handlePost = async () => {
    if (!message.trim()) return;
    try {
      await apiFetch(`${API_BASE}/api/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          message: `${location ? `${location}: ` : ''}${message}`,
          location,
        }),
      });
      setMessage('');
      setLocation('');
      fetchAlerts();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.log('Error posting alert:', err.message);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAlerts();
    setMetroAlerts(generateMetroAlerts());
    setRefreshing(false);
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bgPrimary },
    scroll: { padding: 16, paddingBottom: 100 },
    // Header
    header: {
      backgroundColor: theme.cardBg,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.borderColor,
    },
    headerTitle: { fontSize: 24, fontWeight: '700', color: theme.textPrimary },
    headerSub: { fontSize: 14, color: theme.textSecondary, marginTop: 4 },
    // Voice
    voiceBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isListening ? theme.accentColor : 'rgba(0,0,0,0.7)',
      padding: 10,
      borderRadius: 25,
      marginBottom: 12,
    },
    voiceDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: isListening ? '#4caf50' : '#fff' },
    voiceText: { color: '#fff', fontSize: 13, fontWeight: '500', marginLeft: 8 },
    // Metro section
    metroSection: {
      backgroundColor: '#1976d2',
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
    },
    metroHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    metroIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    metroIconText: { fontSize: 16, color: '#fff', fontWeight: '700' },
    metroTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
    metroTime: { fontSize: 12, color: 'rgba(255,255,255,0.9)' },
    liveBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    liveBadgeText: { fontSize: 11, fontWeight: '600', color: '#fff' },
    // Alert card
    alertCard: {
      backgroundColor: 'rgba(255,255,255,0.15)',
      padding: 14,
      borderRadius: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    alertRow: { flexDirection: 'row', alignItems: 'flex-start' },
    alertType: { fontSize: 16, fontWeight: '700', color: '#fff', width: 24, textAlign: 'center' },
    alertContent: { flex: 1, marginLeft: 10 },
    alertBadgeRow: { flexDirection: 'row', marginBottom: 4 },
    alertBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginRight: 6 },
    alertBadgeText: { fontSize: 10, fontWeight: '600', color: '#fff', textTransform: 'uppercase' },
    alertStations: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 2 },
    alertMessage: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginBottom: 6 },
    alertMeta: { flexDirection: 'row' },
    alertMetaText: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginRight: 16 },
    // Form
    formCard: {
      backgroundColor: theme.cardBg,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.borderColor,
    },
    formTitle: { fontSize: 16, fontWeight: '600', color: theme.textPrimary, marginBottom: 16 },
    formLabel: { fontSize: 13, fontWeight: '500', color: theme.textPrimary, marginBottom: 6 },
    formInput: {
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.borderColor,
      backgroundColor: theme.inputBg,
      color: theme.textPrimary,
      fontSize: 14,
      marginBottom: 14,
    },
    textArea: { minHeight: 80, textAlignVertical: 'top' },
    submitBtn: {
      backgroundColor: theme.accentColor,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
    },
    submitBtnDisabled: { opacity: 0.5 },
    submitBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
    // Community alerts
    communityCard: {
      backgroundColor: theme.cardBg,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.borderColor,
    },
    communityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    communityTitle: { fontSize: 16, fontWeight: '600', color: theme.textPrimary },
    refreshBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.accentColor,
    },
    refreshBtnText: { fontSize: 12, color: theme.accentColor, fontWeight: '500' },
    communityAlert: {
      padding: 14,
      backgroundColor: theme.bgSecondary,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.borderColor,
      marginBottom: 10,
    },
    cAlertRow: { flexDirection: 'row', alignItems: 'flex-start' },
    cAlertIcon: { fontSize: 16, fontWeight: '700', color: theme.accentColor, width: 24, textAlign: 'center' },
    cAlertContent: { flex: 1, marginLeft: 10 },
    cAlertBadgeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    cAlertBadge: { backgroundColor: theme.accentColor, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, marginRight: 8 },
    cAlertBadgeText: { fontSize: 11, color: '#fff', fontWeight: '600', textTransform: 'uppercase' },
    cAlertDate: { fontSize: 11, color: theme.textSecondary },
    cAlertMessage: { fontSize: 14, color: theme.textPrimary, lineHeight: 20 },
    cAlertLocation: { fontSize: 11, color: theme.textSecondary, marginTop: 6 },
    emptyText: { textAlign: 'center', padding: 30, color: theme.textSecondary, fontSize: 14 },
    // Category picker
    pickerRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14 },
    pickerBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      marginRight: 8,
      marginBottom: 6,
    },
    pickerBtnText: { fontSize: 13, fontWeight: '500' },
  });

  const categoryOptions = ['transport', 'accessibility', 'roadway', 'weather', 'emergency'];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{getText('realTimeAlerts') || 'Real-Time Alerts'}</Text>
          <Text style={styles.headerSub}>{getText('stayUpdated') || 'Stay updated with accessibility alerts'}</Text>
        </View>

        {/* Voice Mode */}
        {isVoiceMode && (
          <View style={styles.voiceBanner}>
            <View style={styles.voiceDot} />
            <Text style={styles.voiceText}>{voiceFeedback || (isListening ? 'Listening...' : 'Voice Mode')}</Text>
          </View>
        )}

        {/* Metro Live Alerts */}
        <View style={styles.metroSection}>
          <View style={styles.metroHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.metroIcon}>
                <Text style={styles.metroIconText}>M</Text>
              </View>
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.metroTitle}>{getText('chennaiMetroLive') || 'Chennai Metro Live'}</Text>
                <Text style={styles.metroTime}>{getText('lastUpdated') || 'Last updated'}: {new Date().toLocaleTimeString()}</Text>
              </View>
            </View>
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>{getText('live') || 'LIVE'}</Text>
            </View>
          </View>

          {metroAlerts.length === 0 ? (
            <Text style={{ textAlign: 'center', color: 'rgba(255,255,255,0.8)', padding: 20 }}>
              ✅ {getText('allServicesNormal') || 'All services running normally'}
            </Text>
          ) : (
            metroAlerts.map(alert => (
              <View key={alert.id} style={styles.alertCard}>
                <View style={styles.alertRow}>
                  <Text style={styles.alertType}>{alert.type[0].toUpperCase()}</Text>
                  <View style={styles.alertContent}>
                    <View style={styles.alertBadgeRow}>
                      <View style={[styles.alertBadge, { backgroundColor: metroLineColors[alert.line] || '#fff' }]}>
                        <Text style={styles.alertBadgeText}>{alert.line}</Text>
                      </View>
                      <View style={[styles.alertBadge, { backgroundColor: getSeverityColor(alert.severity) }]}>
                        <Text style={styles.alertBadgeText}>{alert.severity}</Text>
                      </View>
                    </View>
                    <Text style={styles.alertStations}>{alert.stations.join(' ↔ ')}</Text>
                    <Text style={styles.alertMessage}>{alert.message}</Text>
                    <View style={styles.alertMeta}>
                      <Text style={styles.alertMetaText}>{getTimeDifference(alert.timestamp)}</Text>
                      <Text style={styles.alertMetaText}>Est. {alert.estimated}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Report Issue Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{getText('reportIssue') || 'Report an Issue'}</Text>

          <Text style={styles.formLabel}>{getText('category') || 'Category'}</Text>
          <View style={styles.pickerRow}>
            {categoryOptions.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.pickerBtn,
                  {
                    backgroundColor: category === cat ? theme.accentColor : 'transparent',
                    borderColor: category === cat ? theme.accentColor : theme.borderColor,
                  },
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.pickerBtnText, { color: category === cat ? '#fff' : theme.textSecondary }]}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.formLabel}>{getText('locationOptional') || 'Location (optional)'}</Text>
          <TextInput
            style={styles.formInput}
            placeholder="e.g., Central Metro Station"
            placeholderTextColor={theme.textSecondary}
            value={location}
            onChangeText={setLocation}
          />

          <Text style={styles.formLabel}>{getText('alertMessage') || 'Alert Message'}</Text>
          <TextInput
            style={[styles.formInput, styles.textArea]}
            placeholder={getText('describeIssue') || 'Describe the issue...'}
            placeholderTextColor={theme.textSecondary}
            value={message}
            onChangeText={setMessage}
            multiline
          />

          <TouchableOpacity
            style={[styles.submitBtn, !message.trim() && styles.submitBtnDisabled]}
            disabled={!message.trim()}
            onPress={handlePost}
          >
            <Text style={styles.submitBtnText}>{getText('postAlert') || 'Post Alert'}</Text>
          </TouchableOpacity>
        </View>

        {/* Community Alerts */}
        <View style={styles.communityCard}>
          <View style={styles.communityHeader}>
            <Text style={styles.communityTitle}>{getText('communityReports') || 'Community Reports'}</Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={fetchAlerts} disabled={loading}>
              <Text style={styles.refreshBtnText}>
                {loading ? '⏳ Loading...' : `🔄 ${getText('refresh') || 'Refresh'}`}
              </Text>
            </TouchableOpacity>
          </View>

          {alerts.length === 0 ? (
            <Text style={styles.emptyText}>⚠️ {getText('noAlertsYet') || 'No alerts yet'}</Text>
          ) : (
            alerts.map(alert => (
              <View key={alert.id} style={styles.communityAlert}>
                <View style={styles.cAlertRow}>
                  <Text style={styles.cAlertIcon}>{(alert.category || 'G')[0].toUpperCase()}</Text>
                  <View style={styles.cAlertContent}>
                    <View style={styles.cAlertBadgeRow}>
                      <View style={styles.cAlertBadge}>
                        <Text style={styles.cAlertBadgeText}>{alert.category}</Text>
                      </View>
                      <Text style={styles.cAlertDate}>{new Date(alert.created_at).toLocaleString()}</Text>
                    </View>
                    <Text style={styles.cAlertMessage}>{alert.message}</Text>
                    {alert.location ? <Text style={styles.cAlertLocation}>📍 {alert.location}</Text> : null}
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
