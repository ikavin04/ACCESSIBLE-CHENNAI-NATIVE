// MTC Bus Service for React Native — same data, no DOM dependencies

class MTCBusService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 10 * 60 * 1000;
  }

  static BUS_ROUTES = {
    '1': { number: '1', name: 'Broadway - Thiruvanmiyur', type: 'Express', fare: { ordinary: 15, deluxe: 20 }, frequency: '10-15 minutes', operatingHours: '5:00 AM - 11:30 PM', keyStops: ['Broadway', 'Mount Road', 'Teynampet', 'Adyar', 'Thiruvanmiyur'], accessibility: ['Low Floor', 'Wheelchair Accessible'], distance: '25 km' },
    '2': { number: '2', name: 'Broadway - Pallavaram', type: 'Express', fare: { ordinary: 18, deluxe: 25 }, frequency: '8-12 minutes', operatingHours: '5:30 AM - 11:00 PM', keyStops: ['Broadway', 'Central', 'Guindy', 'Pallavaram'], accessibility: ['Low Floor'], distance: '30 km' },
    '5': { number: '5', name: 'Broadway - Airport', type: 'Express', fare: { ordinary: 20, deluxe: 30 }, frequency: '15-20 minutes', operatingHours: '4:30 AM - 12:00 AM', keyStops: ['Broadway', 'Egmore', 'Guindy', 'Meenambakkam', 'Airport'], accessibility: ['Low Floor', 'AC Available'], distance: '35 km' },
    '12': { number: '12', name: 'Broadway - Tambaram', type: 'Express', fare: { ordinary: 22, deluxe: 32 }, frequency: '10-15 minutes', operatingHours: '5:00 AM - 11:30 PM', keyStops: ['Broadway', 'Saidapet', 'Guindy', 'Chrompet', 'Tambaram'], accessibility: ['Low Floor', 'Wheelchair Accessible'], distance: '40 km' },
    '21': { number: '21', name: 'Broadway - Anna Nagar', type: 'Ordinary', fare: { ordinary: 12, deluxe: 18 }, frequency: '8-12 minutes', operatingHours: '5:15 AM - 11:15 PM', keyStops: ['Broadway', 'Egmore', 'Kilpauk', 'Anna Nagar'], accessibility: ['Standard'], distance: '20 km' },
    '23A': { number: '23A', name: 'Broadway - T.Nagar - Adyar', type: 'Ordinary', fare: { ordinary: 14, deluxe: 20 }, frequency: '6-10 minutes', operatingHours: '5:00 AM - 11:45 PM', keyStops: ['Broadway', 'Thousand Lights', 'T.Nagar', 'Saidapet', 'Adyar'], accessibility: ['Low Floor', 'Wheelchair Accessible'], distance: '22 km' },
    '27D': { number: '27D', name: 'Broadway - OMR - Sholinganallur', type: 'Deluxe', fare: { ordinary: 25, deluxe: 35 }, frequency: '15-20 minutes', operatingHours: '5:30 AM - 10:30 PM', keyStops: ['Broadway', 'Adyar', 'Thoraipakkam', 'Sholinganallur'], accessibility: ['AC', 'Low Floor', 'USB Charging'], distance: '45 km' },
    '42': { number: '42', name: 'Koyambedu - Central - Beach', type: 'Ordinary', fare: { ordinary: 10, deluxe: 15 }, frequency: '5-8 minutes', operatingHours: '5:00 AM - 12:00 AM', keyStops: ['Koyambedu', 'Central', 'Broadway', 'High Court', 'Beach'], accessibility: ['Standard'], distance: '18 km' },
    '70': { number: '70', name: 'Koyambedu - Velachery', type: 'Express', fare: { ordinary: 16, deluxe: 22 }, frequency: '10-15 minutes', operatingHours: '5:15 AM - 11:30 PM', keyStops: ['Koyambedu', 'Vadapalani', 'T.Nagar', 'Guindy', 'Velachery'], accessibility: ['Low Floor'], distance: '28 km' },
    '100': { number: '100', name: 'Koyambedu - Thiruvanmiyur', type: 'Express', fare: { ordinary: 18, deluxe: 25 }, frequency: '12-18 minutes', operatingHours: '5:30 AM - 11:00 PM', keyStops: ['Koyambedu', 'T.Nagar', 'Adyar', 'Besant Nagar', 'Thiruvanmiyur'], accessibility: ['Low Floor', 'Wheelchair Accessible'], distance: '32 km' },
  };

  static BUS_STOPS = {
    'Broadway': { lat: 13.0878, lng: 80.2785, zone: 'Central', facilities: ['Shelter', 'Digital Display'] },
    'Central Railway Station': { lat: 13.0827, lng: 80.2707, zone: 'Central', facilities: ['Metro Connection', 'Shelter'] },
    'Egmore': { lat: 13.0732, lng: 80.2609, zone: 'Central', facilities: ['Railway Connection', 'Shelter'] },
    'T.Nagar': { lat: 13.0418, lng: 80.2341, zone: 'Central', facilities: ['Shopping Hub', 'Multiple Routes'] },
    'Koyambedu': { lat: 13.1043, lng: 80.1954, zone: 'North', facilities: ['Bus Terminal', 'Metro Connection'] },
    'Anna Nagar': { lat: 13.0876, lng: 80.2145, zone: 'North', facilities: ['Metro Connection', 'Shelter'] },
    'Adyar': { lat: 13.0067, lng: 80.2568, zone: 'South', facilities: ['Shelter', 'Multiple Routes'] },
    'Velachery': { lat: 12.9749, lng: 80.2230, zone: 'South', facilities: ['Bus Terminal', 'Shelter'] },
    'Thiruvanmiyur': { lat: 12.9820, lng: 80.2707, zone: 'South', facilities: ['Beach Access', 'Shelter'] },
    'Guindy': { lat: 13.0067, lng: 80.2101, zone: 'West', facilities: ['Railway Connection', 'Metro Connection'] },
    'Tambaram': { lat: 12.9249, lng: 80.1000, zone: 'South', facilities: ['Railway Connection', 'Bus Terminal'] },
    'Airport': { lat: 12.9941, lng: 80.1709, zone: 'South', facilities: ['Airport Terminal', 'Metro Connection'] },
  };

  getBusRoute(routeNumber) {
    const route = MTCBusService.BUS_ROUTES[routeNumber];
    return route ? { routeNumber, ...route } : null;
  }

  searchRoutes(query) {
    if (!query || query.length < 2) return [];
    const norm = query.toLowerCase();
    return Object.entries(MTCBusService.BUS_ROUTES)
      .filter(([num, r]) => `${r.name} ${r.keyStops.join(' ')} ${num}`.toLowerCase().includes(norm))
      .map(([num, r]) => ({ routeNumber: num, ...r }))
      .slice(0, 10);
  }

  getRoutesBetween(from, to) {
    if (!from || !to) return [];
    const fN = from.toLowerCase(), tN = to.toLowerCase();
    const matching = [];
    Object.entries(MTCBusService.BUS_ROUTES).forEach(([num, route]) => {
      const stops = route.keyStops.map(s => s.toLowerCase());
      const hasFrom = stops.some(s => s.includes(fN));
      const hasTo = stops.some(s => s.includes(tN));
      if (hasFrom && hasTo) {
        const fi = stops.findIndex(s => s.includes(fN));
        const ti = stops.findIndex(s => s.includes(tN));
        matching.push({
          routeNumber: num, ...route,
          fromStop: route.keyStops[fi], toStop: route.keyStops[ti],
          direction: fi < ti ? 'forward' : 'reverse',
          estimatedTime: Math.abs(ti - fi) * 8 + 15,
        });
      }
    });
    return matching;
  }

  getAllAreas() {
    const areas = {
      'Central Chennai': ['Broadway', 'Central Railway Station', 'Egmore', 'Mount Road', 'Anna Salai', 'Thousand Lights', 'T.Nagar', 'Nungambakkam'],
      'North Chennai': ['Koyambedu', 'Anna Nagar', 'Kilpauk', 'Ambattur', 'Avadi'],
      'South Chennai': ['Adyar', 'Velachery', 'Tambaram', 'Chrompet', 'Pallavaram', 'Thiruvanmiyur', 'Besant Nagar', 'Sholinganallur'],
      'West Chennai': ['Porur', 'Vadapalani', 'Ashok Nagar', 'Saidapet', 'Guindy', 'Kodambakkam'],
    };
    const all = [];
    Object.values(areas).forEach(a => all.push(...a));
    return [...new Set(all)].sort();
  }

  async getLiveBusTimings(busStop) {
    const now = new Date();
    const routesAtStop = Object.entries(MTCBusService.BUS_ROUTES)
      .filter(([_, r]) => r.keyStops.some(s => s.toLowerCase().includes(busStop.toLowerCase())));
    const timings = routesAtStop.map(([num, route], i) => {
      const delay = i * 3 + Math.floor(Math.random() * 8);
      return {
        routeNumber: num, routeName: route.name, type: route.type,
        nextArrival: new Date(now.getTime() + delay * 60000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        minutesAway: delay, frequency: route.frequency, accessibility: route.accessibility, fare: route.fare,
      };
    }).sort((a, b) => a.minutesAway - b.minutesAway);
    return { busStop, lastUpdated: now.toLocaleTimeString('en-IN'), timings };
  }

  async getMTCStatus() {
    return {
      timestamp: new Date().toISOString(), operational: true,
      totalBuses: 3200,
      totalRoutes: Object.keys(MTCBusService.BUS_ROUTES).length,
      announcements: [
        'Free travel for all women in ordinary city buses',
        'Free travel for physically challenged persons with attender',
        'Digital payment accepted - UPI, cards',
      ],
      specialServices: { womenFree: true, disabledFree: true, transgenderFree: true, digitalPayment: true },
    };
  }

  searchAll(query) {
    if (!query || query.length < 2) return { routes: [], areas: [], stops: [] };
    const norm = query.toLowerCase();
    const routes = this.searchRoutes(query);
    const areas = this.getAllAreas().filter(a => a.toLowerCase().includes(norm));
    const stops = Object.keys(MTCBusService.BUS_STOPS).filter(s => s.toLowerCase().includes(norm));
    return { routes, areas, stops };
  }

  getAccessibilityInfo(routeNumber) {
    const route = MTCBusService.BUS_ROUTES[routeNumber];
    if (!route) return null;
    return {
      wheelchairAccessible: route.accessibility.includes('Wheelchair Accessible'),
      lowFloor: route.accessibility.includes('Low Floor'),
      acAvailable: route.accessibility.includes('AC Available') || route.accessibility.includes('AC'),
      specialConcessions: { women: 'Free in ordinary buses', disabled: 'Free with attender', transgender: 'Free' },
    };
  }
}

export default new MTCBusService();
