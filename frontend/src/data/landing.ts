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
  { label: 'Accueil',      href: '#home' },
  { label: 'À propos',     href: '#about' },
  { label: 'Services',     href: '#services' },
  { label: 'Comment ça marche', href: '#team' },
  { label: 'Contact',      href: '#contact' },
];

export const HERO_SLIDES = [images.heroSlide1, images.heroSlide2];

export const HERO_STATS = [
  { value: '90 %+', label: 'Précision' },
  { value: '10+',  label: 'Types de cultures' },
  { value: '24/7', label: 'Surveillance' },
];

export const STATS = [
  { target: 90,  suffix: '%+', label: 'Précision de détection' },
  { target: 10,  suffix: '+',  label: 'Types de cultures' },
  { target: 500, suffix: '+',  label: 'Parcelles suivies' },
  { target: 247, suffix: '',   label: 'Analyse en temps réel', special: '24/7' },
];

export const VISION_FEATURES = [
  { icon: '🧠', name: 'Apprentissage profond', desc: 'Des modèles d’IA détectent les maladies des plantes avec plus de 90 % de précision.' },
  { icon: '👁',  name: 'Vision par ordinateur', desc: 'Analyse des images de feuilles pour repérer les anomalies.' },
  { icon: '📷', name: 'Analyse RVB',     desc: 'Détection des motifs de couleur liés à la santé des cultures.' },
  { icon: '⚡', name: 'IA en temps réel', desc: 'Alertes immédiates pour décider plus vite.' },
];

export const SERVICES = [
  { img: images.serviceHealth,   title: 'Suivi de la santé des cultures', desc: 'Surveillance continue de l’état des cultures par analyse d’images et détection par IA.' },
  { img: images.serviceDisease,  title: 'Détection des maladies', desc: 'Détection et classification automatiques des maladies des plantes grâce à l’apprentissage profond.' },
  { img: images.serviceMapping,  title: 'Cartographie des parcelles', desc: 'Des cartes interactives pour visualiser vos parcelles et suivre la santé des cultures sur le terrain.' },
  { img: images.serviceAnalytics,title: 'Statistiques agricoles', desc: 'Statistiques et rapports détaillés sur les anomalies, l’état des cultures et leur évolution.' },
  { img: images.servicePdf,      title: 'Rapports PDF', desc: 'Générez et exportez des rapports de diagnostic détaillés, avec synthèse des anomalies et recommandations.' },
  { img: images.serviceAlerts,   title: 'Alertes en temps réel', desc: 'Notifications immédiates dès qu’une anomalie est détectée, avec score de confiance et niveau de gravité.' },
];

export const SERVICE_TILES = [
  { img: images.bgServiceDesc, label: 'Surveillance intelligente' },
  { img: images.bgTile1,       label: 'Récoltes maîtrisées' },
  { img: images.bgTile2,       label: 'Analyse des parcelles' },
];

export const HOW_STEPS = [
  {
    img: images.howCapture, num: '01', role: 'Capture',
    name: '📸 Prise de vue',
    desc: 'Photographiez vos cultures pour lancer l’analyse automatique par IA.',
    tags: ['Smartphone', 'Drone', 'Appareil photo'],
  },
  {
    img: images.serviceDisease, num: '02', role: 'Analyse',
    name: '🔬 Analyse d’image par IA',
    desc: 'L’apprentissage profond et la vision par ordinateur traitent les images RVB en temps réel.',
    tags: ['Apprentissage profond', 'Vision RVB', 'Temps réel'],
  },
  {
    img: images.missionTarget, num: '03', role: 'Détection',
    name: '🎯 Détection automatique',
    desc: 'Maladies, stress hydrique et carences détectés avec plus de 90 % de précision.',
    tags: ['Maladie', 'Stress hydrique', 'Carence'],
  },
  {
    img: images.servicePdf, num: '04', role: 'Résultat',
    name: '📋 Rapport',
    desc: 'Rapport PDF avec les anomalies détectées, les traitements et la carte de santé.',
    tags: ['Rapport PDF', 'Cartographie', 'Traitement'],
  },
];

export const TESTIMONIALS = [
  {
    img: images.testimonialSara, name: 'Sara M.',
    role: '🍅 Productrice de tomates · Maroc', stars: 5,
    quote: 'Elastic Solutions a complètement changé ma façon de suivre mes cultures. La détection par IA est d’une précision remarquable, et les alertes en temps réel ont sauvé ma récolte deux fois cette saison.',
  },
  {
    img: images.testimonialLena, name: 'Lena K.',
    role: '🌿 Responsable de serres · Portugal', stars: 5,
    quote: 'Photographier mes plantes avec mon smartphone et obtenir un diagnostic immédiat, c’est magique. Les rapports PDF sont détaillés et très utiles à mon équipe d’agronomes.',
  },
  {
    img: images.testimonialAmira, name: 'Amira T.',
    role: '🌸 Horticultrice · Tunisie', stars: 4,
    quote: 'La cartographie des parcelles est remarquable. Je vois maintenant l’état de toute ma serre d’un seul coup d’œil. Je la recommande à tout producteur sérieux.',
  },
  {
    img: images.testimonialCarlos, name: 'Carlos M.',
    role: '🌾 Céréalier · Brésil', stars: 5,
    quote: "Une plateforme incroyable. Les 90 % de précision parlent d’eux-mêmes. Nous avons réduit nos pertes de 40 % en une seule saison grâce au système d’alerte précoce d’Elastic Solutions.",
  },
];

export const CONTACT_ITEMS = [
  { icon: '📍', label: 'Adresse', value: 'Elastic Solutions — Laboratoire d’innovation agricole\nTunis, Tunisie' },
  { icon: '📧', label: 'E-mail',   value: 'contact@elasticsolutions-platform.com', href: 'mailto:contact@elasticsolutions-platform.com' },
  { icon: '📞', label: 'Téléphone',   value: '+216 25 000 000' },
  { icon: '🌐', label: 'Site web', value: 'www.elasticsolutions-platform.com' },
];

export const FOOTER_NAV = [
  { label: '› Accueil',  href: '#home' },
  { label: '› À propos', href: '#about' },
  { label: '› Services', href: '#services' },
  { label: '› Comment ça marche', href: '#team' },
  { label: '› Contact',  href: '#contact' },
];

export const FOOTER_SERVICES = [
  '› Suivi des cultures', '› Détection des maladies', '› Cartographie des parcelles',
  '› Statistiques IA',   '› Alertes intelligentes',
];

export const FOOTER_SOCIALS = [
  { label: '𝕏',  aria: 'X / Twitter' },
  { label: 'f',  aria: 'Facebook' },
  { label: 'in', aria: 'LinkedIn' },
  { label: '▶',  aria: 'YouTube' },
];

export const FOOTER_CONTACT = [
  { icon: '📍', text: 'Tunis, Tunisie — Pôle d’agriculture intelligente' },
  { icon: '📞', text: '+216 71 000 000' },
  { icon: '✉️', text: 'contact@elasticsolutions-platform.com' },
];
