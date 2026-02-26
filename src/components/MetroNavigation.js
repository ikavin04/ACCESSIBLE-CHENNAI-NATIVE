import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Modal,
  Dimensions,
} from 'react-native';
import { usePreferences } from '../context/PreferencesContext';
import MetroService from '../services/MetroService';

const { width } = Dimensions.get('window');

const MetroNavigation = () => {
  const { preferences } = usePreferences();
  const isDark = preferences.theme === 'dark';

  const [fromStation, setFromStation] = useState('');
  const [toStation, setToStation] = useState('');
  const [searchResults, setSearchResults] = useState({ from: [], to: [] });
  const [routeInfo, setRouteInfo] = useState(null);
  const [liveTimings, setLiveTimings] = useState(null);
  const [metroStatus, setMetroStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDropdown, setShowDropdown] = useState({ from: false, to: false });
  const [showSchedule, setShowSchedule] = useState(false);

  // Load metro status on mount
  useEffect(() => {
    loadMetroStatus();
  }, []);

  const loadMetroStatus = async () => {
    try {
      const status = await MetroService.getMetroStatus();
      setMetroStatus(status);
    } catch (err) {
      console.error('Failed to load metro status:', err);
    }
  };

  const handleStationSearch = useCallback((query, type) => {
    const results = MetroService.searchStations(query);
    setSearchResults(prev => ({ ...prev, [type]: results }));
    setShowDropdown(prev => ({ ...prev, [type]: true }));
  }, []);

  const handleInputFocus = useCallback((type) => {
    const allStations = MetroService.getAllStations();
    setSearchResults(prev => ({ ...prev, [type]: allStations }));
    setShowDropdown(prev => ({ ...prev, [type]: true }));
  }, []);

  const selectStation = useCallback((station, type) => {
    if (type === 'from') {
      setFromStation(station.name);
      setShowDropdown(prev => ({ ...prev, from: false }));
      setSearchResults(prev => ({ ...prev, from: [] }));
      loadLiveTimings(station.name);
    } else {
      setToStation(station.name);
      setShowDropdown(prev => ({ ...prev, to: false }));
      setSearchResults(prev => ({ ...prev, to: [] }));
    }
  }, []);

  const loadLiveTimings = async (stationName) => {
    try {
      const timings = await MetroService.getLiveTimings(stationName);
      setLiveTimings(timings);
    } catch (err) {
      console.error('Failed to load live timings:', err);
    }
  };

  const findMetroRoute = async () => {
    if (!fromStation || !toStation) {
      setError('Please select both from and to stations');
      return;
    }
    if (fromStation === toStation) {
      setError('From and to stations cannot be the same');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const route = await MetroService.getMetroRoute(fromStation, toStation);
      setRouteInfo(route.route);
    } catch (err) {
      setError(err.message || 'Failed to find metro route');
    } finally {
      setLoading(false);
    }
  };

  const clearRoute = () => {
    setFromStation('');
    setToStation('');
    setRouteInfo(null);
    setLiveTimings(null);
    setError('');
    setSearchResults({ from: [], to: [] });
  };

  // ─── Metro Schedule Data (Chennai Metro Timetable) ────────────────────
  const metroSchedule = {
    weekdays: {
      blueLineCorridor1: {
        route: 'WIMCO NAGAR DEPOT ↔ AIRPORT (via WIMCO NAGAR, WASHERMANPET, CENTRAL, AGDMS, ALANDUR)',
        schedule: [
          { direction: 'From Airport', firstTrain: '04:51Hrs', lastTrain: '23:00Hrs', nonPeakFrequency: '0500-0800Hrs,1100-1700Hrs & 2000-2200Hrs Every 7 mins', peakFrequency: '0800-1100Hrs & 1700-2000Hrs Every 6 mins', extendedNonPeak: '2200-2300Hrs Every 15mins', specialNote: '3 mins frequency between Washermanpet & Alandur' },
          { direction: 'From Wimco Nagar Depot', firstTrain: '04:56Hrs', lastTrain: '23:00Hrs', nonPeakFrequency: '0500-0800Hrs,1100-1700Hrs & 2000-2200Hrs Every 7 mins', peakFrequency: '0800-1100Hrs & 1700-2000Hrs Every 6 mins', extendedNonPeak: '2200-2300Hrs Every 15mins' },
        ],
      },
      interCorridor: {
        route: 'CHENNAI CENTRAL ↔ AIRPORT (via EGMORE, CMBT, ALANDUR)',
        schedule: [
          { direction: 'From Chennai Central', firstTrain: '04:55Hrs', lastTrain: '23:17Hrs', nonPeakFrequency: '0500-0800Hrs,1100-1700Hrs & 2000-2200Hrs Every 14 mins', peakFrequency: '0800-1100Hrs & 1700-2000Hrs Every 12 mins', extendedNonPeak: '2200-2300Hrs Every 30mins' },
          { direction: 'From Airport', firstTrain: '05:02Hrs', lastTrain: '23:08Hrs', nonPeakFrequency: '0500-0800Hrs,1100-1700Hrs & 2000-2200Hrs Every 14 mins', peakFrequency: '0800-1100Hrs & 1700-2000Hrs Every 12 mins', extendedNonPeak: '2200-2300Hrs Every 30mins' },
        ],
      },
      greenLineCorridor2: {
        route: 'CHENNAI CENTRAL ↔ ST. THOMAS MOUNT (via EGMORE, CMBT, ALANDUR)',
        schedule: [
          { direction: 'From Chennai Central', firstTrain: '05:02Hrs', lastTrain: '23:00Hrs', nonPeakFrequency: '0500-0800Hrs,1100-1700Hrs & 2000-2200Hrs Every 14 mins', peakFrequency: '0800-1100Hrs & 1700-2000Hrs Every 12 mins', extendedNonPeak: '2200-2300Hrs Every 30mins' },
          { direction: 'From St. Thomas Mount', firstTrain: '05:01Hrs', lastTrain: '23:00Hrs', nonPeakFrequency: '0500-0800Hrs,1100-1700Hrs & 2000-2200Hrs Every 14 mins', peakFrequency: '0800-1100Hrs & 1700-2000Hrs Every 12 mins', extendedNonPeak: '2200-2300Hrs Every 30mins' },
        ],
      },
    },
    saturday: {
      blueLineCorridor1: {
        route: 'WIMCO NAGAR DEPOT ↔ AIRPORT (via WIMCO NAGAR, WASHERMANPET, CENTRAL, AGDMS, ALANDUR)',
        schedule: [
          { direction: 'From Airport', firstTrain: '04:51Hrs', lastTrain: '23:00Hrs', nonPeakFrequency: '0500-0800Hrs,1100-1700Hrs & 2000-2200Hrs Every 7 mins', peakFrequency: '0800-1100Hrs & 1700-2000Hrs Every 6 mins', extendedNonPeak: '2200-2300Hrs Every 15mins' },
          { direction: 'From Wimco Nagar Depot', firstTrain: '04:56Hrs', lastTrain: '23:00Hrs', nonPeakFrequency: '0500-0800Hrs,1100-1700Hrs & 2000-2200Hrs Every 7 mins', peakFrequency: '0800-1100Hrs & 1700-2000Hrs Every 6 mins', extendedNonPeak: '2200-2300Hrs Every 15mins' },
        ],
      },
      interCorridor: {
        route: 'CHENNAI CENTRAL ↔ AIRPORT (via EGMORE, CMBT, ALANDUR)',
        schedule: [
          { direction: 'From Chennai Central', firstTrain: '04:55Hrs', lastTrain: '23:17Hrs', nonPeakFrequency: '0500-0800Hrs,1100-1700Hrs & 2000-2200Hrs Every 14 mins', peakFrequency: '0800-1100Hrs & 1700-2000Hrs Every 12 mins', extendedNonPeak: '2200-2300Hrs Every 30mins' },
          { direction: 'From Airport', firstTrain: '05:02Hrs', lastTrain: '23:08Hrs', nonPeakFrequency: '0500-0800Hrs,1100-1700Hrs & 2000-2200Hrs Every 14 mins', peakFrequency: '0800-1100Hrs & 1700-2000Hrs Every 12 mins', extendedNonPeak: '2200-2300Hrs Every 30mins' },
        ],
      },
      greenLineCorridor2: {
        route: 'CHENNAI CENTRAL ↔ ST. THOMAS MOUNT (via EGMORE, CMBT, ALANDUR)',
        schedule: [
          { direction: 'From Chennai Central', firstTrain: '05:02Hrs', lastTrain: '23:00Hrs', nonPeakFrequency: '0500-0800Hrs,1100-1700Hrs & 2000-2200Hrs Every 14 mins', peakFrequency: '0800-1100Hrs & 1700-2000Hrs Every 12 mins', extendedNonPeak: '2200-2300Hrs Every 30mins' },
          { direction: 'From St. Thomas Mount', firstTrain: '05:01Hrs', lastTrain: '23:00Hrs', nonPeakFrequency: '0500-0800Hrs,1100-1700Hrs & 2000-2200Hrs Every 14 mins', peakFrequency: '0800-1100Hrs & 1700-2000Hrs Every 12 mins', extendedNonPeak: '2200-2300Hrs Every 30mins' },
        ],
      },
    },
    sunday: {
      blueLineCorridor1: {
        route: 'WIMCO NAGAR DEPOT ↔ AIRPORT (via WIMCO NAGAR, WASHERMANPET, CENTRAL, AGDMS, ALANDUR)',
        schedule: [
          { direction: 'From Airport', firstTrain: '05:02Hrs', lastTrain: '23:00Hrs', nonPeakFrequency: '0500-1200Hrs & 2000-2200 Every 10 mins', peakFrequency: '1200-2000Hrs Every 7 mins', extendedNonPeak: '2200-2300Hrs Every 15mins' },
          { direction: 'From Wimco Nagar Depot', firstTrain: '05:03Hrs', lastTrain: '23:00Hrs', nonPeakFrequency: '0500-1200Hrs & 2000-2200 Every 10 mins', peakFrequency: '1200-2000Hrs Every 7 mins', extendedNonPeak: '2200-2300Hrs Every 15mins' },
        ],
      },
      interCorridor: {
        route: 'CHENNAI CENTRAL ↔ AIRPORT (via EGMORE, CMBT, ALANDUR)',
        schedule: [
          { direction: 'From Chennai Central', firstTrain: '05:01Hrs', lastTrain: '23:07Hrs', nonPeakFrequency: '0500-1200Hrs & 2000-2200 Every 20 mins', peakFrequency: '1200-2000Hrs Every 14 mins', extendedNonPeak: '2200-2300Hrs Every 30mins' },
          { direction: 'From Airport', firstTrain: '04:55Hrs', lastTrain: '23:08Hrs', nonPeakFrequency: '0500-1200Hrs & 2000-2200 Every 20 mins', peakFrequency: '1200-2000Hrs Every 14 mins', extendedNonPeak: '2200-2300Hrs Every 30mins' },
        ],
      },
      greenLineCorridor2: {
        route: 'CHENNAI CENTRAL ↔ ST. THOMAS MOUNT (via EGMORE, CMBT, ALANDUR)',
        schedule: [
          { direction: 'From Chennai Central', firstTrain: '04:51Hrs', lastTrain: '23:17Hrs', nonPeakFrequency: '0500-1200Hrs & 2000-2200 Every 20 mins', peakFrequency: '1200-2000Hrs Every 14 mins', extendedNonPeak: '2200-2300Hrs Every 30mins' },
          { direction: 'From St. Thomas Mount', firstTrain: '04:51Hrs', lastTrain: '23:07Hrs', nonPeakFrequency: '0500-1200Hrs & 2000-2200 Every 20 mins', peakFrequency: '1200-2000Hrs Every 14 mins', extendedNonPeak: '2200-2300Hrs Every 30mins' },
        ],
      },
    },
  };

  const getCurrentSchedule = () => {
    const today = new Date().getDay();
    if (today === 0) return metroSchedule.sunday;
    if (today === 6) return metroSchedule.saturday;
    return metroSchedule.weekdays;
  };

  const getCorridorColor = (key) => {
    if (key.includes('blue')) return '#007bff';
    if (key.includes('green')) return '#28a745';
    return '#17a2b8';
  };

  const getCorridorLabel = (key) => {
    if (key.includes('blue')) return 'CORRIDOR - 1 (BLUE LINE)';
    if (key.includes('green')) return 'CORRIDOR - 2 (GREEN LINE)';
    return 'INTER-CORRIDOR';
  };

  const getDayLabel = () => {
    const day = new Date().getDay();
    if (day === 0) return 'SUNDAY / HOLIDAYS';
    if (day === 6) return 'SATURDAY';
    return 'WEEKDAYS (MONDAY - FRIDAY)';
  };

  const getFacilityIcon = (f) => {
    if (f === 'Escalator') return '🔄';
    if (f === 'Lift') return '⬆️';
    if (f === 'Parking') return '🚗';
    if (f === 'Food Court') return '🍽️';
    if (f === 'Airport Shuttle') return '✈️';
    return '';
  };

  // ─── Station Dropdown Renderer ────────────────────────────────────────
  const renderStationDropdown = (type) => {
    const results = searchResults[type];
    if (!results || results.length === 0 || !showDropdown[type]) return null;

    const blueStations = results.filter(s => s.line === 'Blue');
    const greenStations = results.filter(s => s.line === 'Green');

    return (
      <View style={[styles.dropdown, { backgroundColor: isDark ? '#1e1e1e' : '#fff', borderColor: isDark ? '#444' : '#ddd' }]}>
        <View style={[styles.dropdownHeader, { backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5' }]}>
          <Text style={[styles.dropdownHeaderText, { color: isDark ? '#fff' : '#333' }]}>
            Select {type === 'from' ? 'Departure' : 'Destination'} Station ({results.length} stations)
          </Text>
          <TouchableOpacity onPress={() => { setShowDropdown(p => ({ ...p, [type]: false })); setSearchResults(p => ({ ...p, [type]: [] })); }}>
            <Text style={{ fontSize: 18, color: isDark ? '#aaa' : '#666' }}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled>
          {blueStations.length > 0 && (
            <>
              <View style={[styles.lineSeparator, { backgroundColor: '#007bff20' }]}>
                <Text style={[styles.lineBadge, { backgroundColor: '#007bff', color: '#fff' }]}>Blue Line Stations ({blueStations.length})</Text>
              </View>
              {blueStations.map((station, index) => (
                <TouchableOpacity key={`blue-${index}`} style={[styles.stationItem, { borderBottomColor: isDark ? '#333' : '#eee' }]} onPress={() => selectStation(station, type)}>
                  <Text style={[styles.stationName, { color: isDark ? '#fff' : '#333' }]}>{station.name}</Text>
                  <View style={styles.stationDetails}>
                    <Text style={[styles.stationCode, { color: isDark ? '#aaa' : '#666' }]}>({station.code})</Text>
                    <View style={[styles.lineBadgeSmall, { backgroundColor: '#007bff' }]}>
                      <Text style={styles.lineBadgeSmallText}>Blue Line</Text>
                    </View>
                    <Text style={[styles.zoneInfo, { color: isDark ? '#aaa' : '#888' }]}>Zone {station.zone}</Text>
                  </View>
                  {station.facilities && station.facilities.length > 0 && (
                    <View style={styles.facilitiesRow}>
                      {station.facilities.slice(0, 3).map((f, idx) => (
                        <View key={idx} style={[styles.facilityBadge, { backgroundColor: isDark ? '#333' : '#f0f0f0' }]}>
                          <Text style={{ fontSize: 11, color: isDark ? '#ccc' : '#555' }}>{getFacilityIcon(f)} {f}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </>
          )}

          {greenStations.length > 0 && (
            <>
              <View style={[styles.lineSeparator, { backgroundColor: '#28a74520' }]}>
                <Text style={[styles.lineBadge, { backgroundColor: '#28a745', color: '#fff' }]}>Green Line Stations ({greenStations.length})</Text>
              </View>
              {greenStations.map((station, index) => (
                <TouchableOpacity key={`green-${index}`} style={[styles.stationItem, { borderBottomColor: isDark ? '#333' : '#eee' }]} onPress={() => selectStation(station, type)}>
                  <Text style={[styles.stationName, { color: isDark ? '#fff' : '#333' }]}>{station.name}</Text>
                  <View style={styles.stationDetails}>
                    <Text style={[styles.stationCode, { color: isDark ? '#aaa' : '#666' }]}>({station.code})</Text>
                    <View style={[styles.lineBadgeSmall, { backgroundColor: '#28a745' }]}>
                      <Text style={styles.lineBadgeSmallText}>Green Line</Text>
                    </View>
                    <Text style={[styles.zoneInfo, { color: isDark ? '#aaa' : '#888' }]}>Zone {station.zone}</Text>
                  </View>
                  {station.facilities && station.facilities.length > 0 && (
                    <View style={styles.facilitiesRow}>
                      {station.facilities.slice(0, 3).map((f, idx) => (
                        <View key={idx} style={[styles.facilityBadge, { backgroundColor: isDark ? '#333' : '#f0f0f0' }]}>
                          <Text style={{ fontSize: 11, color: isDark ? '#ccc' : '#555' }}>{getFacilityIcon(f)} {f}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
      </View>
    );
  };

  // ─── RENDER ───────────────────────────────────────────────────────────
  return (
    <ScrollView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#f5f7fa' }]} nestedScrollEnabled>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: isDark ? '#fff' : '#1a1a2e' }]}>Chennai Metro Navigation</Text>
        {metroStatus && (
          <View style={styles.statusRow}>
            <Text style={{ fontSize: 14, color: metroStatus.operational ? '#28a745' : '#dc3545' }}>
              {metroStatus.operational ? '🟢 Operational' : '🔴 Disrupted'}
            </Text>
            <Text style={{ fontSize: 11, color: isDark ? '#aaa' : '#888', marginLeft: 8 }}>
              Updated: {new Date(metroStatus.timestamp).toLocaleTimeString('en-IN')}
            </Text>
          </View>
        )}
      </View>

      {/* View Metro Schedule Button */}
      <TouchableOpacity
        style={styles.scheduleButton}
        onPress={() => setShowSchedule(!showSchedule)}
        activeOpacity={0.8}
      >
        <Text style={styles.scheduleButtonText}>📅 {showSchedule ? 'Hide Metro Schedule' : 'View Metro Schedule'}</Text>
      </TouchableOpacity>

      {/* Metro Schedule Display */}
      {showSchedule && (
        <View style={[styles.scheduleContainer, { borderColor: '#007bff', backgroundColor: isDark ? '#1a1a2e' : '#fff' }]}>
          {/* Schedule Header */}
          <View style={styles.scheduleHeader}>
            <Text style={styles.scheduleHeaderTitle}>Chennai Metro Timetable</Text>
            <Text style={styles.scheduleHeaderSub}>{getDayLabel()} | 05:00hrs - 23:00hrs</Text>
          </View>

          {Object.entries(getCurrentSchedule()).map(([corridorKey, corridor]) => (
            <View key={corridorKey} style={[styles.corridorBlock, { borderColor: isDark ? '#333' : '#ddd' }]}>
              {/* Corridor Header */}
              <View style={[styles.corridorHeader, { backgroundColor: getCorridorColor(corridorKey) }]}>
                <Text style={styles.corridorHeaderText}>{getCorridorLabel(corridorKey)}</Text>
              </View>
              {/* Route Title */}
              <View style={[styles.routeTitle, { backgroundColor: getCorridorColor(corridorKey) + 'cc' }]}>
                <Text style={styles.routeTitleText}>{corridor.route}</Text>
              </View>

              {/* Schedule Table */}
              {/* Table Header */}
              <View style={[styles.tableRow, styles.tableHeaderRow, { backgroundColor: isDark ? '#2a2a2e' : '#f0f0f0' }]}>
                <Text style={[styles.tableCell, styles.tableCellHeader, { color: isDark ? '#fff' : '#333' }]}>First Train</Text>
                <Text style={[styles.tableCell, styles.tableCellHeader, { color: isDark ? '#fff' : '#333' }]}>Last Train</Text>
                <Text style={[styles.tableCell, styles.tableCellHeader, { color: isDark ? '#fff' : '#333' }]}>Non-Peak</Text>
                <Text style={[styles.tableCell, styles.tableCellHeader, { color: isDark ? '#fff' : '#333' }]}>Peak</Text>
              </View>

              {corridor.schedule.map((s, index) => (
                <View key={index} style={[styles.tableRow, { borderBottomColor: isDark ? '#333' : '#eee' }]}>
                  <View style={styles.tableCell}>
                    <Text style={[styles.tableCellBold, { color: isDark ? '#ccc' : '#333' }]}>{s.direction}:</Text>
                    <Text style={[styles.tableCellText, { color: isDark ? '#aaa' : '#555' }]}>{s.firstTrain}</Text>
                  </View>
                  <View style={styles.tableCell}>
                    <Text style={[styles.tableCellBold, { color: isDark ? '#ccc' : '#333' }]}>{s.direction}:</Text>
                    <Text style={[styles.tableCellText, { color: isDark ? '#aaa' : '#555' }]}>{s.lastTrain}</Text>
                  </View>
                  <View style={styles.tableCell}>
                    <Text style={[styles.tableCellText, { color: isDark ? '#aaa' : '#555', fontSize: 10 }]}>{s.nonPeakFrequency}</Text>
                    {s.extendedNonPeak && (
                      <Text style={{ color: '#dc3545', fontWeight: '600', fontSize: 10, marginTop: 2 }}>{s.extendedNonPeak}</Text>
                    )}
                  </View>
                  <View style={styles.tableCell}>
                    <Text style={[styles.tableCellText, { color: isDark ? '#aaa' : '#555', fontSize: 10 }]}>{s.peakFrequency}</Text>
                    {s.specialNote && (
                      <Text style={{ color: '#28a745', fontSize: 10, marginTop: 2 }}>{s.specialNote}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ))}

          {/* Schedule Notes */}
          <View style={[styles.scheduleNotes, { backgroundColor: isDark ? '#1e1e2e' : '#f8f9fa', borderColor: isDark ? '#333' : '#ddd' }]}>
            <Text style={[styles.noteText, { color: isDark ? '#ccc' : '#333' }]}>
              <Text style={{ fontWeight: '700' }}>NOTE:</Text>
              {'\n'}1. Headway from Central ↔ Alandur (via CMBT) during peak hours, Non peak hours &{' '}
              <Text style={{ color: '#dc3545', fontWeight: '600' }}>Extended Non peak hours</Text> are maintained 6 mins, 7 mins and{' '}
              <Text style={{ color: '#dc3545', fontWeight: '600' }}>15 mins</Text> respectively.
              {'\n'}2. No short loop service on {new Date().getDay() === 6 ? 'Saturdays' : new Date().getDay() === 0 ? 'Sundays' : 'Saturdays'}.
            </Text>
          </View>
        </View>
      )}

      {/* From Station Input */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: isDark ? '#ccc' : '#555' }]}>From Station</Text>
        <TextInput
          style={[styles.input, { backgroundColor: isDark ? '#1e1e1e' : '#fff', color: isDark ? '#fff' : '#333', borderColor: isDark ? '#444' : '#ddd' }]}
          value={fromStation}
          onChangeText={(t) => { setFromStation(t); handleStationSearch(t, 'from'); }}
          onFocus={() => handleInputFocus('from')}
          placeholder="Enter departure station"
          placeholderTextColor={isDark ? '#666' : '#aaa'}
        />
        {renderStationDropdown('from')}
      </View>

      {/* To Station Input */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: isDark ? '#ccc' : '#555' }]}>To Station</Text>
        <TextInput
          style={[styles.input, { backgroundColor: isDark ? '#1e1e1e' : '#fff', color: isDark ? '#fff' : '#333', borderColor: isDark ? '#444' : '#ddd' }]}
          value={toStation}
          onChangeText={(t) => { setToStation(t); handleStationSearch(t, 'to'); }}
          onFocus={() => handleInputFocus('to')}
          placeholder="Enter destination station"
          placeholderTextColor={isDark ? '#666' : '#aaa'}
        />
        {renderStationDropdown('to')}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.btnPrimary, (!fromStation || !toStation || loading) && styles.btnDisabled]}
          onPress={findMetroRoute}
          disabled={loading || !fromStation || !toStation}
        >
          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnPrimaryText}>{loading ? 'Finding Route...' : 'Find Metro Route'}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btnSecondary, { borderColor: isDark ? '#555' : '#ccc' }]} onPress={clearRoute}>
          <Text style={[styles.btnSecondaryText, { color: isDark ? '#ccc' : '#555' }]}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* Error */}
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Live Timings */}
      {liveTimings && (
        <View style={[styles.section, { backgroundColor: isDark ? '#1a1a2e' : '#fff', borderColor: isDark ? '#333' : '#ddd' }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#1a1a2e' }]}>Live Timings - {liveTimings.station}</Text>
          <Text style={{ fontSize: 12, color: isDark ? '#aaa' : '#888', marginBottom: 12 }}>Last updated: {liveTimings.lastUpdated}</Text>
          {liveTimings.timings.map((timing, index) => (
            <View key={index} style={[styles.timingItem, { borderBottomColor: isDark ? '#333' : '#eee' }]}>
              <View style={styles.timingRow}>
                <View style={[styles.lineBadgeSmall, { backgroundColor: timing.line === 'Blue' ? '#007bff' : '#28a745' }]}>
                  <Text style={styles.lineBadgeSmallText}>{timing.line} Line</Text>
                </View>
                <Text style={[styles.timingDirection, { color: isDark ? '#ccc' : '#555' }]}>{timing.direction}</Text>
              </View>
              <View style={styles.timingRow}>
                <Text style={[styles.arrivalTime, { color: isDark ? '#fff' : '#333' }]}>{timing.arrival}</Text>
                <Text style={styles.minutesAway}>{timing.minutesAway} min</Text>
                <Text style={[styles.platform, { color: isDark ? '#aaa' : '#666' }]}>{timing.platform}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Route Information */}
      {routeInfo && (
        <View style={[styles.section, { backgroundColor: isDark ? '#1a1a2e' : '#fff', borderColor: isDark ? '#333' : '#ddd' }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#1a1a2e' }]}>Metro Route Details</Text>

          {/* Route From → To */}
          <View style={styles.routeStations}>
            <Text style={[styles.routeStationText, { color: '#007bff' }]}>{routeInfo.from}</Text>
            <Text style={{ fontSize: 18, color: isDark ? '#888' : '#999', marginHorizontal: 8 }}>→</Text>
            <Text style={[styles.routeStationText, { color: '#28a745' }]}>{routeInfo.to}</Text>
          </View>

          {/* Details Grid */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: isDark ? '#aaa' : '#888' }]}>Duration</Text>
              <Text style={[styles.detailValue, { color: isDark ? '#fff' : '#333' }]}>{routeInfo.duration} minutes</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: isDark ? '#aaa' : '#888' }]}>Distance</Text>
              <Text style={[styles.detailValue, { color: isDark ? '#fff' : '#333' }]}>{routeInfo.distance} km</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: isDark ? '#aaa' : '#888' }]}>Line</Text>
              <Text style={[styles.detailValue, { color: routeInfo.line === 'Blue' ? '#007bff' : routeInfo.line === 'Green' ? '#28a745' : '#17a2b8' }]}>{routeInfo.line}</Text>
            </View>
            {routeInfo.interchange && (
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: isDark ? '#aaa' : '#888' }]}>Interchange</Text>
                <Text style={{ color: '#ff6b35', fontWeight: '600', fontSize: 14 }}>Required</Text>
              </View>
            )}
          </View>

          {/* Fare Information */}
          <Text style={[styles.subSectionTitle, { color: isDark ? '#fff' : '#1a1a2e' }]}>Fare Information</Text>
          <View style={styles.fareRow}>
            <View style={[styles.fareCard, { backgroundColor: isDark ? '#252540' : '#f0f4ff' }]}>
              <Text style={[styles.fareType, { color: isDark ? '#aaa' : '#555' }]}>Token</Text>
              <Text style={[styles.farePrice, { color: isDark ? '#fff' : '#007bff' }]}>{MetroService.formatPrice(routeInfo.fare.token)}</Text>
            </View>
            <View style={[styles.fareCard, { backgroundColor: isDark ? '#1a3a1a' : '#f0fff0' }]}>
              <Text style={[styles.fareType, { color: isDark ? '#aaa' : '#555' }]}>Metro Card</Text>
              <Text style={[styles.farePrice, { color: isDark ? '#4caf50' : '#28a745' }]}>{MetroService.formatPrice(routeInfo.fare.card)}</Text>
              <Text style={{ fontSize: 11, color: '#28a745', marginTop: 2 }}>(Save ₹{routeInfo.fare.token - routeInfo.fare.card})</Text>
            </View>
          </View>

          {/* Accessibility Features */}
          <Text style={[styles.subSectionTitle, { color: isDark ? '#fff' : '#1a1a2e' }]}>Accessibility Features</Text>
          <View style={styles.accessibilityRow}>
            <View style={[styles.featureBadge, { backgroundColor: routeInfo.accessibility.wheelchairAccessible ? '#28a74520' : '#dc354520', borderColor: routeInfo.accessibility.wheelchairAccessible ? '#28a745' : '#dc3545' }]}>
              <Text style={{ fontSize: 18 }}>♿</Text>
              <Text style={{ fontSize: 12, color: routeInfo.accessibility.wheelchairAccessible ? '#28a745' : '#dc3545', marginTop: 2 }}>Wheelchair</Text>
            </View>
            <View style={[styles.featureBadge, { backgroundColor: routeInfo.accessibility.escalators ? '#28a74520' : '#dc354520', borderColor: routeInfo.accessibility.escalators ? '#28a745' : '#dc3545' }]}>
              <Text style={{ fontSize: 18 }}>🔄</Text>
              <Text style={{ fontSize: 12, color: routeInfo.accessibility.escalators ? '#28a745' : '#dc3545', marginTop: 2 }}>Escalators</Text>
            </View>
            <View style={[styles.featureBadge, { backgroundColor: routeInfo.accessibility.parking ? '#28a74520' : '#dc354520', borderColor: routeInfo.accessibility.parking ? '#28a745' : '#dc3545' }]}>
              <Text style={{ fontSize: 18 }}>🚗</Text>
              <Text style={{ fontSize: 12, color: routeInfo.accessibility.parking ? '#28a745' : '#dc3545', marginTop: 2 }}>Parking</Text>
            </View>
          </View>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { marginBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },

  scheduleButton: {
    backgroundColor: '#007bff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#007bff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  scheduleButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  scheduleContainer: { borderWidth: 2, borderRadius: 16, padding: 16, marginBottom: 24 },
  scheduleHeader: {
    backgroundColor: '#007bff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  scheduleHeaderTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 6 },
  scheduleHeaderSub: { color: '#ffffffcc', fontSize: 14 },

  corridorBlock: { marginBottom: 24, borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  corridorHeader: { padding: 12, alignItems: 'center' },
  corridorHeaderText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  routeTitle: { padding: 10, alignItems: 'center' },
  routeTitleText: { color: '#fff', fontSize: 12, fontWeight: '600', textAlign: 'center' },

  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tableHeaderRow: { borderBottomWidth: 2 },
  tableCell: { flex: 1, padding: 8 },
  tableCellHeader: { fontWeight: '600', fontSize: 11, textAlign: 'center' },
  tableCellBold: { fontWeight: '600', fontSize: 10, marginBottom: 2 },
  tableCellText: { fontSize: 10 },

  scheduleNotes: { borderWidth: 1, borderRadius: 8, padding: 12, marginTop: 8 },
  noteText: { fontSize: 12, lineHeight: 18 },

  inputGroup: { marginBottom: 12, zIndex: 10 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 },

  dropdown: { borderWidth: 1, borderRadius: 10, marginTop: 4, overflow: 'hidden' },
  dropdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  dropdownHeaderText: { fontSize: 13, fontWeight: '600' },

  lineSeparator: { padding: 8 },
  lineBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, fontSize: 12, fontWeight: '600', overflow: 'hidden' },
  lineBadgeSmall: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginHorizontal: 4 },
  lineBadgeSmallText: { color: '#fff', fontSize: 10, fontWeight: '600' },

  stationItem: { padding: 12, borderBottomWidth: 1 },
  stationName: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  stationDetails: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  stationCode: { fontSize: 12 },
  zoneInfo: { fontSize: 11, marginLeft: 4 },
  facilitiesRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  facilityBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 4, marginBottom: 2 },

  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 16, marginTop: 4 },
  btnPrimary: { flex: 1, backgroundColor: '#007bff', borderRadius: 10, padding: 14, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  btnSecondary: { borderWidth: 1, borderRadius: 10, padding: 14, alignItems: 'center', paddingHorizontal: 20 },
  btnSecondaryText: { fontSize: 15, fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },

  errorBox: { backgroundColor: '#dc354520', borderRadius: 8, padding: 12, marginBottom: 12 },
  errorText: { color: '#dc3545', fontSize: 13 },

  section: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  subSectionTitle: { fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 10 },

  timingItem: { paddingVertical: 10, borderBottomWidth: 1 },
  timingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  timingDirection: { fontSize: 13, marginLeft: 8 },
  arrivalTime: { fontSize: 16, fontWeight: '700', marginRight: 8 },
  minutesAway: { fontSize: 13, color: '#007bff', fontWeight: '600', marginRight: 8 },
  platform: { fontSize: 12 },

  routeStations: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16, flexWrap: 'wrap' },
  routeStationText: { fontSize: 16, fontWeight: '700' },

  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  detailItem: { width: '47%', marginBottom: 8 },
  detailLabel: { fontSize: 12, marginBottom: 2 },
  detailValue: { fontSize: 15, fontWeight: '600' },

  fareRow: { flexDirection: 'row', gap: 10 },
  fareCard: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  fareType: { fontSize: 12, marginBottom: 4 },
  farePrice: { fontSize: 20, fontWeight: '700' },

  accessibilityRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  featureBadge: { alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, width: 90 },
});

export default MetroNavigation;
