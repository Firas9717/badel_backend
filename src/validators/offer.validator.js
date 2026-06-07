const Joi = require('joi');

const categories = ['electronique','informatique','maison','vetements','vehicules','livres','loisirs','bebe','sport','beaute','services_pro','artisanat','cours','freelance','musique','animaux','agriculture','autre',
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
const conditions = ['neuf','comme_neuf','bon','acceptable','pour_pieces'];

const createOfferSchema = Joi.object({
    title: Joi.string().min(5).max(100).required().messages({
        'string.min': 'العنوان لازم يكون فيه 5 حروف على الأقل.',
        'string.empty': 'العنوان ما يلزمش يكون فارغ.',
        'any.required': 'العنوان ضروري.'
    }),
    description: Joi.string().min(1).max(2000).required().messages({
        'string.empty': 'الوصف ما يلزمش يكون فارغ.',
        'any.required': 'الوصف ضروري.'
    }),
    category: Joi.string().valid(...categories).required().messages({
        'any.only': 'الصنف هذا مش موجود.',
        'any.required': 'الصنف ضروري.'
    }),
    condition: Joi.string().valid(...conditions).optional().messages({
        'any.only': 'الحالة هذي مش موجودة.',
    }),
    estimatedValue: Joi.alternatives().try(
        Joi.number().min(0).max(100000),
        Joi.string().pattern(/^\d+(\.\d+)?$/).empty('')
    ).optional().messages({
        'alternatives.match': 'القيمة لازم تكون رقم صحيح.',
        'number.min': 'القيمة لازم تكون موجبة.',
    }),
    offerType: Joi.string().valid('bien', 'service').required().messages({
        'any.only': 'نوع الإعلان غير صحيح.',
        'any.required': 'نوع الإعلان ضروري.'
    }),
    seekingType: Joi.string().valid('bien', 'service', 'both', 'open').required().messages({
        'any.only': 'نوع التبادل غير صحيح.',
        'any.required': 'نوع التبادل ضروري.'
    }),
    governorate: Joi.string().required().messages({
        'any.required': 'الولاية ضرورية.'
    }),
    city: Joi.string().optional().allow(''),
    exchangeFor: Joi.string().max(500).allow('').optional()
});

module.exports = {
    createOfferSchema
};
