// Chennai Metro Service for React Native — same data, no DOM dependencies

class MetroService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000;
  }

  get METRO_STATIONS() { return MetroService.METRO_STATIONS; }
  get FARE_STRUCTURE() { return MetroService.FARE_STRUCTURE; }

  static METRO_STATIONS = {
    'Wimco Nagar Depot': { code: 'WND', line: 'Blue', zone: 1, lat: 13.1543, lng: 80.3012, facilities: ['Parking'], connections: [] },
    'Wimco Nagar': { code: 'WN', line: 'Blue', zone: 1, lat: 13.1487, lng: 80.2987, facilities: ['Parking'], connections: [] },
    'Thiruvottriyur': { code: 'TVR', line: 'Blue', zone: 1, lat: 13.1423, lng: 80.2943, facilities: [], connections: [] },
    'Thiruvottriyur Theradi': { code: 'TVRT', line: 'Blue', zone: 1, lat: 13.1376, lng: 80.2898, facilities: [], connections: [] },
    'Kaladipet': { code: 'KLD', line: 'Blue', zone: 1, lat: 13.1312, lng: 80.2854, facilities: [], connections: [] },
    'Tollgate': { code: 'TG', line: 'Blue', zone: 1, lat: 13.1254, lng: 80.2812, facilities: [], connections: [] },
    'New Washermanpet': { code: 'NWP', line: 'Blue', zone: 1, lat: 13.1198, lng: 80.2776, facilities: [], connections: [] },
    'Tondiarpet': { code: 'TNP', line: 'Blue', zone: 1, lat: 13.1143, lng: 80.2734, facilities: [], connections: [] },
    'Sir Theagaraya College': { code: 'STC', line: 'Blue', zone: 1, lat: 13.1087, lng: 80.2689, facilities: [], connections: [] },
    'Washermanpet': { code: 'WMP', line: 'Blue', zone: 1, lat: 13.1043, lng: 80.2767, facilities: ['Escalator', 'Lift', 'Parking'], connections: [] },
    'Mannadi': { code: 'MAN', line: 'Blue', zone: 1, lat: 13.0947, lng: 80.2826, facilities: ['Escalator', 'Lift'], connections: [] },
    'High Court': { code: 'HC', line: 'Blue', zone: 1, lat: 13.0884, lng: 80.2854, facilities: ['Escalator', 'Lift', 'Parking'], connections: [] },
    'MGR Central (Chennai Central)': { code: 'MS', line: 'Blue', zone: 1, lat: 13.0827, lng: 80.2707, facilities: ['Escalator', 'Lift', 'Parking', 'Food Court'], connections: ['Railway Station', 'Bus Terminal', 'Green Line Interchange'] },
    'Government Estate': { code: 'GE', line: 'Blue', zone: 1, lat: 13.0732, lng: 80.2609, facilities: ['Escalator', 'Lift', 'Parking'], connections: [] },
    'LIC': { code: 'LIC', line: 'Blue', zone: 1, lat: 13.0676, lng: 80.2548, facilities: ['Escalator', 'Lift'], connections: [] },
    'Thousand Lights': { code: 'TL', line: 'Blue', zone: 1, lat: 13.0615, lng: 80.2482, facilities: ['Escalator', 'Lift', 'Parking'], connections: [] },
    'AG DMS': { code: 'AGDMS', line: 'Blue', zone: 1, lat: 13.0565, lng: 80.2425, facilities: ['Escalator', 'Lift'], connections: [] },
    'Teynampet': { code: 'TYNP', line: 'Blue', zone: 1, lat: 13.0479, lng: 80.2343, facilities: ['Escalator', 'Lift', 'Parking'], connections: [] },
    'Nandanam': { code: 'NAN', line: 'Blue', zone: 1, lat: 13.0398, lng: 80.2275, facilities: ['Escalator', 'Lift'], connections: [] },
    'Saidapet': { code: 'SAI', line: 'Blue', zone: 1, lat: 13.0321, lng: 80.2234, facilities: ['Escalator', 'Lift', 'Parking'], connections: ['Bus Terminal'] },
    'Little Mount': { code: 'LM', line: 'Blue', zone: 2, lat: 13.0187, lng: 80.2165, facilities: ['Escalator', 'Lift', 'Parking'], connections: [] },
    'Guindy': { code: 'GUI', line: 'Blue', zone: 2, lat: 13.0067, lng: 80.2101, facilities: ['Escalator', 'Lift', 'Parking'], connections: ['Railway Station'] },
    'Arignar Anna Alandur': { code: 'ALA', line: 'Blue', zone: 2, lat: 12.9954, lng: 80.2067, facilities: ['Escalator', 'Lift', 'Parking'], connections: ['Railway Station', 'Bus Terminal', 'Green Line Interchange'] },
    'Nanganallur Road': { code: 'NGL', line: 'Blue', zone: 2, lat: 12.9823, lng: 80.1987, facilities: ['Escalator', 'Lift'], connections: [] },
    'Meenambakkam': { code: 'MBM', line: 'Blue', zone: 2, lat: 12.9765, lng: 80.1865, facilities: ['Escalator', 'Lift', 'Parking'], connections: [] },
    'Chennai International Airport': { code: 'AIR', line: 'Blue', zone: 2, lat: 12.9941, lng: 80.1709, facilities: ['Escalator', 'Lift', 'Parking', 'Airport Shuttle'], connections: ['Chennai Airport Terminal 1', 'Airport Terminal 3'] },
    'Egmore': { code: 'EGM', line: 'Green', zone: 1, lat: 13.0732, lng: 80.2609, facilities: ['Escalator', 'Lift', 'Parking'], connections: ['Railway Station'] },
    'Nehru Park': { code: 'NP', line: 'Green', zone: 1, lat: 13.0789, lng: 80.2487, facilities: ['Escalator', 'Lift'], connections: [] },
    'Kilpauk Medical College': { code: 'KMC', line: 'Green', zone: 1, lat: 13.0834, lng: 80.2398, facilities: ['Escalator', 'Lift'], connections: [] },
    'Pachaiyappa College': { code: 'PC', line: 'Green', zone: 1, lat: 13.0876, lng: 80.2312, facilities: ['Escalator', 'Lift'], connections: [] },
    'Shenoy Nagar': { code: 'SN', line: 'Green', zone: 1, lat: 13.0732, lng: 80.2234, facilities: ['Escalator', 'Lift', 'Parking'], connections: [] },
    'Anna Nagar East': { code: 'ANE', line: 'Green', zone: 1, lat: 13.0876, lng: 80.2145, facilities: ['Escalator', 'Lift'], connections: [] },
    'Anna Nagar Tower': { code: 'ANT', line: 'Green', zone: 1, lat: 13.0934, lng: 80.2087, facilities: ['Escalator', 'Lift'], connections: [] },
    'Thirumangalam': { code: 'TM', line: 'Green', zone: 1, lat: 13.0987, lng: 80.2023, facilities: ['Escalator', 'Lift'], connections: [] },
    'Koyambedu': { code: 'KYB', line: 'Green', zone: 1, lat: 13.1043, lng: 80.1954, facilities: ['Escalator', 'Lift', 'Parking'], connections: ['Bus Terminal'] },
    'CMBT': { code: 'CMBT', line: 'Green', zone: 1, lat: 13.1098, lng: 80.1887, facilities: ['Escalator', 'Lift', 'Parking'], connections: ['Major Bus Terminal'] },
    'Arumbakkam': { code: 'ABK', line: 'Green', zone: 1, lat: 13.1154, lng: 80.1823, facilities: ['Escalator', 'Lift'], connections: [] },
    'Vadapalani': { code: 'VDP', line: 'Green', zone: 1, lat: 13.1023, lng: 80.1765, facilities: ['Escalator', 'Lift'], connections: [] },
    'Ashok Nagar': { code: 'ASN', line: 'Green', zone: 1, lat: 13.0967, lng: 80.1698, facilities: ['Escalator', 'Lift'], connections: [] },
    'Ekkattuthangal': { code: 'EKT', line: 'Green', zone: 2, lat: 13.0021, lng: 80.2054, facilities: ['Escalator', 'Lift'], connections: [] },
    'St Thomas Mount': { code: 'STM', line: 'Green', zone: 2, lat: 13.0021, lng: 80.2054, facilities: ['Escalator', 'Lift', 'Parking'], connections: ['Railway Station'] },
  };

  static FARE_STRUCTURE = {
    zone1_to_zone1: { min: 20, max: 30, token: 20, card: 18 },
    zone1_to_zone2: { min: 30, max: 50, token: 40, card: 36 },
    zone2_to_zone2: { min: 20, max: 30, token: 25, card: 22 },
  };

  getStationInfo(stationName) {
    const station = MetroService.METRO_STATIONS[stationName];
    if (station) return { name: stationName, ...station };
    const normalizedInput = stationName.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const [name, info] of Object.entries(MetroService.METRO_STATIONS)) {
      const norm = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (norm.includes(normalizedInput) || normalizedInput.includes(norm)) {
        return { name, ...info };
      }
    }
    return null;
  }

  calculateFare(fromStation, toStation) {
    const from = this.getStationInfo(fromStation);
    const to = this.getStationInfo(toStation);
    if (!from || !to) return { error: 'Station not found', fare: null };

    let fareType;
    if (from.zone === 1 && to.zone === 1) fareType = 'zone1_to_zone1';
    else if ((from.zone === 1 && to.zone === 2) || (from.zone === 2 && to.zone === 1)) fareType = 'zone1_to_zone2';
    else fareType = 'zone2_to_zone2';

    const fareInfo = MetroService.FARE_STRUCTURE[fareType];
    return {
      from: from.name, to: to.name,
      distance: this.calculateDistance(from.lat, from.lng, to.lat, to.lng),
      fare: { token: fareInfo.token, card: fareInfo.card, currency: 'INR' },
      duration: this.estimateTravelTime(from, to),
      line: from.line === to.line ? from.line : 'Interchange',
      interchange: from.line !== to.line,
    };
  }

  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 100) / 100;
  }

  estimateTravelTime(from, to) {
    const distance = this.calculateDistance(from.lat, from.lng, to.lat, to.lng);
    const stationCount = this.getStationCount(from, to);
    const interchangeTime = from.line !== to.line ? 5 : 0;
    return Math.round((distance / 40) * 60 + stationCount * 2 + interchangeTime);
  }

  getStationCount(from, to) {
    const stations = Object.values(MetroService.METRO_STATIONS);
    const fromIdx = stations.findIndex(s => s.code === from.code);
    const toIdx = stations.findIndex(s => s.code === to.code);
    return Math.abs(toIdx - fromIdx);
  }

  getAllStations() {
    return Object.keys(MetroService.METRO_STATIONS).map(name => ({
      name, ...MetroService.METRO_STATIONS[name],
    })).sort((a, b) => a.line !== b.line ? (a.line === 'Blue' ? -1 : 1) : a.name.localeCompare(b.name));
  }

  searchStations(query) {
    if (!query || query.length < 2) return query ? [] : this.getAllStations();
    const norm = query.toLowerCase();
    return Object.keys(MetroService.METRO_STATIONS)
      .filter(name => name.toLowerCase().includes(norm) || MetroService.METRO_STATIONS[name].code.toLowerCase().includes(norm))
      .map(name => ({ name, ...MetroService.METRO_STATIONS[name] }))
      .sort((a, b) => a.line !== b.line ? (a.line === 'Blue' ? -1 : 1) : a.name.localeCompare(b.name));
  }

  async getMetroStatus() {
    const cached = this.cache.get('metro_status');
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) return cached.data;
    const status = {
      timestamp: new Date().toISOString(), operational: true,
      lines: {
        Blue: { status: 'Normal', delay: 0, frequency: '4-6 minutes' },
        Green: { status: 'Normal', delay: 0, frequency: '5-7 minutes' },
      },
      announcements: ['Metro services running normally', 'Please maintain social distancing'],
    };
    this.cache.set('metro_status', { data: status, timestamp: Date.now() });
    return status;
  }

  async getLiveTimings(stationName) {
    const station = this.getStationInfo(stationName);
    if (!station) return null;
    const now = new Date();
    const timings = [];
    for (let i = 0; i < 3; i++) {
      const arrival = new Date(now.getTime() + (i * 5 + 2) * 60000);
      timings.push({
        line: station.line,
        direction: i % 2 === 0 ? 'Northbound' : 'Southbound',
        arrival: arrival.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        minutesAway: i * 5 + 2,
        platform: i % 2 === 0 ? 'Platform 1' : 'Platform 2',
      });
    }
    return { station: station.name, lastUpdated: now.toLocaleTimeString('en-IN'), timings };
  }

  generateMetroSteps(from, to) {
    const steps = [`Board ${from.line} Line metro at ${from.name} station`];
    if (from.line !== to.line) {
      steps.push('Travel to interchange station');
      steps.push(`Change to ${to.line} Line`);
    }
    steps.push(`Travel towards ${to.name}`);
    steps.push(`Alight at ${to.name} station`);
    return steps;
  }

  getAccessibilityInfo(from, to) {
    const ff = from.facilities || [];
    const tf = to.facilities || [];
    return {
      wheelchairAccessible: ff.includes('Lift') && tf.includes('Lift'),
      escalators: ff.includes('Escalator') && tf.includes('Escalator'),
      parking: ff.includes('Parking') || tf.includes('Parking'),
      facilities: { from: ff, to: tf },
    };
  }

  async getMetroRoute(fromStation, toStation) {
    const from = this.getStationInfo(fromStation);
    const to = this.getStationInfo(toStation);
    if (!from || !to) throw new Error('Station not found');

    const fareData = this.calculateFare(fromStation, toStation);
    const accessibility = this.getAccessibilityInfo(from, to);
    const steps = this.generateMetroSteps(from, to);

    return {
      route: {
        from: from.name,
        to: to.name,
        distance: fareData.distance,
        duration: fareData.duration,
        fare: fareData.fare,
        line: fareData.line,
        interchange: fareData.interchange,
        accessibility,
        steps,
      },
    };
  }

  formatPrice(price) { return `₹${price}`; }
}

export default new MetroService();
