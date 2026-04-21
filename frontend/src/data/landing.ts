// ─────────────────────────────────────────────
//  AgriNova — Centralized Static Data (Landing Page)
//  Images served from public/images/
// ─────────────────────────────────────────────

export const images = {
  heroSlide1:       '/images/landing/hero_slide_1.jpg',
  heroSlide2:       '/images/landing/hero_slide_2.jpg',
  aboutVineyard:    '/images/landing/about_vineyard_main.jpg',
  aboutFarmer:      '/images/landing/about_farmer.jpg',
  missionTarget:    '/images/landing/mission_target.png',
  decoPlant:        '/images/landing/deco_plant.png',
  serviceHealth:    '/images/landing/service_crop_health.png',
  serviceDisease:   '/images/landing/service_disease_detection.png',
  serviceMapping:   '/images/landing/service_field_mapping.png',
  serviceAnalytics: '/images/landing/service_analytics.png',
  servicePdf:       '/images/landing/service_pdf_reports.png',
  serviceAlerts:    '/images/landing/service-alerts.png',
  bgServiceDesc:    '/images/landing/bg_service_desc.jpg',
  bgTile1:          '/images/landing/bg_tile_1.jpg',
  bgTile2:          '/images/landing/bg_tile_2.jpg',
  howCapture:       '/images/landing/how-capture.png',
  testimonialSara:  '/images/landing/testimonial_sara.jpg',
  testimonialLena:  '/images/landing/testimonial_lena.jpg',
  testimonialAmira: '/images/landing/testimonial_amira.jpg',
  testimonialCarlos:'/images/landing/testimonial_carlos.jpg',
  contactFarmer:    '/images/landing/contact_farmer.png',
};

export const NAV_LINKS = [
  { label: 'Home',         href: '#home' },
  { label: 'About',        href: '#about' },
  { label: 'Services',     href: '#services' },
  { label: 'How It Works', href: '#team' },
  { label: 'Contact',      href: '#contact' },
];

export const HERO_SLIDES = [images.heroSlide1, images.heroSlide2];

export const HERO_STATS = [
  { value: '90%+', label: 'Accuracy' },
  { value: '10+',  label: 'Crop Types' },
  { value: '24/7', label: 'Monitoring' },
];

export const STATS = [
  { target: 90,  suffix: '%+', label: 'Detection Accuracy' },
  { target: 10,  suffix: '+',  label: 'Crop Types' },
  { target: 500, suffix: '+',  label: 'Fields Monitored' },
  { target: 247, suffix: '',   label: 'Real-Time Analysis', special: '24/7' },
];

export const VISION_FEATURES = [
  { icon: '🧠', name: 'Deep Learning',   desc: 'AI models detect plant diseases with 90%+ accuracy.' },
  { icon: '👁',  name: 'Computer Vision', desc: 'Analyzing leaf images for anomaly patterns.' },
  { icon: '📷', name: 'RGB Analysis',    desc: 'Color pattern detection in crop health data.' },
  { icon: '⚡', name: 'Real-Time AI',    desc: 'Instant anomaly alerts for faster decisions.' },
];

export const SERVICES = [
  { img: images.serviceHealth,   title: 'Crop Health Monitoring',  desc: 'Continuous monitoring of crop conditions using image analysis and AI-based detection.' },
  { img: images.serviceDisease,  title: 'Plant Disease Detection', desc: 'Automatic detection and classification of plant diseases using deep learning models.' },
  { img: images.serviceMapping,  title: 'Field Mapping',           desc: 'Interactive maps allow users to visualize agricultural fields and monitor crop health geographically.' },
  { img: images.serviceAnalytics,title: 'Agricultural Analytics',  desc: 'Access detailed statistics and reports about anomalies, crop conditions, and historical trends.' },
  { img: images.servicePdf,      title: 'PDF Reports',             desc: 'Generate and export detailed diagnostic reports including anomaly summaries and recommendations.' },
  { img: images.serviceAlerts,   title: 'Real-Time Alerts',        desc: 'Instant notifications when anomalies are detected with confidence scores and severity levels.' },
];

export const SERVICE_TILES = [
  { img: images.bgServiceDesc, label: 'Smart Monitoring' },
  { img: images.bgTile1,       label: 'Harvest Intelligence' },
  { img: images.bgTile2,       label: 'Field Analysis' },
];

export const HOW_STEPS = [
  {
    img: images.howCapture, num: '01', role: 'Capture',
    name: '📸 Field Image Capture',
    desc: 'Photograph your crops to launch the automatic AI analysis.',
    tags: ['Smartphone', 'Drone', 'Camera'],
  },
  {
    img: images.serviceDisease, num: '02', role: 'Analyze',
    name: '🔬 AI Image Analysis',
    desc: 'Deep learning & computer vision process RGB images in real time.',
    tags: ['Deep Learning', 'RGB Vision', 'Real-Time'],
  },
  {
    img: images.missionTarget, num: '03', role: 'Detect',
    name: '🎯 Automatic Detection',
    desc: 'Diseases, water stress and deficiencies detected with 90%+ accuracy.',
    tags: ['Disease', 'Water Stress', 'Deficiency'],
  },
  {
    img: images.servicePdf, num: '04', role: 'Result',
    name: '📋 Report',
    desc: 'PDF report with detected anomalies, treatments and health mapping.',
    tags: ['PDF Report', 'Mapping', 'Treatment'],
  },
];

export const TESTIMONIALS = [
  {
    img: images.testimonialSara, name: 'Sara M.',
    role: '🍅 Tomato Grower · Morocco', stars: 5,
    quote: 'AgriNova completely transformed how I monitor my crops. The AI detection is incredibly accurate and the real-time alerts saved my harvest twice this season.',
  },
  {
    img: images.testimonialLena, name: 'Lena K.',
    role: '🌿 Greenhouse Manager · Portugal', stars: 5,
    quote: 'Using my smartphone to scan plants and get instant disease diagnosis is like magic. The PDF reports are detailed and very useful for my agronomist team.',
  },
  {
    img: images.testimonialAmira, name: 'Amira T.',
    role: '🌸 Florist Farmer · Tunisia', stars: 4,
    quote: 'The field mapping feature is outstanding. I can now visualize my entire greenhouse health at a glance. Highly recommend for any serious grower.',
  },
  {
    img: images.testimonialCarlos, name: 'Carlos M.',
    role: '🌾 Wheat Farmer · Brazil', stars: 5,
    quote: "Incredible platform. The 90% detection accuracy speaks for itself. We reduced crop losses by 40% in just one season thanks to AgriNova's early warning system.",
  },
];

export const CONTACT_ITEMS = [
  { icon: '📍', label: 'Address', value: 'AgriNova Agricultural Innovation Lab\nTunis, Tunisia' },
  { icon: '📧', label: 'Email',   value: 'contact@agrinova-platform.com', href: 'mailto:contact@agrinova-platform.com' },
  { icon: '📞', label: 'Phone',   value: '+216 25 000 000' },
  { icon: '🌐', label: 'Website', value: 'www.agrinova-platform.com' },
];

export const FOOTER_NAV = [
  { label: '› Home',     href: '#home' },
  { label: '› About',    href: '#about' },
  { label: '› Services', href: '#services' },
  { label: '› Team',     href: '#team' },
  { label: '› Contact',  href: '#contact' },
];

export const FOOTER_SERVICES = [
  '› Crop Monitoring', '› Disease Detection', '› Field Mapping',
  '› AI Analytics',    '› Smart Alerts',
];

export const FOOTER_SOCIALS = [
  { label: '𝕏',  aria: 'X / Twitter' },
  { label: 'f',  aria: 'Facebook' },
  { label: 'in', aria: 'LinkedIn' },
  { label: '▶',  aria: 'YouTube' },
];

export const FOOTER_CONTACT = [
  { icon: '📍', text: 'Tunis, Tunisia — Smart Agriculture Hub' },
  { icon: '📞', text: '+216 71 000 000' },
  { icon: '✉️', text: 'contact@agrinova-platform.com' },
];
