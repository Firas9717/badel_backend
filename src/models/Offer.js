const mongoose = require('mongoose');

const categoryEnum = ['electronique','informatique','maison','vetements','vehicules','livres','loisirs','bebe','sport','beaute','services_pro','artisanat','cours','freelance','musique','animaux','agriculture','autre',
    'electricien', 'plombier', 'reparateur_climatisation', 'reparateur_machine_laver', 'reparateur_refrigerateur', 'reparateur_television', 'reparateur_chauffe_eau', 'serrurier', 'vitrier', 'menuisier_bois', 'menuisier_aluminium', 'peintre_batiment', 'carreleur', 'macon', 'faux_plafond', 'etancheite', 'jardinier', 'nettoyage_maison', 'nettoyage_canape', 'desinfection', 'deratisation',
    'mecanicien_auto', 'electricien_auto', 'depannage_voiture', 'lavage_auto', 'polissage_voiture', 'location_voiture', 'chauffeur_prive', 'taxi', 'remorquage', 'livraison_colis', 'demenagement', 'transport_meubles',
    'cameraman', 'photographe', 'drone_operator', 'montage_video', 'graphiste', 'community_manager', 'createur_contenu', 'motion_designer', 'developpeur_web', 'developpeur_mobile', 'designer_logo', 'voice_over',
    'reparation_pc', 'reparation_telephone', 'installation_reseau', 'cybersecurite', 'installation_cameras', 'maintenance_informatique', 'creation_site_web', 'publicite_reseaux', 'seo', 'formation_informatique',
    'architecte', 'ingenieur_batiment', 'decorateur_interieur', 'agent_immobilier', 'expert_immobilier', 'topographe', 'panneaux_solaires', 'ferronnier', 'soudeur',
    'traiteur', 'patissier', 'chef_domicile', 'serveur_evenements', 'decoration_mariage', 'dj', 'animateur', 'location_materiel_fete', 'organisation_evenements',
    'cours_particuliers', 'professeur_langues', 'coach_sportif', 'nutritionniste', 'coach_business', 'formation_marketing_digital', 'formation_montage_video', 'soutien_scolaire',
    'infirmier_domicile', 'kinesitherapeute', 'aide_personnes_agees', 'psychologue', 'coiffeur_domicile', 'maquilleuse', 'estheticienne', 'massage',
    'veterinaire', 'toilettage_animaux', 'garde_animaux', 'promenade_chiens',
    'gardiennage', 'installation_alarmes', 'securite_evenements'];


const photoSchema = new mongoose.Schema({
  url: { type: String, required: true },
  cloudinaryId: { type: String, required: true },
}, { _id: false });

const offerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, required: true, maxlength: 2000 },
  offerType: { type: String, required: true, enum: ['bien','service'] },
  category: { type: String, required: true, enum: categoryEnum },
  subcategory: { type: String, trim: true },
  photos: {
    type: [photoSchema],
    validate: {
      validator: function(v) {
        // Pour les services, les photos sont optionnelles (0 à 8)
        if (this.offerType === 'service') return v.length <= 8;
        // Pour les biens, au moins une photo est requise (1 à 8)
        return v.length >= 1 && v.length <= 8;
      },
      message: props => props.value.length < 1 
        ? 'Au moins une photo est requise pour un produit.' 
        : 'Maximum 8 photos autorisées.'
    }
  },
  condition: { type: String, enum: ['neuf','comme_neuf','bon','acceptable','pour_pieces'], required: function() { return this.offerType === 'bien'; } },
  estimatedValue: { type: Number, required: true, min: 0 },
  seekingType: { type: String, required: true, enum: ['bien','service','both','open'] },
  seekingDescription: { type: String, maxlength: 1000 },
  seekingCategories: [{ type: String, enum: categoryEnum }],
  moneyComplement: {
    willing: { type: Boolean, default: false },
    type: { type: String, enum: ['offering','requesting'] },
    amount: { type: Number, min: 0 },
    negotiable: { type: Boolean, default: true }
  },
  location: {
    governorate: { type: String, required: true },
    city: { type: String, required: true },
    coordinates: {
      type: { type: String, enum: ['Point'] },
      coordinates: { type: [Number] }
    }
  },
  status: { type: String, enum: ['active','paused','exchanged','expired','deleted'], default: 'active' },
  views: { type: Number, default: 0 },
  favorites: { type: Number, default: 0 },
  proposalsReceived: { type: Number, default: 0 },
  isBoosted: { type: Boolean, default: false },
  boostExpiry: { type: Date },
  expiresAt: { type: Date },
  tags: [{ type: String, trim: true, lowercase: true }],
}, { timestamps: true });

// Indexes
offerSchema.index({ user:1, category:1, status:1, offerType:1, seekingType:1 });
offerSchema.index({ title: 'text', description: 'text', tags: 'text' });
offerSchema.index({ 'location.coordinates': '2dsphere' });
offerSchema.index({ createdAt: -1 });

// Pre-save middleware: location normalization and expiration logic
offerSchema.pre('save', async function() {
  // Normalize GeoJSON coordinates
  if (this.location) {
    const coords = this.location.coordinates;
    // MongoDB 2dsphere allows undefined fields, but NOT partial objects like {type: 'Point'}
    if (!coords || !coords.coordinates || coords.coordinates.length === 0) {
      this.location.coordinates = undefined;
    } else {
      this.location.coordinates.type = 'Point';
    }
  }

  if (!this.expiresAt) {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    this.expiresAt = d;
  }

  // Auto-generate tags from title
  if (this.title && (!this.tags || this.tags.length === 0)) {
    const words = this.title.split(/\s+/)
      .map(w => w.replace(/[^a-zA-Z0-9\u00C0-\u024F]+/g, '').toLowerCase())
      .filter(w => w && w.length >= 3);
    const unique = Array.from(new Set(words)).slice(0, 10);
    this.tags = unique;
  }
});

// Methods
offerSchema.methods.incrementViews = function() {
  this.views = (this.views || 0) + 1;
  return this.save();
};

offerSchema.methods.isExpired = function() {
  if (!this.expiresAt) return false;
  return Date.now() > this.expiresAt.getTime();
};

offerSchema.methods.matchScore = function(otherOffer) {
  let total = 0;

  // Offer type vs other's seekingType
  try {
    const otherSeeking = otherOffer && otherOffer.seekingType;
    if (otherSeeking === 'open') total += 30;
    else if (this.offerType && otherSeeking && (this.offerType === otherSeeking)) total += 30;
  } catch (e) {}

  // Category overlap
  try {
    const overlap = (otherOffer.seekingCategories || []).includes(this.category) || (this.seekingCategories || []).includes(otherOffer.category);
    if (overlap) total += 20;
  } catch (e) {}

  // Value proximity
  try {
    const v1 = this.estimatedValue || 0;
    const v2 = otherOffer.estimatedValue || 0;
    const maxV = Math.max(v1, v2, 1);
    const valueScore = 20 * (1 - Math.abs(v1 - v2) / maxV);
    total += Math.max(0, valueScore);
  } catch (e) {}

  // Location proximity
  try {
    if (this.location && otherOffer.location) {
      if (this.location.governorate && otherOffer.location.governorate && this.location.governorate === otherOffer.location.governorate) total += 15;
      if (this.location.city && otherOffer.location.city && this.location.city === otherOffer.location.city) total += 5;
    }
  } catch (e) {}

  // Other user's trust score contribution (simplified)
  try {
    if (otherOffer.user) total += 15;
  } catch (e) {}

  if (total > 100) total = 100;
  return Math.round(total);
};

// Statics
offerSchema.statics.findActiveByCategory = function(category) {
  return this.find({ status: 'active', expiresAt: { $gt: new Date() }, category }).sort({ createdAt: -1 });
};

offerSchema.statics.findNearby = function(coordinates, maxDistanceKm) {
  const meters = (maxDistanceKm || 5) * 1000;
  return this.find({
    status: 'active',
    expiresAt: { $gt: new Date() },
    'location.coordinates': {
      $nearSphere: {
        $geometry: { type: 'Point', coordinates },
        $maxDistance: meters
      }
    }
  });
};

module.exports = mongoose.model('Offer', offerSchema);
