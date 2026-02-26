import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const PreferencesContext = createContext();

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};

import { API_BASE, apiFetch } from '../config';

// ---------------------------------------------------------------------------
// Theme palettes – React Native StyleSheet-compatible (no CSS vars, no gradients)
// ---------------------------------------------------------------------------
export const THEMES = {
  light: {
    bgPrimary: '#f5f7fa',
    bgPrimaryEnd: '#c3cfe2',       // gradient end – use with LinearGradient
    bgSecondary: '#ffffff',
    bgTertiary: '#f8f9fa',
    bgHover: '#f0f0f0',
    textPrimary: '#333333',
    textSecondary: '#666666',
    textAccent: '#1976d2',
    textLight: '#ffffff',
    accentColor: '#1976d2',
    borderColor: '#e0e0e0',
    shadow: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
    cardBg: '#ffffff',
    navBg: '#ffffff',
    inputBg: '#ffffff',
    dangerColor: '#d32f2f',
    successColor: '#388e3c',
    warningColor: '#f57c00',
    focusOutline: '#1976d2',
    // Button gradient pairs (use with expo-linear-gradient / react-native-linear-gradient)
    primaryGradient: ['#1976d2', '#7b1fa2'],
    secondaryGradient: ['#388e3c', '#1976d2'],
    dangerGradient: ['#d32f2f', '#ff6b6b'],
    accentGradient: ['#fdd835', '#ff9800'],
  },
  dark: {
    bgPrimary: '#1a1a1a',
    bgPrimaryEnd: '#2d2d2d',
    bgSecondary: '#2d2d2d',
    bgTertiary: '#1f2937',
    bgHover: '#404040',
    textPrimary: '#ffffff',
    textSecondary: '#b0b0b0',
    textAccent: '#42a5f5',
    textLight: '#ffffff',
    accentColor: '#42a5f5',
    borderColor: '#404040',
    shadow: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.30, shadowRadius: 10, elevation: 6 },
    cardBg: '#333333',
    navBg: '#2d2d2d',
    inputBg: '#2d2d2d',
    dangerColor: '#ef5350',
    successColor: '#66bb6a',
    warningColor: '#ffa726',
    focusOutline: '#42a5f5',
    primaryGradient: ['#42a5f5', '#ab47bc'],
    secondaryGradient: ['#66bb6a', '#42a5f5'],
    dangerGradient: ['#ef5350', '#ff6b6b'],
    accentGradient: ['#fdd835', '#ffa726'],
  },
  'high-contrast': {
    bgPrimary: '#000000',
    bgPrimaryEnd: '#000000',
    bgSecondary: '#000000',
    bgTertiary: '#000000',
    bgHover: '#333333',
    textPrimary: '#ffffff',
    textSecondary: '#ffff00',
    textAccent: '#00ff00',
    textLight: '#ffffff',
    accentColor: '#00ff00',
    borderColor: '#ffffff',
    shadow: { shadowColor: '#fff', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.30, shadowRadius: 10, elevation: 6 },
    cardBg: '#000000',
    navBg: '#000000',
    inputBg: '#000000',
    dangerColor: '#ff0000',
    successColor: '#00ff00',
    warningColor: '#ffff00',
    focusOutline: '#ff6b6b',
    primaryGradient: ['#00ff00', '#00ff00'],
    secondaryGradient: ['#00ff00', '#00ff00'],
    dangerGradient: ['#ff0000', '#ff0000'],
    accentGradient: ['#ffff00', '#ffff00'],
  },
};

// ---------------------------------------------------------------------------
// Translations – every string from the web version (English + Tamil)
// ---------------------------------------------------------------------------
const translations = {
  en: {
    // Navigation
    home: 'Home',
    navigate: 'Navigate',
    alerts: 'Alerts',
    community: 'Community',
    settings: 'Settings',
    logout: 'Logout',

    // Common
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    ok: 'OK',
    error: 'Error',
    success: 'Success',

    // Home page
    goodMorning: 'Good Morning',
    goodAfternoon: 'Good Afternoon',
    goodEvening: 'Good Evening',
    welcomeMessage: 'Welcome to your accessibility-first navigation companion for Chennai',
    quickActions: 'Quick Actions',
    recentAlerts: 'Recent Alerts',
    emergencyAssistance: 'Emergency Assistance',

    // Settings
    customizeExperience: 'Customize your experience',
    settingsSaved: 'Settings saved successfully',
    appearance: 'Appearance',
    chooseTheme: 'Choose your preferred theme',
    lightTheme: 'Light Theme',
    darkTheme: 'Dark Theme',
    highContrastTheme: 'High Contrast Theme',
    selectLanguage: 'Select your language',
    interactionMode: 'Interaction Mode',
    chooseInputMethod: 'Choose your input method',
    normalMode: 'Normal Mode',
    voiceMode: 'Voice Mode',
    screenReader: 'Screen Reader Compatibility',
    screenReaderDescription: 'Enable text-to-speech when hovering over text, buttons, and other elements',
    screenReaderEnabled: 'Screen reader is active. Hover over any text, button, or element to hear it spoken aloud.',
    enabled: 'Enabled',
    disabled: 'Disabled',
    notifications: 'Notifications',
    manageNotifications: 'Manage your notification preferences',
    alertNotifications: 'Alert Notifications',
    accessibilityAlerts: 'Accessibility alerts and updates',
    trafficUpdates: 'Traffic Updates',
    realTimeTraffic: 'Real-time traffic information',
    communityNotifications: 'Community Notifications',
    newPostsComments: 'New posts and comments',
    emergencyAlerts: 'Emergency Alerts',
    criticalAlerts: 'Critical emergency alerts',
    privacy: 'Privacy',
    controlDataSharing: 'Control your data sharing',
    shareLocation: 'Share Location',
    locationForRecommendations: 'Share location for better recommendations',
    shareActivity: 'Share Activity',
    helpImproveApp: 'Help improve the app with usage data',
    publicProfile: 'Public Profile',
    visibleToCommunity: 'Make your profile visible to community',
    account: 'Account',
    exportData: 'Export Data',
    saveSettings: 'Save Settings',
    clearAllData: 'Clear All Data',
    confirmClearData: 'Are you sure you want to clear all data? This cannot be undone.',
    about: 'About',
    appDescription: 'Making Chennai more accessible for everyone.',

    // Navigate page
    chennai: 'Chennai',
    general: 'General',
    bus: 'Bus',
    buses: 'Buses',
    metro: 'Metro',
    chennaiMetro: 'Chennai Metro',
    delete: 'Delete',
    updates: 'Updates',
    help: 'Help',
    posts: 'Posts',
    allPosts: 'All Posts',
    tamil: 'Tamil',
    back: 'Back',
    post: 'Post',
    filter: 'Filter',
    access: 'Access',
    emergency: 'Emergency',
    communityDescription: 'Connect, share experiences, and help each other navigate Chennai accessibly',
    findRoute: 'Find Your Route',
    discoverAccessibleRoutes: 'Discover accessible routes tailored to your needs',
    from: 'From',
    to: 'To',
    enterStartingLocation: 'Enter starting location',
    enterDestination: 'Enter destination',
    accessibilityRequirements: 'Accessibility Requirements',
    wheelchairAccess: 'Wheelchair Access',
    elevatorAvailable: 'Elevator Available',
    audioAnnouncements: 'Audio Announcements',
    brailleTactileSigns: 'Braille/Tactile Signs',
    findRoutes: 'Find Routes',
    searching: 'Searching...',
    availableRoutes: 'Available Routes',
    recommended: 'RECOMMENDED',
    route: 'Route',
    steps: 'Steps',
    accessibilityFeatures: 'Accessibility Features',
    yourSavedRoutes: 'Your Saved Routes',
    savedOn: 'Saved on',
    filters: 'Filters',

    // Alerts page
    realTimeAlerts: 'Real-Time Alerts',
    stayUpdated: 'Stay updated with live transport and accessibility alerts across Chennai',
    chennaiMetroLive: 'Chennai Metro Live',
    lastUpdated: 'Last updated',
    live: 'LIVE',
    allServicesNormal: 'All metro services running normally',
    reportIssue: 'Report an Issue',
    category: 'Category',
    locationOptional: 'Location (Optional)',
    alertMessage: 'Alert Message',
    describeIssue: 'Describe the issue or alert...',
    postAlert: 'Post Alert',
    communityReports: 'Community Reports',
    refresh: 'Refresh',
    noAlertsYet: 'No community alerts yet. Be the first to report an issue!',
    location: 'Location',
    transport: 'Transport',
    accessibility: 'Accessibility',
    roadway: 'Roadway',
    weather: 'Weather',

    // Additional Navigate features
    useCurrentLocation: 'Use current location',
    frequentLocations: 'Frequent locations',
    frequentDestinations: 'Frequent destinations',
    routeMap: 'Route Map',
    elevator: 'Elevator',
    audioSignals: 'Audio Signals',
    braille: 'Braille',
    barriers: 'Barriers',
    accessibilityScore: 'Accessibility Score',
    carbonFootprint: 'Carbon Footprint',
    crowdLevel: 'Crowd Level',
    readRouteDetails: 'Read route details',

    // Themes
    light: 'Light',
    dark: 'Dark',
    highContrast: 'High Contrast',

    // Modes
    normal: 'Touch/Click',
    voice: 'Voice Mode',

    // Mode Selection
    selectMode: 'Select Your Interaction Mode',
    voiceModeSelected: 'Voice mode selected! You can now use voice commands to navigate.',
    normalModeSelected: 'Normal mode selected! You can use touch and click to navigate.',
    pleaseSpeak: 'Please speak your choice: say "Voice Mode" or "Normal Mode"',
    listening: 'Listening...',
    didNotUnderstand: "I didn't understand. Please try again.",
    errorListening: 'Error listening. Please try again.',
    activateVoice: 'Start Voice Recognition',
    saving: 'Saving preferences...',
    errorSavingPreferences: 'Failed to save preferences. Please try again.',
    continuousListening: 'Voice recognition is active. Say "Voice Mode" or "Normal Mode"',

    // Community page additional
    whatsOnYourMind: "What's on your mind?",
    shareThoughts: 'Share your thoughts, ask questions, or report accessibility updates...',
    createPost: 'Create Post',
    describeEmergency: 'Describe your emergency...',
    pleaseEnterBothLocations: 'Please enter both From and To locations',
    failedToFindRoutes: 'Failed to find routes. Please try again.',
  },

  ta: {
    // Navigation
    home: 'முகப்பு',
    navigate: 'வழிகாட்டி',
    alerts: 'எச்சரிக்கைகள்',
    community: 'சமூகம்',
    settings: 'அமைப்புகள்',
    logout: 'வெளியேறு',

    // Common
    loading: 'ஏற்றுகிறது...',
    save: 'சேமிக்கவும்',
    cancel: 'ரத்து செய்',
    ok: 'சரி',
    error: 'பிழை',
    success: 'வெற்றி',

    // Home page
    goodMorning: 'காலை வணக்கம்',
    goodAfternoon: 'மதியம் வணக்கம்',
    goodEvening: 'மாலை வணக்கம்',
    welcomeMessage: 'சென்னைக்கான உங்கள் அணுகல்-முதல் வழிசெலுத்தல் துணைக்கு வரவேற்கிறோம்',
    quickActions: 'விரைவு செயல்கள்',
    recentAlerts: 'சமீபத்திய எச்சரிக்கைகள்',
    emergencyAssistance: 'அவசர உதவி',

    // Settings
    customizeExperience: 'உங்கள் அனுபவத்தை தனிப்பயனாக்கவும்',
    settingsSaved: 'அமைப்புகள் வெற்றிகரமாக சேமிக்கப்பட்டன',
    appearance: 'தோற்றம்',
    chooseTheme: 'உங்கள் விருப்பமான தீமை தேர்ந்தெடுக்கவும்',
    lightTheme: 'ஒளி தீம்',
    darkTheme: 'இருள் தீம்',
    highContrastTheme: 'உயர் மாறுபாடு தீம்',
    language: 'மொழி',
    selectLanguage: 'உங்கள் மொழியை தேர்ந்தெடுக்கவும்',
    interactionMode: 'தொடர்பு முறை',
    chooseInputMethod: 'உங்கள் உள்ளீட்டு முறையை தேர்ந்தெடுக்கவும்',
    normalMode: 'சாதாரண முறை',
    voiceMode: 'குரல் முறை',
    screenReader: 'திரை வாசகர் இணக்கம்',
    screenReaderDescription: 'உரை, பொத்தான்கள் மற்றும் பிற கூறுகளின் மேல் சுட்டிக் கொண்டிருக்கும் போது உரையிலிருந்து பேச்சுக்கு இயக்கவும்',
    screenReaderEnabled: 'திரை வாசகர் செயலில் உள்ளது. ஏதேனும் உரை, பொத்தான் அல்லது கூறுகளின் மேல் வைக்கவும் அது உச்சரிக்கப்படும்.',
    enabled: 'இயக்கப்பட்டது',
    disabled: 'முடக்கப்பட்டது',
    notifications: 'அறிவிப்புகள்',
    manageNotifications: 'உங்கள் அறிவிப்பு விருப்பங்களை நிர்வகிக்கவும்',
    alertNotifications: 'எச்சரிக்கை அறிவிப்புகள்',
    accessibilityAlerts: 'அணுகல் எச்சரிக்கைகள் மற்றும் புதுப்பிப்புகள்',
    trafficUpdates: 'போக்குவரத்து புதுப்பிப்புகள்',
    realTimeTraffic: 'நேரடி போக்குவரத்து தகவல்',
    communityNotifications: 'சமூக அறிவிப்புகள்',
    newPostsComments: 'புதிய இடுகைகள் மற்றும் கருத்துகள்',
    emergencyAlerts: 'அவசர எச்சரிக்கைகள்',
    criticalAlerts: 'முக்கியமான அவசர எச்சரிக்கைகள்',
    privacy: 'தனியுரிமை',
    controlDataSharing: 'உங்கள் தரவு பகிர்வை கட்டுப்படுத்தவும்',
    shareLocation: 'இடத்தை பகிரவும்',
    locationForRecommendations: 'சிறந்த பரிந்துரைகளுக்கு இடத்தை பகிரவும்',
    shareActivity: 'செயல்பாட்டை பகிரவும்',
    helpImproveApp: 'பயன்பாட்டு தரவுகளுடன் பயன்பாட்டை மேம்படுத்த உதவவும்',
    publicProfile: 'பொது சுயவிவரம்',
    visibleToCommunity: 'உங்கள் சுயவிவரத்தை சமூகத்திற்கு தெரியும்படி செய்யவும்',
    account: 'கணக்கு',
    exportData: 'தரவை ஏற்றுமதி செய்யவும்',
    saveSettings: 'அமைப்புகளை சேமிக்கவும்',
    clearAllData: 'அனைத்து தரவையும் அழிக்கவும்',
    confirmClearData: 'அனைத்து தரவையும் அழிக்க வேண்டுமா? இதை செயல்தவிர்க்க முடியாது.',
    about: 'பற்றி',
    appDescription: 'அனைவருக்கும் சென்னையை மேலும் அணுகக்கூடியதாக மாற்றுதல்.',

    // Navigate page
    chennai: 'சென்னை',
    general: 'பொது',
    bus: 'பேருந்து',
    buses: 'பேருந்துகள்',
    metro: 'மெட்ரோ',
    chennaiMetro: 'சென்னை மெட்ரோ',
    delete: 'அழிக்க',
    updates: 'புதுப்பிப்புகள்',
    help: 'உதவி',
    posts: 'இடுகைகள்',
    allPosts: 'அனைத்து இடுகைகள்',
    tamil: 'தமிழ்',
    back: 'திரும்பு',
    post: 'புதிய',
    filter: 'வடிகட்டு',
    access: 'அணுகல்',
    emergency: 'அவசர',
    communityDescription: 'இணைக்கவும், அனுபவங்களைப் பகிரவும், சென்னையை அணுகக்கூடிய வகையில் வழிசெலுத்த ஒருவருக்கொருவர் உதவவும்',
    findRoute: 'உங்கள் பாதையைக் கண்டறியவும்',
    discoverAccessibleRoutes: 'உங்கள் தேவைகளுக்கு ஏற்ப அணுகக்கூடிய வழிகளைக் கண்டறியுங்கள்',
    from: 'இருந்து',
    to: 'வரை',
    enterStartingLocation: 'தொடக்க இடத்தை உள்ளிடவும்',
    enterDestination: 'இலக்கை உள்ளிடவும்',
    accessibilityRequirements: 'அணுகல் தேவைகள்',
    wheelchairAccess: 'சக்கர நாற்காலி அணுகல்',
    elevatorAvailable: 'மின்தூக்கி கிடைக்கும்',
    audioAnnouncements: 'ஒலி அறிவிப்புகள்',
    brailleTactileSigns: 'பிரெய்லி/தொடு அறிகுறிகள்',
    findRoutes: 'வழிகளைக் கண்டறியவும்',
    searching: 'தேடுகிறது...',
    availableRoutes: 'கிடைக்கும் வழிகள்',
    recommended: 'பரிந்துரைக்கப்பட்டது',
    route: 'பாதை',
    steps: 'படிகள்',
    accessibilityFeatures: 'அணுகல் அம்சங்கள்',
    yourSavedRoutes: 'உங்கள் சேமித்த வழிகள்',
    savedOn: 'சேமிக்கப்பட்டது',
    filters: 'வடிகட்டிகள்',
    useCurrentLocation: 'தற்போதைய இடத்தைப் பயன்படுத்தவும்',
    frequentLocations: 'அடிக்கடி இடங்கள்',
    frequentDestinations: 'அடிக்கடி இலக்குகள்',
    routeMap: 'வழித்தட வரைபடம்',
    elevator: 'மின்தூக்கி',
    audioSignals: 'ஒலி சிக்னல்கள்',
    braille: 'பிரெய்லி',
    barriers: 'தடைகள்',
    accessibilityScore: 'அணுகல் மதிப்பெண்',
    carbonFootprint: 'கார்பன் தடம்',
    crowdLevel: 'கூட்ட அளவு',
    readRouteDetails: 'வழித்தட விவரங்களைப் படிக்கவும்',

    // Alerts page
    realTimeAlerts: 'நிகழ்நேர எச்சரிக்கைகள்',
    stayUpdated: 'சென்னை முழுவதும் லைவ் போக்குவரத்து மற்றும் அணுகல் எச்சரிக்கைகளுடன் புதுப்பித்த நிலையில் இருங்கள்',
    chennaiMetroLive: 'சென்னை மெட்ரோ லைவ்',
    lastUpdated: 'கடைசியாக புதுப்பிக்கப்பட்டது',
    live: 'நேரலை',
    allServicesNormal: 'அனைத்து மெட்ரோ சேவைகளும் சாதாரணமாக இயங்குகின்றன',
    reportIssue: 'சிக்கலைப் புகாரளிக்கவும்',
    category: 'வகை',
    locationOptional: 'இடம் (விருப்பம்)',
    alertMessage: 'எச்சரிக்கை செய்தி',
    describeIssue: 'சிக்கலை அல்லது எச்சரிக்கையை விவரிக்கவும்...',
    postAlert: 'எச்சரிக்கையை பதிவிடவும்',
    communityReports: 'சமூக அறிக்கைகள்',
    refresh: 'புதுப்பிக்க',
    noAlertsYet: 'இதுவரை சமூக எச்சரிக்கைகள் இல்லை. சிக்கல் குறித்து முதலில் புகாரளிப்பவர் நீங்களே!',
    location: 'இடம்',
    transport: 'போக்குவரத்து',
    accessibility: 'அணுகல்',
    roadway: 'சாலை',
    weather: 'வானிலை',

    // Community page
    welcomeToCommunity: 'சமூகப் பக்கத்திற்கு வரவேற்கிறோம். நீங்கள் கூறலாம்: போஸ்ட், வடிகட்டு, முகப்பு, பின்னோக்கி அல்லது உதவி',
    goingHome: 'முகப்புக்கு செல்கிறது',
    goingBack: 'திரும்புகிறது',
    createPost: 'புதிய இடுகை உருவாக்குகிறது',
    changeFilter: 'வடிகட்டியை மாற்றுகிறது',
    showingGeneral: 'பொது இடுகைகளைக் காட்டுகிறது',
    showingAccessibility: 'அணுகல் இடுகைகளைக் காட்டுகிறது',
    showingEmergency: 'அவசர இடுகைகளைக் காட்டுகிறது',
    communityHelp: 'சமூக பக்கம். புதிய இடுகையை உருவாக்க பதிவு செய்யவும், வகையை மாற்ற வடிகட்டு, பொது இடுகைகளுக்கு பொது, அணுகல் இடுகைகளுக்கு அணுகல், அவசர இடுகைகளுக்கு அவசரம், முகப்பு பக்கத்திற்குச் செல்ல முகப்பு, அல்லது திரும்பச் செல்ல பின்னோக்கி என்று சொல்லுங்கள்',

    // Additional
    pleaseEnterBothLocations: 'தயவுசெய்து இருந்து மற்றும் வரை இடங்களை உள்ளிடவும்',
    failedToFindRoutes: 'வழிகளைக் கண்டறிய முடியவில்லை. தயவுசெய்து மீண்டும் முயற்சிக்கவும்.',
    whatsOnYourMind: 'உங்கள் மனதில் என்ன இருக்கிறது?',
    describeEmergency: 'உங்கள் அவசர நிலையை விவரிக்கவும்...',
    shareThoughts: 'உங்கள் எண்ணங்களைப் பகிருங்கள், கேள்விகள் கேளுங்கள், அல்லது அணுகல் புதுப்பிப்புகளை புகாரளிக்கவும்...',

    // Themes
    light: 'ஒளி',
    dark: 'இருள்',
    highContrast: 'உயர் மாறுபாடு',

    // Modes
    normal: 'தொடு/கிளிக்',
    voice: 'குரல் முறை',

    // Mode Selection
    selectMode: 'உங்கள் தொடர்பு முறையை தேர்ந்தெடுக்கவும்',
    voiceModeSelected: 'குரல் முறை தேர்ந்தெடுக்கப்பட்டது! இப்போது நீங்கள் குரல் கட்டளைகளைப் பயன்படுத்தலாம்.',
    normalModeSelected: 'சாதாரண முறை தேர்ந்தெடுக்கப்பட்டது! நீங்கள் தொடுதல் மற்றும் கிளிக் பயன்படுத்தலாம்.',
    pleaseSpeak: 'தயவுசெய்து உங்கள் விருப்பத்தைச் சொல்லுங்கள்: "குரல் முறை" அல்லது "சாதாரண முறை" என்று சொல்லுங்கள்',
    listening: 'கேட்கிறது...',
    didNotUnderstand: 'நான் புரிந்துகொள்ளவில்லை. தயவுசெய்து மீண்டும் முயற்சிக்கவும்.',
    errorListening: 'கேட்பதில் பிழை. தயவுசெய்து மீண்டும் முயற்சிக்கவும்.',
    activateVoice: 'குரல் அறிதலை தொடங்கு',
    saving: 'விருப்பங்களை சேமிக்கிறது...',
    errorSavingPreferences: 'விருப்பங்களை சேமிக்க முடியவில்லை. தயவுசெய்து மீண்டும் முயற்சிக்கவும்.',
    continuousListening: 'குரல் அறிதல் செயலில் உள்ளது. "குரல் முறை" அல்லது "சாதாரண முறை" என்று சொல்லுங்கள்',
  },
};

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export const PreferencesProvider = ({ children }) => {
  const [preferences, setPreferences] = useState({
    language: 'en',
    theme: 'light',
    mode: 'normal',
    screenReader: false,
    voiceSpeed: 0.8,
    emergencyContact: '',
  });

  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences from AsyncStorage (+ optional server sync) on mount
  useEffect(() => {
    const loadPreferences = async () => {
      let localPrefs = {
        language: 'en',
        theme: 'light',
        mode: 'normal',
        screenReader: false,
        voiceSpeed: 0.8,
        emergencyContact: '',
      };

      try {
        const savedPrefs = await AsyncStorage.getItem('ac_prefs');
        if (savedPrefs) {
          try {
            const parsed = JSON.parse(savedPrefs);
            localPrefs = {
              language: parsed.language || 'en',
              theme: parsed.theme || 'light',
              mode: parsed.mode || 'normal',
              screenReader: parsed.screenReader || false,
              voiceSpeed: parsed.voiceSpeed ?? 0.8,
              emergencyContact: parsed.emergencyContact || '',
            };
          } catch (e) {
            console.error('Error parsing preferences:', e);
          }
        }

        // If the user is logged in, attempt server sync (server takes priority)
        const userData = JSON.parse((await AsyncStorage.getItem('ac_user')) || '{}');
        if (userData && userData.user_id) {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            const response = await apiFetch(
              `${API_BASE}/api/user/${userData.user_id}/preferences`,
              { signal: controller.signal },
            );
            clearTimeout(timeout);
            if (response.ok) {
              const serverPrefs = await response.json();
              localPrefs = { ...localPrefs, ...serverPrefs };
              // Persist merged result locally
              await AsyncStorage.setItem('ac_prefs', JSON.stringify(localPrefs));
            }
          } catch (err) {
            // Non-fatal — continue with local preferences
            console.warn('Server prefs sync skipped:', err.message || err);
          }
        }
      } catch (err) {
        console.error('Error loading preferences:', err);
      }

      setPreferences(localPrefs);
      setIsLoaded(true);
    };

    loadPreferences();
  }, []);

  // ------------------------------------------------------------------
  // Update helper – saves locally + fires-and-forgets to server
  // ------------------------------------------------------------------
  const updatePreferences = async (newPrefs) => {
    const updated = { ...preferences, ...newPrefs };
    setPreferences(updated);
    await AsyncStorage.setItem('ac_prefs', JSON.stringify(updated));

    // Best-effort server sync
    try {
      const userData = JSON.parse((await AsyncStorage.getItem('ac_user')) || '{}');
      if (userData && userData.user_id) {
        apiFetch(`${API_BASE}/api/user/${userData.user_id}/preferences`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newPrefs),
        }).catch(() => {});
      }
    } catch (_) {}
  };

  // ------------------------------------------------------------------
  // Resolved theme object (convenience)
  // ------------------------------------------------------------------
  const theme = THEMES[preferences.theme] || THEMES.light;

  // ------------------------------------------------------------------
  // Style helpers – return React Native–compatible style objects
  // ------------------------------------------------------------------

  /**
   * Base container style – replaces the web getThemeStyles().
   * Use as the outermost View style for each screen.
   */
  const getThemeStyles = () => ({
    flex: 1,
    backgroundColor: theme.bgPrimary,
  });

  /**
   * Card style – replaces getCardStyles().
   */
  const getCardStyles = () => ({
    backgroundColor: theme.cardBg,
    borderWidth: 1,
    borderColor: theme.borderColor,
    borderRadius: 16,
    ...theme.shadow,
    overflow: 'hidden',
  });

  /**
   * Text colour helper – replaces getTextStyles(variant).
   * variant: 'primary' | 'secondary' | 'accent'
   */
  const getTextStyles = (variant = 'primary') => {
    const colorMap = {
      primary: theme.textPrimary,
      secondary: theme.textSecondary,
      accent: theme.textAccent || theme.accentColor,
    };
    return { color: colorMap[variant] || theme.textPrimary };
  };

  /**
   * Button style helper – replaces getButtonStyles(variant).
   * variant: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent'
   *
   * Because React Native doesn't support CSS gradients in plain Views,
   * the returned object uses a flat backgroundColor. Consumers can read
   * theme.primaryGradient / secondaryGradient / etc. and pass them to
   * <LinearGradient> if expo-linear-gradient is available.
   */
  const getButtonStyles = (variant = 'primary') => {
    const base = {
      borderRadius: 999,
      paddingVertical: 12,
      paddingHorizontal: 24,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    };

    const variants = {
      primary: {
        ...base,
        backgroundColor: theme.accentColor,
      },
      secondary: {
        ...base,
        backgroundColor: theme.successColor,
      },
      ghost: {
        ...base,
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: theme.borderColor,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 20,
      },
      danger: {
        ...base,
        backgroundColor: theme.dangerColor,
      },
      accent: {
        ...base,
        backgroundColor: theme.warningColor,
      },
    };

    return variants[variant] || variants.primary;
  };

  /**
   * Button text style companion (use together with getButtonStyles).
   */
  const getButtonTextStyles = (variant = 'primary') => {
    if (variant === 'ghost') {
      return { color: theme.textPrimary, fontWeight: '600', fontSize: 14 };
    }
    if (variant === 'accent') {
      return { color: theme.textAccent || theme.accentColor, fontWeight: '600', fontSize: 14 };
    }
    return { color: theme.textLight, fontWeight: '600', fontSize: 14 };
  };

  // ------------------------------------------------------------------
  // Translation helper
  // ------------------------------------------------------------------
  const getText = (key, language = preferences.language) => {
    return translations[language]?.[key] || translations.en[key] || key;
  };

  // ------------------------------------------------------------------
  // Context value
  // ------------------------------------------------------------------
  const value = {
    preferences,
    updatePreferences,
    theme,
    getThemeStyles,
    getCardStyles,
    getTextStyles,
    getButtonStyles,
    getButtonTextStyles,
    getText,
    isLoaded,
  };

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
};
