import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Linking,
  Image,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { usePreferences } from '../context/PreferencesContext';
import { useVoiceInterface } from '../utils/voiceUtils';

// ─── Comprehensive Chennai Places (matches web) ─────────────────────────────
const CHENNAI_PLACES = [
  'Airport Metro Station','Alandur Metro Station','Arumbakkam Metro Station','Ashok Nagar Metro Station',
  'Central Metro Station','Egmore Metro Station','Government Estate Metro Station','Guindy Metro Station',
  'High Court Metro Station','Koyambedu Metro Station','LIC Metro Station','Mannadi Metro Station',
  'Nehru Park Metro Station','Saidapet Metro Station','St. Thomas Mount Metro Station',
  'Thousand Lights Metro Station','Tirumangalam Metro Station','Vadapalani Metro Station','Washermanpet Metro Station',
  'Chennai Central Railway Station','Chennai Egmore Railway Station','Tambaram Railway Station',
  'Avadi Railway Station','Beach Railway Station','Chromepet Railway Station','Fort Railway Station',
  'Mambalam Railway Station','Park Town Railway Station','Perambur Railway Station','Velachery Railway Station',
  'Koyambedu Bus Terminus','Broadway Bus Terminus','T. Nagar Bus Terminus','Adyar Depot','Anna Nagar Depot',
  'Adyar','Alwarpet','Ambattur','Anna Nagar','Ashok Nagar','Avadi','Besant Nagar',
  'Chepauk','Chetpet','Chromepet','Egmore','Guindy','Kodambakkam','Kotturpuram',
  'Madipakkam','Mylapore','Nandanam','Nungambakkam','Pallavaram','Porur','Purasaiwakkam',
  'R.A. Puram','Royapettah','Saidapet','Sholinganallur','T. Nagar','Tambaram',
  'Teynampet','Thiruvanmiyur','Thoraipakkam','Triplicane','Vadapalani','Velachery','West Mambalam',
  'Apollo Hospital','Fortis Malar Hospital','Government General Hospital','MIOT International',
  'Sankara Nethralaya','Sri Ramachandra Medical Centre',
  'Anna University','IIT Madras','Loyola College','Madras Christian College','Presidency College',
  'Express Avenue Mall','Forum Vijaya Mall','Phoenix MarketCity','Spencer Plaza','Pondy Bazaar',
  'Ranganathan Street','Marina Beach','Kapaleeshwarar Temple','Fort St. George','Government Museum',
  'Valluvar Kottam','Birla Planetarium','Guindy National Park',
  'TIDEL Park','DLF IT Park','OMR IT Corridor','Chennai Airport','Chennai Port',
  'Anna Centenary Library','Music Academy','Kalakshetra',
].sort();

// ─── Emergency Contacts Data (matches web sidebar) ──────────────────────────
const EMERGENCY_CONTACTS = [
  {
    title: 'Disability Services',
    color: '#4caf50',
    contacts: [
      { label: 'National Helpline', number: '18001804444', display: '1800-180-4444' },
      { label: 'TN Disability Board', number: '04426433636', display: '044-2643-3636' },
      { label: 'Accessibility Support', number: '18004251966', display: '1800-425-1966' },
    ],
  },
  {
    title: 'Chennai Metro',
    color: '#2196f3',
    contacts: [
      { label: 'Customer Care', number: '04428225500', display: '044-2822-5500' },
      { label: 'Emergency Helpline', number: '04442334455', display: '044-4233-4455' },
      { label: 'Accessibility Help', number: '04428341234', display: '044-2834-1234' },
    ],
  },
  {
    title: 'MTC Bus Service',
    color: '#ff9800',
    contacts: [
      { label: 'MTC Helpline', number: '04424792600', display: '044-2479-2600' },
      { label: 'Route Enquiry', number: '04442321010', display: '044-4232-1010' },
      { label: 'Lost & Found', number: '04428541234', display: '044-2854-1234' },
    ],
  },
  {
    title: 'Volunteer Support',
    color: '#9c27b0',
    contacts: [
      { label: 'Transit Volunteers', number: '09876543210', display: '+91 98765-43210' },
      { label: 'Accessibility Guide', number: '09876543211', display: '+91 98765-43211' },
      { label: 'Emergency Escort', number: '09876543212', display: '+91 98765-43212' },
    ],
  },
  {
    title: 'General Emergency',
    color: '#f44336',
    isCritical: true,
    contacts: [
      { label: 'Police', number: '100', display: '100' },
      { label: 'Ambulance', number: '108', display: '108' },
      { label: 'Fire', number: '101', display: '101' },
    ],
  },
];

export default function CommunityScreen({ navigation }) {
  const { theme, getText, preferences } = usePreferences();
  const isVoiceMode = preferences.mode === 'voice';

  const {
    isListening,
    voiceFeedback,
    speak,
    setupSpeechRecognition,
    startListening,
  } = useVoiceInterface('Community');

  // ─── State (mirrors web) ──────────────────────────────────────────────────
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [filterCategory, setFilterCategory] = useState('all');
  const [attachedImage, setAttachedImage] = useState(null);
  const [isEmergency, setIsEmergency] = useState(false);
  const [showComments, setShowComments] = useState({});
  const [newComment, setNewComment] = useState({});
  const [location, setLocation] = useState('');
  const [shareLocation, setShareLocation] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [showEmergencyContacts, setShowEmergencyContacts] = useState(false);

  const categories = [
    { value: 'general', label: getText('general') || 'General', color: '#1976d2' },
    { value: 'accessibility', label: `${getText('accessibility') || 'Accessibility'} ${getText('updates') || 'Updates'}`, color: '#4caf50' },
    { value: 'emergency', label: `${getText('emergency') || 'Emergency'} ${getText('help') || 'Help'}`, color: '#f44336' },
  ];

  const filters = [
    { value: 'all', label: getText('allPosts') || 'All Posts' },
    { value: 'general', label: getText('general') || 'General' },
    { value: 'accessibility', label: `${getText('accessibility') || 'Accessibility'} ${getText('updates') || 'Updates'}` },
    { value: 'emergency', label: `${getText('emergency') || 'Emergency'} ${getText('help') || 'Help'}` },
  ];

  // ─── Mock posts (matches web exactly) ─────────────────────────────────────
  const generateMockPosts = () =>
    [
      {
        id: 1,
        username: 'Priya S.',
        content: 'The new ramp at Central Metro Station is working great! Much easier access now.',
        category: 'accessibility',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        likes: 12,
        helpful: 8,
        comments: [
          { id: 1, username: 'Raj M.', content: 'Thanks for the update! This helps a lot.', timestamp: new Date(Date.now() - 20 * 60 * 1000) },
          { id: 2, username: 'Maya T.', content: 'Finally! I was waiting for this.', timestamp: new Date(Date.now() - 15 * 60 * 1000) },
        ],
        location: 'Central Metro Station',
        userLiked: false,
        userMarkedHelpful: false,
        image: null,
      },
      {
        id: 2,
        username: 'Arjun K.',
        content: 'Does anyone know if the audio announcements are working on the Blue Line today?',
        category: 'general',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        likes: 5,
        helpful: 3,
        comments: [
          { id: 3, username: 'Sneha R.', content: 'Yes, they were working when I traveled this morning.', timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000) },
        ],
        userLiked: false,
        userMarkedHelpful: false,
        image: null,
      },
      {
        id: 3,
        username: 'Emergency User',
        content: 'URGENT: Stuck in elevator at Express Avenue Mall. Need immediate assistance!',
        category: 'emergency',
        timestamp: new Date(Date.now() - 10 * 60 * 1000),
        likes: 0,
        helpful: 15,
        comments: [
          { id: 4, username: 'Security Team', content: 'Help is on the way. Stay calm.', timestamp: new Date(Date.now() - 5 * 60 * 1000) },
        ],
        location: 'Express Avenue Mall',
        userLiked: false,
        userMarkedHelpful: true,
        image: null,
      },
    ].sort((a, b) => b.timestamp - a.timestamp);

  // ─── Init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem('ac_user');
      if (!raw) {
        navigation.replace('Login');
        return;
      }
      setUser(JSON.parse(raw));
      setPosts(generateMockPosts());
    })();
  }, []);

  // ─── Voice commands — emergency only (matches web) ────────────────────────
  useEffect(() => {
    if (!isVoiceMode) return;
    (async () => {
      await setupSpeechRecognition(async (command) => {
        const cmd = command.toLowerCase().trim();
        if (cmd.includes('menu')) {
          const { MENU_PROMPT, handleMenuNavigation } = require('../utils/voiceUtils');
          speak(MENU_PROMPT, true, true);
        } else if (cmd.includes('police')) {
          speak('Calling Police. Number is 100.', true, true);
          Linking.openURL('tel:100').catch(() => {});
        } else if (cmd.includes('ambulance')) {
          speak('Calling Ambulance. Number is 108.', true, true);
          Linking.openURL('tel:108').catch(() => {});
        } else if (cmd.includes('fire')) {
          speak('Calling Fire services. Number is 101.', true, true);
          Linking.openURL('tel:101').catch(() => {});
        } else if (cmd.includes('emergency')) {
          speak('General Emergency. Calling 112.', true, true);
          Linking.openURL('tel:112').catch(() => {});
        } else if (cmd.includes('get help') || cmd.includes('volunteer') || cmd.includes('help')) {
          speak('Connecting to Volunteer Support.', true, true);
          Linking.openURL('tel:+919876543210').catch(() => {});
        } else {
          // Try menu navigation (user said a page name after hearing menu)
          const { handleMenuNavigation } = require('../utils/voiceUtils');
          handleMenuNavigation(speak, navigation, 'Community', cmd);
        }
      });
      startListening();
      await speak(
        'Community page. Say Police, Ambulance, or Fire for emergency services. Say Get Help for volunteer support.'
      );
    })();
  }, [isVoiceMode]);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const formatTimeAgo = (timestamp) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const getCategoryColor = (cat) => categories.find((c) => c.value === cat)?.color || '#1976d2';

  // ─── Actions (match web) ──────────────────────────────────────────────────
  const handleLike = (postId) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, likes: p.userLiked ? p.likes - 1 : p.likes + 1, userLiked: !p.userLiked }
          : p
      )
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleHelpful = (postId) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, helpful: p.userMarkedHelpful ? p.helpful - 1 : p.helpful + 1, userMarkedHelpful: !p.userMarkedHelpful }
          : p
      )
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleComments = (postId) => {
    setShowComments((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleComment = (postId) => {
    const text = newComment[postId];
    if (!text?.trim()) return;
    const comment = {
      id: Date.now(),
      username: user?.name || user?.email || 'You',
      content: text.trim(),
      timestamp: new Date(),
    };
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, comments: [...p.comments, comment] } : p))
    );
    setNewComment((prev) => ({ ...prev, [postId]: '' }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePost = () => {
    if (!newPost.trim()) return;
    const postData = {
      id: Date.now(),
      username: user?.name || user?.email || 'You',
      content: newPost.trim(),
      category: selectedCategory,
      timestamp: new Date(),
      likes: 0,
      helpful: 0,
      comments: [],
      location: shareLocation ? location : null,
      userLiked: false,
      userMarkedHelpful: false,
      image: attachedImage,
    };
    setPosts((prev) => [postData, ...prev]);
    setNewPost('');
    setSelectedCategory('general');
    setAttachedImage(null);
    setLocation('');
    setShareLocation(false);
    setIsEmergency(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleEmergencyPost = () => {
    Alert.alert('Emergency Help', 'Share your location for emergency assistance?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes',
        onPress: async () => {
          setIsEmergency(true);
          setSelectedCategory('emergency');
          setNewPost('URGENT: ');
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
              setLocation('Current Location (GPS)');
              setShareLocation(true);
            }
          } catch (_) {}
        },
      },
    ]);
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocation('Current Location (GPS)');
        setShareLocation(true);
      } else {
        Alert.alert('Permission Denied', 'Could not get your location. Please enter manually.');
      }
    } catch (_) {
      Alert.alert('Error', 'Could not get your location.');
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow access to photos to attach images.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });
      if (!result.canceled && result.assets?.[0]) {
        setAttachedImage({ uri: result.assets[0].uri, name: 'photo.jpg' });
      }
    } catch (_) {}
  };

  // ─── Derived ──────────────────────────────────────────────────────────────
  const filteredPosts = filterCategory === 'all' ? posts : posts.filter((p) => p.category === filterCategory);

  const filteredPlaces =
    location.length > 0
      ? CHENNAI_PLACES.filter((p) => p.toLowerCase().includes(location.toLowerCase())).slice(0, 10)
      : [];

  // ─── Styles ───────────────────────────────────────────────────────────────
  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bgPrimary },
    scroll: { padding: 16, paddingBottom: 120 },
    // Header
    header: {
      backgroundColor: theme.cardBg,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.borderColor,
      alignItems: 'center',
      ...theme.shadow,
    },
    headerTitle: { fontSize: 26, fontWeight: '700', color: theme.textPrimary },
    headerSub: { fontSize: 14, color: theme.textSecondary, marginTop: 4, textAlign: 'center', lineHeight: 20 },
    // Voice
    voiceBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isListening ? theme.accentColor : 'rgba(0,0,0,0.7)',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 25,
      marginBottom: 12,
      alignSelf: 'center',
    },
    voiceDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: isListening ? '#4caf50' : '#fff', marginRight: 8 },
    voiceText: { color: '#fff', fontSize: 13, fontWeight: '500' },
    feedbackBox: { marginTop: 8, padding: 8, backgroundColor: '#e3f2fd', borderRadius: 8, borderWidth: 1, borderColor: '#2196f3' },
    feedbackText: { fontSize: 13, color: '#1976d2', textAlign: 'center' },
    // Emergency button
    emergencyBtn: {
      backgroundColor: '#f44336',
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: 16,
      ...theme.shadow,
    },
    emergencyBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    // Filters
    filterCard: {
      backgroundColor: theme.cardBg,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.borderColor,
    },
    filterTitle: { fontSize: 14, fontWeight: '600', color: theme.textPrimary, marginBottom: 10 },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    filterBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
    filterBtnText: { fontSize: 13, fontWeight: '500' },
    // Create post form card
    formCard: {
      backgroundColor: theme.cardBg,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.borderColor,
      ...theme.shadow,
    },
    formTitle: { fontSize: 18, fontWeight: '600', color: theme.textPrimary, marginBottom: 16 },
    sectionLabel: { fontSize: 14, fontWeight: '500', color: theme.textPrimary, marginBottom: 8 },
    catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    catBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
    catBtnText: { fontSize: 13, fontWeight: '600' },
    postInput: {
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.borderColor,
      backgroundColor: isEmergency ? '#ffebee' : theme.inputBg,
      color: theme.textPrimary,
      fontSize: 15,
      minHeight: 100,
      textAlignVertical: 'top',
      marginBottom: 14,
      lineHeight: 22,
    },
    // Location row
    locationRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    locationInput: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.borderColor,
      backgroundColor: theme.inputBg,
      color: theme.textPrimary,
      fontSize: 14,
    },
    gpsBtn: {
      backgroundColor: '#4caf50',
      paddingHorizontal: 14,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gpsBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    // Location suggestions
    suggestionsBox: {
      backgroundColor: theme.cardBg,
      borderWidth: 1,
      borderColor: theme.borderColor,
      borderRadius: 8,
      marginBottom: 10,
      maxHeight: 180,
      ...theme.shadow,
    },
    suggestionItem: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderColor,
    },
    suggestionText: { fontSize: 14, color: theme.textPrimary },
    // Image attach
    attachRow: { flexDirection: 'row', gap: 8, marginBottom: 14, alignItems: 'center' },
    attachBtn: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.borderColor,
      backgroundColor: theme.bgSecondary,
    },
    attachBtnText: { fontSize: 13, color: theme.textSecondary },
    attachPreview: { width: 40, height: 40, borderRadius: 4 },
    removeImgText: { color: '#f44336', fontSize: 12 },
    // Share location toggle
    shareRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    shareLabel: { fontSize: 14, color: theme.textSecondary, flex: 1 },
    // Submit
    postBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    postBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
    // Post card
    postCard: {
      backgroundColor: theme.cardBg,
      borderRadius: 16,
      padding: 20,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: theme.borderColor,
      ...theme.shadow,
    },
    postHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    postUser: { fontWeight: '600', color: theme.textPrimary, fontSize: 14 },
    badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, marginLeft: 8 },
    badgeText: { color: '#fff', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
    urgentBadge: { backgroundColor: '#ff9800', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginLeft: 6 },
    urgentBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
    postLocation: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
    postTime: { fontSize: 12, color: theme.textSecondary },
    postContent: { fontSize: 15, lineHeight: 22, color: theme.textPrimary, marginBottom: 14 },
    postImage: { width: '100%', height: 200, borderRadius: 8, marginBottom: 14 },
    // Post Actions
    actionsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: theme.borderColor, paddingTop: 12, gap: 6 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
    actionText: { fontSize: 13, marginLeft: 4 },
    // Comments
    commentSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.borderColor },
    comment: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: theme.bgSecondary,
      borderRadius: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.borderColor,
    },
    commentUser: { fontSize: 12, fontWeight: '600', color: theme.textPrimary },
    commentText: { fontSize: 13, color: theme.textPrimary, marginTop: 2, lineHeight: 18 },
    commentTime: { fontSize: 10, color: theme.textSecondary, marginTop: 2 },
    // Add comment
    addCommentRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
    commentInput: {
      flex: 1,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.borderColor,
      backgroundColor: theme.inputBg,
      color: theme.textPrimary,
      fontSize: 14,
    },
    replyBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    replyBtnText: { color: '#fff', fontSize: 14, fontWeight: '500' },
    // Emergency contacts
    emergencySection: {
      backgroundColor: theme.cardBg,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.borderColor,
      ...theme.shadow,
    },
    emergencySectionTitle: { fontSize: 18, fontWeight: '600', color: '#f44336', marginBottom: 16 },
    contactGroup: {
      padding: 16,
      borderWidth: 1,
      borderColor: theme.borderColor,
      borderRadius: 12,
      backgroundColor: theme.bgSecondary,
      marginBottom: 12,
    },
    contactGroupCritical: {
      borderWidth: 2,
      borderColor: '#f44336',
      backgroundColor: '#ffebee',
    },
    contactGroupTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
    contactRow: { marginBottom: 4 },
    contactLabel: { fontSize: 13, color: theme.textSecondary },
    contactNumber: { fontSize: 13, color: theme.accentColor, fontWeight: '600' },
    // Toggle section header
    sectionToggle: {
      paddingVertical: 14,
      paddingHorizontal: 16,
      backgroundColor: theme.cardBg,
      borderRadius: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.borderColor,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sectionToggleText: { fontSize: 16, fontWeight: '600', color: '#f44336' },
    emptyText: { textAlign: 'center', padding: 30, color: theme.textSecondary, fontSize: 14 },
  });

  if (!user)
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.textPrimary }}>{getText('loading')}</Text>
      </View>
    );

  return (
    <View style={s.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* ── Header ─────────────────────────────────────────────── */}
          <View style={s.header}>
            <Text style={s.headerTitle}>{getText('community')}</Text>
            <Text style={s.headerSub}>{getText('communityDescription')}</Text>
            {isVoiceMode && voiceFeedback ? (
              <View style={s.feedbackBox}>
                <Text style={s.feedbackText}>{voiceFeedback}</Text>
              </View>
            ) : null}
          </View>

          {/* ── Voice indicator ────────────────────────────────────── */}
          {isVoiceMode && (
            <View style={s.voiceBanner}>
              <View style={s.voiceDot} />
              <Text style={s.voiceText}>{isListening ? 'Listening...' : 'Voice Ready'}</Text>
            </View>
          )}

          {/* ── Emergency Button ───────────────────────────────────── */}
          <TouchableOpacity style={s.emergencyBtn} onPress={handleEmergencyPost} activeOpacity={0.8}>
            <Text style={s.emergencyBtnText}>⚠️ {getText('emergency')} {getText('help')}</Text>
          </TouchableOpacity>

          {/* ── Emergency Contacts Toggle ──────────────────────────── */}
          <TouchableOpacity
            style={s.sectionToggle}
            onPress={() => setShowEmergencyContacts(!showEmergencyContacts)}
            activeOpacity={0.7}
          >
            <Text style={s.sectionToggleText}>⚠️ Emergency Contacts</Text>
            <Text style={{ fontSize: 16, color: theme.textSecondary }}>{showEmergencyContacts ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showEmergencyContacts && (
            <View style={s.emergencySection}>
              <Text style={s.emergencySectionTitle}>⚠️ Emergency Contacts</Text>
              {EMERGENCY_CONTACTS.map((group, idx) => (
                <View
                  key={idx}
                  style={[s.contactGroup, group.isCritical && s.contactGroupCritical]}
                >
                  <Text style={[s.contactGroupTitle, { color: group.color }]}>{group.title}</Text>
                  {group.contacts.map((c, ci) => (
                    <TouchableOpacity
                      key={ci}
                      style={s.contactRow}
                      onPress={() => Linking.openURL(`tel:${c.number}`).catch(() => {})}
                    >
                      <Text style={s.contactLabel}>
                        <Text style={{ fontWeight: '600' }}>{c.label}: </Text>
                        <Text style={s.contactNumber}>{c.display}</Text>
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>
          )}

          {/* ── Category Filter ────────────────────────────────────── */}
          <View style={s.filterCard}>
            <Text style={s.filterTitle}>{getText('filters')} {getText('posts')}</Text>
            <View style={s.filterRow}>
              {filters.map((f) => (
                <TouchableOpacity
                  key={f.value}
                  style={[
                    s.filterBtn,
                    {
                      backgroundColor: filterCategory === f.value ? theme.accentColor : 'transparent',
                      borderColor: filterCategory === f.value ? theme.accentColor : theme.borderColor,
                    },
                  ]}
                  onPress={() => setFilterCategory(f.value)}
                >
                  <Text
                    style={[
                      s.filterBtnText,
                      { color: filterCategory === f.value ? '#fff' : theme.textSecondary },
                    ]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Create Post Form ───────────────────────────────────── */}
          <View style={s.formCard}>
            <Text style={s.formTitle}>{getText('createPost')}</Text>

            {/* Category */}
            <Text style={s.sectionLabel}>{getText('category')}</Text>
            <View style={s.catRow}>
              {categories.map((c) => (
                <TouchableOpacity
                  key={c.value}
                  style={[s.catBtn, { backgroundColor: selectedCategory === c.value ? c.color : theme.bgSecondary }]}
                  onPress={() => !isEmergency && setSelectedCategory(c.value)}
                >
                  <Text style={[s.catBtnText, { color: selectedCategory === c.value ? '#fff' : theme.textSecondary }]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Text */}
            <Text style={s.sectionLabel}>{getText('whatsOnYourMind')}</Text>
            <TextInput
              style={s.postInput}
              placeholder={isEmergency ? getText('describeEmergency') : getText('shareThoughts')}
              placeholderTextColor={theme.textSecondary}
              value={newPost}
              onChangeText={setNewPost}
              multiline
            />

            {/* Location */}
            <Text style={s.sectionLabel}>Location (Optional)</Text>
            <View style={s.locationRow}>
              <TextInput
                style={s.locationInput}
                placeholder="Search Chennai locations…"
                placeholderTextColor={theme.textSecondary}
                value={location}
                onChangeText={(t) => {
                  setLocation(t);
                  setShowLocationSuggestions(t.length > 0);
                }}
                onFocus={() => location.length > 0 && setShowLocationSuggestions(true)}
              />
              <TouchableOpacity style={s.gpsBtn} onPress={getCurrentLocation}>
                <Text style={s.gpsBtnText}>📍 GPS</Text>
              </TouchableOpacity>
            </View>

            {/* Location suggestions */}
            {showLocationSuggestions && filteredPlaces.length > 0 && (
              <ScrollView style={s.suggestionsBox} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {filteredPlaces.map((place) => (
                  <TouchableOpacity
                    key={place}
                    style={s.suggestionItem}
                    onPress={() => {
                      setLocation(place);
                      setShowLocationSuggestions(false);
                    }}
                  >
                    <Text style={s.suggestionText}>{place}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Image Attach */}
            <Text style={s.sectionLabel}>Attach Image (Optional)</Text>
            <View style={s.attachRow}>
              <TouchableOpacity style={s.attachBtn} onPress={pickImage}>
                <Text style={s.attachBtnText}>📷 Choose Photo</Text>
              </TouchableOpacity>
              {attachedImage && (
                <>
                  <Image source={{ uri: attachedImage.uri }} style={s.attachPreview} />
                  <TouchableOpacity onPress={() => setAttachedImage(null)}>
                    <Text style={s.removeImgText}>Remove</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Share location toggle */}
            {location.length > 0 && (
              <View style={s.shareRow}>
                <Text style={s.shareLabel}>Share location with post</Text>
                <Switch
                  value={shareLocation}
                  onValueChange={setShareLocation}
                  trackColor={{ false: '#767577', true: theme.accentColor + '80' }}
                  thumbColor={shareLocation ? theme.accentColor : '#f4f3f4'}
                />
              </View>
            )}

            {/* Submit */}
            <TouchableOpacity
              style={[
                s.postBtn,
                {
                  backgroundColor: !newPost.trim()
                    ? '#ccc'
                    : isEmergency
                    ? '#f44336'
                    : theme.accentColor,
                  opacity: !newPost.trim() ? 0.6 : 1,
                },
              ]}
              disabled={!newPost.trim()}
              onPress={handlePost}
              activeOpacity={0.8}
            >
              <Text style={s.postBtnText}>
                {isEmergency ? '⚠️ Post Emergency' : '✏️ Post Message'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Posts Feed ──────────────────────────────────────────── */}
          {filteredPosts.length === 0 ? (
            <Text style={s.emptyText}>No posts yet. Be the first to share something with the community!</Text>
          ) : (
            filteredPosts.map((post) => (
              <View
                key={post.id}
                style={[
                  s.postCard,
                  post.category === 'emergency' && { borderLeftWidth: 4, borderLeftColor: '#f44336' },
                  post.category === 'accessibility' && { borderLeftWidth: 4, borderLeftColor: '#4caf50' },
                  post.category === 'general' && { borderLeftWidth: 4, borderLeftColor: theme.accentColor },
                ]}
              >
                {/* Post Header */}
                <View style={s.postHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, flexWrap: 'wrap' }}>
                    <Text style={s.postUser}>{post.username}</Text>
                    <View style={[s.badge, { backgroundColor: getCategoryColor(post.category) }]}>
                      <Text style={s.badgeText}>
                        {categories.find((c) => c.value === post.category)?.label || post.category}
                      </Text>
                    </View>
                    {post.category === 'emergency' && (
                      <View style={s.urgentBadge}>
                        <Text style={s.urgentBadgeText}>URGENT</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.postTime}>{formatTimeAgo(post.timestamp)}</Text>
                </View>

                {post.location ? <Text style={s.postLocation}>📍 {post.location}</Text> : null}

                {/* Content */}
                <Text style={s.postContent}>{post.content}</Text>

                {/* Post Image */}
                {post.image && post.image.uri ? (
                  <Image source={{ uri: post.image.uri }} style={s.postImage} resizeMode="cover" />
                ) : null}

                {/* Actions */}
                <View style={s.actionsRow}>
                  <TouchableOpacity style={s.actionBtn} onPress={() => handleLike(post.id)}>
                    <Text
                      style={[
                        s.actionText,
                        {
                          color: post.userLiked ? theme.accentColor : theme.textSecondary,
                          fontWeight: post.userLiked ? '600' : '400',
                        },
                      ]}
                    >
                      👍 Like ({post.likes})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.actionBtn} onPress={() => handleHelpful(post.id)}>
                    <Text
                      style={[
                        s.actionText,
                        {
                          color: post.userMarkedHelpful ? '#4caf50' : theme.textSecondary,
                          fontWeight: post.userMarkedHelpful ? '600' : '400',
                        },
                      ]}
                    >
                      ✅ Helpful ({post.helpful})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.actionBtn} onPress={() => toggleComments(post.id)}>
                    <Text style={[s.actionText, { color: theme.textSecondary }]}>
                      💬 Comments ({post.comments.length})
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Comments Section */}
                {showComments[post.id] && (
                  <View style={s.commentSection}>
                    {post.comments.map((c) => (
                      <View key={c.id} style={s.comment}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={s.commentUser}>{c.username}</Text>
                          <Text style={s.commentTime}>{formatTimeAgo(c.timestamp)}</Text>
                        </View>
                        <Text style={s.commentText}>{c.content}</Text>
                      </View>
                    ))}

                    {/* Add comment */}
                    <View style={s.addCommentRow}>
                      <TextInput
                        style={s.commentInput}
                        placeholder="Add a comment…"
                        placeholderTextColor={theme.textSecondary}
                        value={newComment[post.id] || ''}
                        onChangeText={(t) => setNewComment((prev) => ({ ...prev, [post.id]: t }))}
                        onSubmitEditing={() => handleComment(post.id)}
                        returnKeyType="send"
                      />
                      <TouchableOpacity
                        style={[
                          s.replyBtn,
                          {
                            backgroundColor: newComment[post.id]?.trim()
                              ? theme.accentColor
                              : theme.borderColor,
                          },
                        ]}
                        disabled={!newComment[post.id]?.trim()}
                        onPress={() => handleComment(post.id)}
                      >
                        <Text style={s.replyBtnText}>Reply</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
