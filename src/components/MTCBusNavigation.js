import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { usePreferences } from '../context/PreferencesContext';
import MTCBusService from '../services/MTCBusService';

const MTCBusNavigation = () => {
  const { preferences } = usePreferences();
  const isDark = preferences.theme === 'dark';

  const [fromArea, setFromArea] = useState('');
  const [toArea, setToArea] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ from: [], to: [], routes: [], areas: [], stops: [] });
  const [busRoutes, setBusRoutes] = useState([]);
  const [liveBusTimings, setLiveBusTimings] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [activeTab, setActiveTab] = useState('route-search');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDropdown, setShowDropdown] = useState({ from: false, to: false, search: false });
  const [mtcStatus, setMtcStatus] = useState(null);

  const allAreas = useMemo(() => MTCBusService.getAllAreas(), []);

  useEffect(() => {
    const fetchMTCStatus = async () => {
      try {
        const status = await MTCBusService.getMTCStatus();
        setMtcStatus(status);
      } catch (err) {
        console.error('Failed to fetch MTC status:', err);
      }
    };
    fetchMTCStatus();
  }, []);

  const handleAreaSearch = useCallback((query, type) => {
    if (!query) {
      setSearchResults(prev => ({ ...prev, [type]: [] }));
      return;
    }
    const areas = allAreas.filter(a => a.toLowerCase().includes(query.toLowerCase()));
    setSearchResults(prev => ({ ...prev, [type]: areas.slice(0, 8) }));
  }, [allAreas]);

  const handleGeneralSearch = useCallback((query) => {
    if (!query || query.length < 2) {
      setSearchResults(prev => ({ ...prev, routes: [], areas: [], stops: [] }));
      return;
    }
    const results = MTCBusService.searchAll(query);
    setSearchResults(prev => ({ ...prev, ...results }));
  }, []);

  const selectArea = (area, type) => {
    if (type === 'from') {
      setFromArea(area);
      setShowDropdown(prev => ({ ...prev, from: false }));
    } else {
      setToArea(area);
      setShowDropdown(prev => ({ ...prev, to: false }));
    }
    setSearchResults(prev => ({ ...prev, [type]: [] }));
  };

  const searchBusRoutes = async () => {
    if (!fromArea || !toArea) {
      setError('Please select both starting point and destination');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const routes = MTCBusService.getRoutesBetween(fromArea, toArea);
      setBusRoutes(routes);
      if (routes.length === 0) {
        setError('No direct bus routes found. Try searching nearby areas or use connecting routes.');
      }
    } catch (err) {
      setError('Failed to find bus routes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadLiveBusTimings = async (busStop) => {
    setLoading(true);
    try {
      const timings = await MTCBusService.getLiveBusTimings(busStop);
      setLiveBusTimings(timings);
    } catch (err) {
      setError('Failed to load live bus timings');
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setFromArea('');
    setToArea('');
    setSearchQuery('');
    setBusRoutes([]);
    setLiveBusTimings(null);
    setSelectedRoute(null);
    setError('');
    setSearchResults({ from: [], to: [], routes: [], areas: [], stops: [] });
  };

  const getAccessibilityIcon = (feature) => {
    if (feature === 'Low Floor' || feature === 'Wheelchair Accessible') return '♿';
    if (feature === 'AC Available' || feature === 'AC') return '❄️';
    if (feature === 'USB Charging') return '🔌';
    return '';
  };

  const getRouteTypeColor = (type) => {
    switch (type.toLowerCase()) {
      case 'express': return '#007bff';
      case 'deluxe': return '#6f42c1';
      case 'ordinary': return '#28a745';
      default: return '#6c757d';
    }
  };

  // ─── Dropdown Renderer ────────────────────────────────────────────────
  const renderAreaDropdown = (type) => {
    const results = searchResults[type];
    if (!results || results.length === 0 || !showDropdown[type]) return null;

    return (
      <View style={[styles.dropdown, { backgroundColor: isDark ? '#1e1e1e' : '#fff', borderColor: isDark ? '#444' : '#ddd' }]}>
        <View style={[styles.dropdownHeader, { backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5' }]}>
          <Text style={[styles.dropdownHeaderText, { color: isDark ? '#fff' : '#333' }]}>Areas ({results.length})</Text>
          <TouchableOpacity onPress={() => setShowDropdown(p => ({ ...p, [type]: false }))}>
            <Text style={{ fontSize: 18, color: isDark ? '#aaa' : '#666' }}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
          {results.map((area, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.dropdownItem, { borderBottomColor: isDark ? '#333' : '#eee' }]}
              onPress={() => selectArea(area, type)}
            >
              <Text style={{ color: isDark ? '#fff' : '#333', fontSize: 14 }}>📍 {area}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // ─── TABS ─────────────────────────────────────────────────────────────
  const tabs = [
    { key: 'route-search', label: 'Route Search' },
    { key: 'live-timings', label: 'Live Timings' },
    { key: 'route-info', label: 'Route Info' },
  ];

  // ─── RENDER ───────────────────────────────────────────────────────────
  return (
    <ScrollView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#f5f7fa' }]} nestedScrollEnabled>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: isDark ? '#fff' : '#1a1a2e' }]}>MTC Bus Services</Text>
        {mtcStatus && (
          <View style={styles.statusSection}>
            <Text style={{ fontSize: 14, color: mtcStatus.operational ? '#28a745' : '#dc3545' }}>
              {mtcStatus.operational ? '🟢 Operational' : '🔴 Disrupted'}
            </Text>
            <Text style={{ fontSize: 11, color: isDark ? '#aaa' : '#888', marginTop: 2 }}>
              {mtcStatus.totalBuses} Buses • {mtcStatus.totalRoutes} Routes
            </Text>
          </View>
        )}
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabRow}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabButtonText, activeTab === tab.key && styles.tabButtonTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ─── Route Search Tab ──────────────────────────────────────────── */}
      {activeTab === 'route-search' && (
        <View>
          <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#1a1a2e' }]}>Find Bus Routes</Text>

          {/* From */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: isDark ? '#ccc' : '#555' }]}>From</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#1e1e1e' : '#fff', color: isDark ? '#fff' : '#333', borderColor: isDark ? '#444' : '#ddd' }]}
              value={fromArea}
              onChangeText={(t) => { setFromArea(t); handleAreaSearch(t, 'from'); setShowDropdown(p => ({ ...p, from: true })); }}
              onFocus={() => { handleAreaSearch(fromArea, 'from'); setShowDropdown(p => ({ ...p, from: true })); }}
              placeholder="Enter starting area"
              placeholderTextColor={isDark ? '#666' : '#aaa'}
            />
            {renderAreaDropdown('from')}
          </View>

          {/* To */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: isDark ? '#ccc' : '#555' }]}>To</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#1e1e1e' : '#fff', color: isDark ? '#fff' : '#333', borderColor: isDark ? '#444' : '#ddd' }]}
              value={toArea}
              onChangeText={(t) => { setToArea(t); handleAreaSearch(t, 'to'); setShowDropdown(p => ({ ...p, to: true })); }}
              onFocus={() => { handleAreaSearch(toArea, 'to'); setShowDropdown(p => ({ ...p, to: true })); }}
              placeholder="Enter destination area"
              placeholderTextColor={isDark ? '#666' : '#aaa'}
            />
            {renderAreaDropdown('to')}
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.btnPrimary, (!fromArea || !toArea || loading) && styles.btnDisabled]}
              onPress={searchBusRoutes}
              disabled={loading || !fromArea || !toArea}
            >
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnPrimaryText}>Find Bus Routes</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnSecondary, { borderColor: isDark ? '#555' : '#ccc' }]} onPress={clearSearch}>
              <Text style={[styles.btnSecondaryText, { color: isDark ? '#ccc' : '#555' }]}>Clear</Text>
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Bus Routes Results */}
          {busRoutes.length > 0 && (
            <View>
              <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#1a1a2e' }]}>Available Bus Routes ({busRoutes.length})</Text>
              {busRoutes.map((route, index) => (
                <View key={index} style={[styles.routeCard, { backgroundColor: isDark ? '#1a1a2e' : '#fff', borderColor: isDark ? '#333' : '#ddd' }]}>
                  <View style={styles.routeCardHeader}>
                    <View style={[styles.routeNumberBadge, { backgroundColor: getRouteTypeColor(route.type) }]}>
                      <Text style={styles.routeNumberText}>{route.routeNumber}</Text>
                    </View>
                    <View style={[styles.routeTypeBadge, { backgroundColor: getRouteTypeColor(route.type) + '20', borderColor: getRouteTypeColor(route.type) }]}>
                      <Text style={[styles.routeTypeText, { color: getRouteTypeColor(route.type) }]}>{route.type}</Text>
                    </View>
                    <Text style={[styles.routeTime, { color: isDark ? '#4caf50' : '#28a745' }]}>~{route.estimatedTime} min</Text>
                  </View>

                  <Text style={[styles.routeName, { color: isDark ? '#ccc' : '#555' }]}>{route.name}</Text>

                  <View style={styles.routePath}>
                    <Text style={[styles.routeStop, { color: isDark ? '#fff' : '#333' }]}>{route.fromStop}</Text>
                    <Text style={{ color: isDark ? '#666' : '#999', marginHorizontal: 6 }}>→</Text>
                    <Text style={[styles.routeStop, { color: isDark ? '#fff' : '#333' }]}>{route.toStop}</Text>
                  </View>

                  <View style={styles.routeInfoRow}>
                    <Text style={[styles.routeInfoItem, { color: isDark ? '#aaa' : '#666' }]}>Every {route.frequency}</Text>
                    <Text style={[styles.routeInfoItem, { color: isDark ? '#4caf50' : '#28a745' }]}>₹{route.fare.ordinary} - ₹{route.fare.deluxe}</Text>
                    <Text style={[styles.routeInfoItem, { color: isDark ? '#aaa' : '#666' }]}>{route.operatingHours}</Text>
                  </View>

                  {route.accessibility && route.accessibility.length > 0 && (
                    <View style={styles.accessibilityTags}>
                      {route.accessibility.map((feature, idx) => (
                        <View key={idx} style={[styles.accessibilityTag, { backgroundColor: isDark ? '#333' : '#e8f5e9' }]}>
                          <Text style={{ fontSize: 12, color: isDark ? '#ccc' : '#2e7d32' }}>{getAccessibilityIcon(feature)} {feature}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* ─── Live Timings Tab ──────────────────────────────────────────── */}
      {activeTab === 'live-timings' && (
        <View>
          <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#1a1a2e' }]}>Live Bus Timings</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: isDark ? '#ccc' : '#555' }]}>Select Bus Stop</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#1e1e1e' : '#fff', color: isDark ? '#fff' : '#333', borderColor: isDark ? '#444' : '#ddd' }]}
              value={searchQuery}
              onChangeText={(t) => { setSearchQuery(t); handleGeneralSearch(t); setShowDropdown(p => ({ ...p, search: true })); }}
              placeholder="Search bus stops, areas, or routes"
              placeholderTextColor={isDark ? '#666' : '#aaa'}
            />

            {(searchResults.stops.length > 0 || searchResults.areas.length > 0) && showDropdown.search && (
              <View style={[styles.dropdown, { backgroundColor: isDark ? '#1e1e1e' : '#fff', borderColor: isDark ? '#444' : '#ddd' }]}>
                <View style={[styles.dropdownHeader, { backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5' }]}>
                  <Text style={[styles.dropdownHeaderText, { color: isDark ? '#fff' : '#333' }]}>Search Results</Text>
                  <TouchableOpacity onPress={() => setShowDropdown(p => ({ ...p, search: false }))}>
                    <Text style={{ fontSize: 18, color: isDark ? '#aaa' : '#666' }}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled>
                  {searchResults.stops.length > 0 && (
                    <>
                      <View style={[styles.dropdownSubHeader, { backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0' }]}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? '#aaa' : '#666' }}>Bus Stops</Text>
                      </View>
                      {searchResults.stops.map((stop, index) => (
                        <TouchableOpacity
                          key={`stop-${index}`}
                          style={[styles.dropdownItem, { borderBottomColor: isDark ? '#333' : '#eee' }]}
                          onPress={() => { setSearchQuery(stop); loadLiveBusTimings(stop); setShowDropdown(p => ({ ...p, search: false })); }}
                        >
                          <Text style={{ color: isDark ? '#fff' : '#333', fontSize: 14 }}>🚏 {stop}</Text>
                        </TouchableOpacity>
                      ))}
                    </>
                  )}
                  {searchResults.areas.length > 0 && (
                    <>
                      <View style={[styles.dropdownSubHeader, { backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0' }]}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? '#aaa' : '#666' }}>Areas</Text>
                      </View>
                      {searchResults.areas.map((area, index) => (
                        <TouchableOpacity
                          key={`area-${index}`}
                          style={[styles.dropdownItem, { borderBottomColor: isDark ? '#333' : '#eee' }]}
                          onPress={() => { setSearchQuery(area); loadLiveBusTimings(area); setShowDropdown(p => ({ ...p, search: false })); }}
                        >
                          <Text style={{ color: isDark ? '#fff' : '#333', fontSize: 14 }}>📍 {area}</Text>
                        </TouchableOpacity>
                      ))}
                    </>
                  )}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Live Timings Display */}
          {liveBusTimings && (
            <View style={[styles.section, { backgroundColor: isDark ? '#1a1a2e' : '#fff', borderColor: isDark ? '#333' : '#ddd' }]}>
              <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#1a1a2e' }]}>🚏 {liveBusTimings.busStop}</Text>
              <Text style={{ fontSize: 12, color: isDark ? '#aaa' : '#888', marginBottom: 12 }}>Last updated: {liveBusTimings.lastUpdated}</Text>

              {liveBusTimings.timings.map((timing, index) => (
                <View key={index} style={[styles.timingCard, { backgroundColor: isDark ? '#252540' : '#f8f9fa', borderColor: isDark ? '#333' : '#eee' }]}>
                  <View style={styles.timingCardHeader}>
                    <View style={[styles.routeNumberBadge, { backgroundColor: getRouteTypeColor(timing.type) }]}>
                      <Text style={styles.routeNumberText}>{timing.routeNumber}</Text>
                    </View>
                    <View style={[styles.routeTypeBadge, { backgroundColor: getRouteTypeColor(timing.type) + '20', borderColor: getRouteTypeColor(timing.type) }]}>
                      <Text style={[styles.routeTypeText, { color: getRouteTypeColor(timing.type) }]}>{timing.type}</Text>
                    </View>
                    <View style={{ marginLeft: 'auto', alignItems: 'flex-end' }}>
                      <Text style={[styles.nextArrival, { color: isDark ? '#fff' : '#333' }]}>{timing.nextArrival}</Text>
                      <Text style={styles.minutesAway}>{timing.minutesAway} min away</Text>
                    </View>
                  </View>

                  <Text style={[styles.routeName, { color: isDark ? '#ccc' : '#555' }]}>{timing.routeName}</Text>

                  <View style={styles.timingDetailsRow}>
                    <Text style={[styles.routeInfoItem, { color: isDark ? '#aaa' : '#666' }]}>Every {timing.frequency}</Text>
                    <Text style={[styles.routeInfoItem, { color: isDark ? '#4caf50' : '#28a745' }]}>₹{timing.fare.ordinary}</Text>
                  </View>

                  {timing.accessibility && timing.accessibility.length > 0 && (
                    <View style={styles.accessibilityTags}>
                      {timing.accessibility.slice(0, 3).map((feature, idx) => (
                        <View key={idx} style={[styles.accessibilityTag, { backgroundColor: isDark ? '#333' : '#e8f5e9' }]}>
                          <Text style={{ fontSize: 11, color: isDark ? '#ccc' : '#2e7d32' }}>{getAccessibilityIcon(feature)} {feature}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* ─── Route Info Tab ────────────────────────────────────────────── */}
      {activeTab === 'route-info' && (
        <View>
          <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#1a1a2e' }]}>Route Information</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: isDark ? '#ccc' : '#555' }]}>Search Routes</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#1e1e1e' : '#fff', color: isDark ? '#fff' : '#333', borderColor: isDark ? '#444' : '#ddd' }]}
              value={searchQuery}
              onChangeText={(t) => { setSearchQuery(t); handleGeneralSearch(t); setShowDropdown(p => ({ ...p, search: true })); }}
              placeholder="Search by route number, name, or area"
              placeholderTextColor={isDark ? '#666' : '#aaa'}
            />

            {searchResults.routes.length > 0 && showDropdown.search && (
              <View style={[styles.dropdown, { backgroundColor: isDark ? '#1e1e1e' : '#fff', borderColor: isDark ? '#444' : '#ddd' }]}>
                <View style={[styles.dropdownHeader, { backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5' }]}>
                  <Text style={[styles.dropdownHeaderText, { color: isDark ? '#fff' : '#333' }]}>Routes ({searchResults.routes.length})</Text>
                  <TouchableOpacity onPress={() => setShowDropdown(p => ({ ...p, search: false }))}>
                    <Text style={{ fontSize: 18, color: isDark ? '#aaa' : '#666' }}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled>
                  {searchResults.routes.map((route, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.dropdownItem, { borderBottomColor: isDark ? '#333' : '#eee' }]}
                      onPress={() => { setSelectedRoute(route); setSearchQuery(`${route.routeNumber} - ${route.name}`); setShowDropdown(p => ({ ...p, search: false })); }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.routeNumberBadgeSmall, { backgroundColor: getRouteTypeColor(route.type) }]}>
                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{route.routeNumber}</Text>
                        </View>
                        <Text style={{ color: isDark ? '#fff' : '#333', fontSize: 13, flex: 1, marginLeft: 8 }}>{route.name}</Text>
                        <View style={[styles.routeTypeBadge, { backgroundColor: getRouteTypeColor(route.type) + '20', borderColor: getRouteTypeColor(route.type) }]}>
                          <Text style={[styles.routeTypeText, { color: getRouteTypeColor(route.type), fontSize: 10 }]}>{route.type}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Selected Route Details */}
          {selectedRoute && (
            <View style={[styles.section, { backgroundColor: isDark ? '#1a1a2e' : '#fff', borderColor: isDark ? '#333' : '#ddd' }]}>
              <View style={styles.routeDetailHeader}>
                <Text style={[styles.routeDetailTitle, { color: isDark ? '#fff' : '#1a1a2e' }]}>
                  Route {selectedRoute.routeNumber}: {selectedRoute.name}
                </Text>
                <View style={[styles.routeTypeBadge, { backgroundColor: getRouteTypeColor(selectedRoute.type) + '20', borderColor: getRouteTypeColor(selectedRoute.type) }]}>
                  <Text style={[styles.routeTypeText, { color: getRouteTypeColor(selectedRoute.type) }]}>{selectedRoute.type}</Text>
                </View>
              </View>

              {/* Service Information */}
              <Text style={[styles.subSectionTitle, { color: isDark ? '#fff' : '#1a1a2e' }]}>Service Information</Text>
              <View style={styles.detailGrid}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: isDark ? '#aaa' : '#888' }]}>Operating Hours:</Text>
                  <Text style={[styles.detailValue, { color: isDark ? '#fff' : '#333' }]}>{selectedRoute.operatingHours}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: isDark ? '#aaa' : '#888' }]}>Frequency:</Text>
                  <Text style={[styles.detailValue, { color: isDark ? '#fff' : '#333' }]}>{selectedRoute.frequency}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: isDark ? '#aaa' : '#888' }]}>Distance:</Text>
                  <Text style={[styles.detailValue, { color: isDark ? '#fff' : '#333' }]}>{selectedRoute.distance}</Text>
                </View>
              </View>

              {/* Fare Information */}
              <Text style={[styles.subSectionTitle, { color: isDark ? '#fff' : '#1a1a2e' }]}>Fare Information</Text>
              <View style={styles.fareRow}>
                <View style={[styles.fareCard, { backgroundColor: isDark ? '#252540' : '#f0f4ff' }]}>
                  <Text style={[styles.fareType, { color: isDark ? '#aaa' : '#555' }]}>Ordinary</Text>
                  <Text style={[styles.farePrice, { color: isDark ? '#fff' : '#007bff' }]}>₹{selectedRoute.fare.ordinary}</Text>
                </View>
                <View style={[styles.fareCard, { backgroundColor: isDark ? '#1a3a1a' : '#f0fff0' }]}>
                  <Text style={[styles.fareType, { color: isDark ? '#aaa' : '#555' }]}>Deluxe</Text>
                  <Text style={[styles.farePrice, { color: isDark ? '#4caf50' : '#28a745' }]}>₹{selectedRoute.fare.deluxe}</Text>
                </View>
              </View>

              {/* Special Offers */}
              <View style={[styles.specialOffers, { backgroundColor: isDark ? '#1a2e1a' : '#e8f5e9', borderColor: isDark ? '#2e7d32' : '#c8e6c9' }]}>
                <Text style={{ fontSize: 13, color: isDark ? '#a5d6a7' : '#2e7d32', marginBottom: 4 }}>🆓 Free for women (ordinary buses)</Text>
                <Text style={{ fontSize: 13, color: isDark ? '#a5d6a7' : '#2e7d32' }}>♿ Free for disabled with attender</Text>
              </View>

              {/* Key Stops */}
              <Text style={[styles.subSectionTitle, { color: isDark ? '#fff' : '#1a1a2e' }]}>Key Stops</Text>
              <View style={styles.stopsRow}>
                {selectedRoute.keyStops.map((stop, index) => (
                  <View key={index} style={styles.stopItem}>
                    <View style={[styles.stopNumber, { backgroundColor: getRouteTypeColor(selectedRoute.type) }]}>
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{index + 1}</Text>
                    </View>
                    <Text style={[styles.stopName, { color: isDark ? '#fff' : '#333' }]}>{stop}</Text>
                    {index < selectedRoute.keyStops.length - 1 && (
                      <Text style={{ color: isDark ? '#666' : '#ccc', marginHorizontal: 4, fontSize: 12 }}>→</Text>
                    )}
                  </View>
                ))}
              </View>

              {/* Accessibility Features */}
              {selectedRoute.accessibility && selectedRoute.accessibility.length > 0 && (
                <>
                  <Text style={[styles.subSectionTitle, { color: isDark ? '#fff' : '#1a1a2e' }]}>Accessibility Features</Text>
                  <View style={styles.accessibilityTags}>
                    {selectedRoute.accessibility.map((feature, index) => (
                      <View key={index} style={[styles.accessibilityTag, { backgroundColor: isDark ? '#333' : '#e8f5e9' }]}>
                        <Text style={{ fontSize: 13, color: isDark ? '#ccc' : '#2e7d32' }}>{getAccessibilityIcon(feature)} {feature}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>
          )}
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
  statusSection: { marginTop: 6 },

  tabRow: { flexDirection: 'row', marginBottom: 16, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#007bff' },
  tabButton: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: 'transparent' },
  tabButtonActive: { backgroundColor: '#007bff' },
  tabButtonText: { fontSize: 13, fontWeight: '600', color: '#007bff' },
  tabButtonTextActive: { color: '#fff' },

  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  subSectionTitle: { fontSize: 15, fontWeight: '600', marginTop: 16, marginBottom: 8 },

  inputGroup: { marginBottom: 12, zIndex: 10 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 },

  dropdown: { borderWidth: 1, borderRadius: 10, marginTop: 4, overflow: 'hidden' },
  dropdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  dropdownHeaderText: { fontSize: 13, fontWeight: '600' },
  dropdownSubHeader: { padding: 8 },
  dropdownItem: { padding: 12, borderBottomWidth: 1 },

  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 16, marginTop: 4 },
  btnPrimary: { flex: 1, backgroundColor: '#007bff', borderRadius: 10, padding: 14, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  btnSecondary: { borderWidth: 1, borderRadius: 10, padding: 14, alignItems: 'center', paddingHorizontal: 20 },
  btnSecondaryText: { fontSize: 15, fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },

  errorBox: { backgroundColor: '#dc354520', borderRadius: 8, padding: 12, marginBottom: 12 },
  errorText: { color: '#dc3545', fontSize: 13 },

  routeCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12 },
  routeCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  routeNumberBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  routeNumberBadgeSmall: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  routeNumberText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  routeTypeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, marginLeft: 8 },
  routeTypeText: { fontSize: 11, fontWeight: '600' },
  routeTime: { marginLeft: 'auto', fontSize: 14, fontWeight: '700' },
  routeName: { fontSize: 13, marginBottom: 8 },
  routePath: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' },
  routeStop: { fontSize: 13, fontWeight: '600' },
  routeInfoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  routeInfoItem: { fontSize: 12 },

  accessibilityTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  accessibilityTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },

  section: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 16 },

  timingCard: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  timingCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  nextArrival: { fontSize: 15, fontWeight: '700' },
  minutesAway: { fontSize: 12, color: '#007bff', fontWeight: '600' },
  timingDetailsRow: { flexDirection: 'row', gap: 12, marginTop: 4 },

  routeDetailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap' },
  routeDetailTitle: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },

  detailGrid: { marginBottom: 8 },
  detailRow: { flexDirection: 'row', paddingVertical: 4 },
  detailLabel: { fontSize: 13, width: 120 },
  detailValue: { fontSize: 13, fontWeight: '600', flex: 1 },

  fareRow: { flexDirection: 'row', gap: 10 },
  fareCard: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  fareType: { fontSize: 12, marginBottom: 4 },
  farePrice: { fontSize: 22, fontWeight: '700' },

  specialOffers: { borderWidth: 1, borderRadius: 8, padding: 12, marginTop: 10 },

  stopsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  stopItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  stopNumber: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  stopName: { fontSize: 13, marginLeft: 4 },
});

export default MTCBusNavigation;
