// ═══════════════════════════════════════════════════════
//  BADEL — Categories Configuration (Onboarding)
//  Aligné sur les filtres réels de badel.html
//  Ajouter une catégorie ici l'ajoute automatiquement partout
// ═══════════════════════════════════════════════════════

const ONBOARDING_CATEGORIES = [
  // ─── PRODUITS ───
  {
    slug: 'electronique',
    label: 'Électronique',
    icon: 'fa-laptop',
    color: '#3B82F6',
    type: 'produit',
    offerCategories: ['electronique']
  },
  {
    slug: 'maison',
    label: 'Maison & Jardin',
    icon: 'fa-couch',
    color: '#0EA5E9',
    type: 'produit',
    offerCategories: ['maison']
  },
  {
    slug: 'vetements',
    label: 'Vêtements & Mode',
    icon: 'fa-tshirt',
    color: '#059669',
    type: 'produit',
    offerCategories: ['vetements']
  },
  {
    slug: 'vehicules',
    label: 'Véhicules',
    icon: 'fa-car',
    color: '#2563EB',
    type: 'produit',
    offerCategories: ['vehicules']
  },
  {
    slug: 'sport',
    label: 'Sport & Loisirs',
    icon: 'fa-running',
    color: '#22C55E',
    type: 'produit',
    offerCategories: ['sport']
  },
  {
    slug: 'bebe',
    label: 'Bébé & Enfant',
    icon: 'fa-baby',
    color: '#0284C7',
    type: 'produit',
    offerCategories: ['bebe']
  },

  // ─── SERVICES ───
  {
    slug: 'services_maison',
    label: 'Services Maison & Réparation',
    icon: 'fa-tools',
    color: '#1D4ED8',
    type: 'service',
    offerCategories: [
      'electricien', 'plombier', 'reparateur_climatisation',
      'reparateur_machine_laver', 'reparateur_refrigerateur',
      'reparateur_television', 'reparateur_chauffe_eau',
      'serrurier', 'vitrier', 'menuisier_bois', 'menuisier_aluminium',
      'peintre_batiment', 'carreleur', 'macon', 'faux_plafond',
      'etancheite', 'jardinier', 'nettoyage_maison',
      'nettoyage_canape', 'desinfection', 'deratisation'
    ]
  },
  {
    slug: 'services_auto',
    label: 'Services Auto & Transport',
    icon: 'fa-truck',
    color: '#047857',
    type: 'service',
    offerCategories: [
      'mecanicien_auto', 'electricien_auto', 'depannage_voiture',
      'lavage_auto', 'polissage_voiture', 'location_voiture',
      'chauffeur_prive', 'taxi', 'remorquage',
      'livraison_colis', 'demenagement', 'transport_meubles'
    ]
  },
  {
    slug: 'media_creation',
    label: 'Média & Création',
    icon: 'fa-camera',
    color: '#3B82F6',
    type: 'service',
    offerCategories: [
      'cameraman', 'photographe', 'drone_operator',
      'montage_video', 'graphiste', 'community_manager',
      'createur_contenu', 'motion_designer',
      'developpeur_web', 'developpeur_mobile',
      'designer_logo', 'voice_over'
    ]
  },
  {
    slug: 'digital_tech',
    label: 'Services Digital & Tech',
    icon: 'fa-microchip',
    color: '#10B981',
    type: 'service',
    offerCategories: [
      'reparation_pc', 'reparation_telephone', 'installation_reseau',
      'cybersecurite', 'installation_cameras', 'maintenance_informatique',
      'creation_site_web', 'publicite_reseaux', 'seo',
      'formation_informatique'
    ]
  },
  {
    slug: 'construction_immobilier',
    label: 'Construction & Immobilier',
    icon: 'fa-hard-hat',
    color: '#0EA5E9',
    type: 'service',
    offerCategories: [
      'architecte', 'ingenieur_batiment', 'decorateur_interieur',
      'agent_immobilier', 'expert_immobilier', 'topographe',
      'panneaux_solaires', 'ferronnier', 'soudeur'
    ]
  },
  {
    slug: 'education_coaching',
    label: 'Éducation & Coaching',
    icon: 'fa-graduation-cap',
    color: '#059669',
    type: 'service',
    offerCategories: [
      'cours_particuliers', 'professeur_langues', 'coach_sportif',
      'nutritionniste', 'coach_business', 'formation_marketing_digital',
      'formation_montage_video', 'soutien_scolaire'
    ]
  },
  {
    slug: 'animaux',
    label: 'Animaux',
    icon: 'fa-paw',
    color: '#2563EB',
    type: 'service',
    offerCategories: [
      'veterinaire', 'toilettage_animaux',
      'garde_animaux', 'promenade_chiens'
    ]
  }
];

// Top 6 catégories populaires par défaut (si l'utilisateur skip l'onboarding)
const DEFAULT_POPULAR_CATEGORIES = [
  'electronique', 'maison', 'vetements',
  'sport', 'services_maison', 'animaux'
];

// Slugs valides pour validation
const VALID_CATEGORY_SLUGS = ONBOARDING_CATEGORIES.map(c => c.slug);

/**
 * Résout les slugs d'onboarding en catégories Offer
 * @param {string[]} onboardingSlugs - Ex: ['electronique', 'sport']
 * @returns {string[]} - Ex: ['electronique', 'sport'] (catégories Offer uniques)
 */
function resolveOfferCategories(onboardingSlugs) {
  const result = new Set();
  for (const slug of onboardingSlugs) {
    const cat = ONBOARDING_CATEGORIES.find(c => c.slug === slug);
    if (cat) {
      for (const oc of cat.offerCategories) {
        result.add(oc);
      }
    }
  }
  return Array.from(result);
}

module.exports = {
  ONBOARDING_CATEGORIES,
  DEFAULT_POPULAR_CATEGORIES,
  VALID_CATEGORY_SLUGS,
  resolveOfferCategories
};
