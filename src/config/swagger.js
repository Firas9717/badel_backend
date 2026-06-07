const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'BADEL API',
    version: '1.0.0',
    description:
      'API de la plateforme de troc BADEL.\n\n' +
      '**Comment tester :** \n' +
      '1. Appelez `POST /api/auth/login` pour obtenir un token.\n' +
      '2. Cliquez sur le bouton **Authorize** (cadenas) en haut a droite.\n' +
      '3. Entrez `Bearer <votre_token>` et validez.\n' +
      '4. Tous les endpoints proteges sont maintenant accessibles.',
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Serveur de developpement local',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Entrez le token JWT au format : Bearer <token>',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Message d\'erreur' },
        },
      },
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation reussie' },
        },
      },
      AuthRegister: {
        type: 'object',
        required: ['firstName', 'lastName', 'email', 'phone', 'password', 'passwordConfirm', 'location'],
        properties: {
          firstName: { type: 'string', minLength: 2, maxLength: 50, example: 'Firas' },
          lastName: { type: 'string', minLength: 2, maxLength: 50, example: 'Flen' },
          email: { type: 'string', format: 'email', example: 'nouveau.utilisateur@badel.tn' },
          phone: {
            type: 'string',
            example: '29888777',
            description: 'Numero de telephone tunisien valide : 8 chiffres commencant par 2,3,4,5,6,7 ou 9. Optionnellement prefixe +216 ou 00216.',
          },
          password: {
            type: 'string',
            minLength: 6,
            example: 'SecureP4ssword',
            description: 'Minimum 6 caracteres avec au moins un chiffre',
          },
          passwordConfirm: { type: 'string', example: 'SecureP4ssword' },
          location: {
            type: 'object',
            required: ['governorate', 'city'],
            properties: {
              governorate: {
                type: 'string',
                example: 'Tunis',
                enum: [
                  'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan',
                  'Bizerte', 'Beja', 'Jendouba', 'Kef', 'Siliana', 'Sousse',
                  'Monastir', 'Mahdia', 'Sfax', 'Kairouan', 'Kasserine', 'Sidi Bouzid',
                  'Gabes', 'Medenine', 'Tataouine', 'Gafsa', 'Tozeur', 'Kebili',
                ],
              },
              city: { type: 'string', example: 'Tunis' },
              coordinates: {
                type: 'array',
                items: { type: 'number' },
                example: [10.1815, 36.8065],
                description: '[longitude, latitude]',
              },
            },
          },
        },
      },
      AuthLogin: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'firas@example.com' },
          password: { type: 'string', example: 'SecureP4ssword' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          user: { type: 'object' },
        },
      },
      MoneyComplement: {
        type: 'object',
        description: 'Complement monetaire optionnel pour equilibrer un echange',
        properties: {
          willing: { type: 'boolean', example: true },
          type: { type: 'string', enum: ['offering', 'requesting'], example: 'offering' },
          amount: { type: 'number', minimum: 0, example: 50 },
          negotiable: { type: 'boolean', example: true },
        },
      },
      LocationUpdate: {
        type: 'object',
        properties: {
          governorate: {
            type: 'string',
            example: 'Tunis',
            enum: [
              'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan',
              'Bizerte', 'Beja', 'Jendouba', 'Kef', 'Siliana', 'Sousse',
              'Monastir', 'Mahdia', 'Sfax', 'Kairouan', 'Kasserine', 'Sidi Bouzid',
              'Gabes', 'Medenine', 'Tataouine', 'Gafsa', 'Tozeur', 'Kebili',
            ],
          },
          city: { type: 'string', example: 'Tunis' },
          coordinates: {
            type: 'array',
            items: { type: 'number' },
            example: [10.1815, 36.8065],
            description: '[longitude, latitude]',
          },
        },
      },
      DealProposal: {
        type: 'object',
        required: ['offerId'],
        properties: {
          offerId: { type: 'string', example: '641d0bff9f1f2c0012345678', description: 'ID de l\'offre ciblee' },
          counterOffer: { type: 'string', example: 'Je propose un echange contre mon velo de montagne' },
          meetingLocation: { type: 'string', example: 'Avenue Habib Bourguiba, Tunis' },
          meetingTime: { type: 'string', format: 'date-time', example: '2026-05-01T18:00:00Z' },
        },
      },
      ReviewCreate: {
        type: 'object',
        required: ['dealId', 'rating'],
        properties: {
          dealId: { type: 'string', example: '643f0bff9f1f2c0012345678' },
          rating: { type: 'number', minimum: 1, maximum: 5, example: 5 },
          comment: { type: 'string', example: 'Echange tres serieux et fiable, merci !' },
        },
      },
      ReportCreate: {
        type: 'object',
        required: ['reportedUser', 'reason'],
        properties: {
          reportedUser: { type: 'string', example: '642f0bff9f1f2c0012345678' },
          offerId: { type: 'string', example: '643f0bff9f1f2c0012345678' },
          reason: { type: 'string', example: 'Annonce frauduleuse' },
          details: { type: 'string', example: 'La personne demande un paiement avant de confirmer l\'echange.' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
};

const options = {
  definition: swaggerDefinition,
  apis: [],
};

const swaggerSpec = swaggerJSDoc(options);

swaggerSpec.paths = {

  // ══════════════════════════════════════════════
  // HEALTH
  // ══════════════════════════════════════════════
  '/api/health': {
    get: {
      tags: ['Health'],
      summary: 'Verifier que l\'API est en ligne',
      security: [],
      responses: {
        200: {
          description: 'API operationnelle',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'BADEL API is running' },
                  timestamp: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
    },
  },

  // ══════════════════════════════════════════════
  // AUTHENTIFICATION
  // ══════════════════════════════════════════════
  '/api/auth/register': {
    post: {
      tags: ['Auth'],
      summary: 'Creer un nouveau compte utilisateur',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AuthRegister' },
          },
        },
      },
      responses: {
        201: {
          description: 'Compte cree avec succes',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
        },
        400: {
          description: 'Erreur de validation (champ manquant, email deja utilise, etc.)',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
        },
      },
    },
  },

  '/api/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Se connecter — copier le token et cliquer sur Authorize',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AuthLogin' },
          },
        },
      },
      responses: {
        200: {
          description: 'Connecte avec succes. Copiez le champ "token" et utilisez-le dans Authorize.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
        },
        401: {
          description: 'Identifiants invalides',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
        },
        403: { description: 'Compte banni' },
      },
    },
  },

  '/api/auth/me': {
    get: {
      tags: ['Auth'],
      summary: 'Recuperer le profil de l\'utilisateur connecte',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'token',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description: 'Alternative : vous pouvez aussi passer le token ici dans l\'URL (Dev Mode)',
        },
      ],
      responses: {
        200: { description: 'Profil retourne avec favoris popules' },
        401: { description: 'Token manquant ou invalide' },
      },
    },
  },

  '/api/auth/forgot-password': {
    post: {
      tags: ['Auth'],
      summary: 'Demander un lien de reinitialisation de mot de passe',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email'],
              properties: {
                email: { type: 'string', format: 'email', example: 'firas@example.com' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'En mode development, le resetUrl est retourne dans la reponse' },
        404: { description: 'Aucun compte associe a cet email' },
      },
    },
  },

  '/api/auth/reset-password/{token}': {
    put: {
      tags: ['Auth'],
      summary: 'Reinitialiser le mot de passe avec le token recu',
      security: [],
      parameters: [
        {
          name: 'token',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'Token obtenu depuis la reponse de forgot-password (en mode dev)',
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['password', 'passwordConfirm'],
              properties: {
                password: { type: 'string', example: 'NewSecureP4ss' },
                passwordConfirm: { type: 'string', example: 'NewSecureP4ss' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Mot de passe reinitialise avec succes' },
        400: { description: 'Token invalide ou expire' },
      },
    },
  },

  '/api/auth/update-password': {
    put: {
      tags: ['Auth'],
      summary: 'Modifier le mot de passe de l\'utilisateur connecte',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'token',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description: 'Alternative : vous pouvez aussi passer le token ici dans l\'URL (Dev Mode)',
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['currentPassword', 'newPassword', 'newPasswordConfirm'],
              properties: {
                currentPassword: { type: 'string', example: 'SecureP4ssword' },
                newPassword: { type: 'string', example: 'NewSecureP4ss' },
                newPasswordConfirm: { type: 'string', example: 'NewSecureP4ss' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Mot de passe mis a jour' },
        401: { description: 'Mot de passe actuel incorrect' },
      },
    },
  },

  '/api/auth/logout': {
    post: {
      tags: ['Auth'],
      summary: 'Deconnecter l\'utilisateur courant',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'token',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description: 'Alternative : vous pouvez aussi passer le token ici dans l\'URL (Dev Mode)',
        },
      ],
      responses: { 200: { description: 'Deconnecte avec succes' } },
    },
  },

  // ══════════════════════════════════════════════
  // UTILISATEURS
  // ══════════════════════════════════════════════
  '/api/users/profile': {
    get: {
      tags: ['Users'],
      summary: 'Recuperer son propre profil complet',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'token',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description: 'Alternative : vous pouvez aussi passer le token ici dans l\'URL (Dev Mode)',
        },
      ],
      responses: {
        200: { description: 'Profil retourne' },
        401: { description: 'Non authentifie' },
      },
    },
    put: {
      tags: ['Users'],
      summary: 'Mettre a jour son profil (avec photo optionnelle)',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'token',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description: 'Alternative : vous pouvez aussi passer le token ici dans l\'URL (Dev Mode)',
        },
      ],
      requestBody: {
        required: false,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                photo: {
                  type: 'string',
                  format: 'binary',
                  description: 'Photo de profil (jpeg/png/webp, max 5MB)',
                },
                firstName: { type: 'string', example: 'Firas' },
                lastName: { type: 'string', example: 'Faxi' },
                phone: { type: 'string', example: '25123456' },
                bio: { type: 'string', example: 'Passione d\'echanges depuis 2020.' },
                city: { type: 'string', example: 'Tunis' },
                governorate: { type: 'string', example: 'Tunis' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Profil mis a jour' },
        400: { description: 'Erreur de validation' },
      },
    },
  },

  '/api/users/favorites': {
    get: {
      tags: ['Users'],
      summary: 'Recuperer les offres sauvegardees en favoris',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'token',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description: 'Alternative : vous pouvez aussi passer le token ici dans l\'URL (Dev Mode)',
        },
      ],
      responses: {
        200: { description: 'Liste de favoris retournee' },
        401: { description: 'Non authentifie' },
      },
    },
  },

  '/api/users/update-location': {
    put: {
      tags: ['Users'],
      summary: 'Mettre a jour la localisation de l\'utilisateur',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'token',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description: 'Alternative : vous pouvez aussi passer le token ici dans l\'URL (Dev Mode)',
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/LocationUpdate' },
          },
        },
      },
      responses: { 200: { description: 'Localisation mise a jour' } },
    },
  },

  '/api/users/account': {
    delete: {
      tags: ['Users'],
      summary: 'Supprimer definitivement son compte',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'token',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description: 'Alternative : vous pouvez aussi passer le token ici dans l\'URL (Dev Mode)',
        },
      ],
      responses: { 200: { description: 'Compte supprime' } },
    },
  },

  '/api/users/{id}': {
    get: {
      tags: ['Users'],
      summary: 'Consulter le profil public d\'un utilisateur',
      security: [],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          example: '641d0bff9f1f2c0012345678',
        },
      ],
      responses: {
        200: { description: 'Profil public retourne' },
        404: { description: 'Utilisateur non trouve' },
      },
    },
  },

  // ══════════════════════════════════════════════
  // OFFRES
  // ══════════════════════════════════════════════
  '/api/offers/my/offers': {
    get: {
      tags: ['Offers'],
      summary: 'Recuperer toutes mes offres (tous statuts)',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Mes offres retournees' } },
    },
  },

  '/api/offers/user/{userId}': {
    get: {
      tags: ['Offers'],
      summary: 'Recuperer les offres actives d\'un utilisateur',
      security: [],
      parameters: [
        {
          name: 'userId',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          example: '641d0bff9f1f2c0012345678',
        },
      ],
      responses: { 200: { description: 'Offres de l\'utilisateur retournees' } },
    },
  },

  '/api/offers': {
    get: {
      tags: ['Offers'],
      summary: 'Lister les offres avec filtres et pagination',
      security: [],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        {
          name: 'category',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['electronique','informatique','maison','vetements','vehicules','livres',
                   'loisirs','bebe','sport','beaute','services_pro','artisanat','cours',
                   'freelance','musique','animaux','agriculture','autre'],
          },
        },
        { name: 'offerType', in: 'query', schema: { type: 'string', enum: ['bien', 'service'] } },
        { name: 'seekingType', in: 'query', schema: { type: 'string', enum: ['bien', 'service', 'both', 'open'] } },
        { name: 'governorate', in: 'query', schema: { type: 'string' }, example: 'Tunis' },
        {
          name: 'condition',
          in: 'query',
          schema: { type: 'string', enum: ['neuf', 'comme_neuf', 'bon', 'acceptable', 'pour_pieces'] },
        },
        { name: 'minValue', in: 'query', schema: { type: 'number' } },
        { name: 'maxValue', in: 'query', schema: { type: 'number' } },
        {
          name: 'sortBy',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['newest', 'oldest', 'value_high', 'value_low', 'most_viewed'],
            default: 'newest',
          },
        },
      ],
      responses: {
        200: { description: 'Liste d\'offres retournee avec pagination' },
      },
    },

    post: {
      tags: ['Offers'],
      summary: 'Creer une nouvelle offre (multipart/form-data)',
      description:
        'Envoyer en **multipart/form-data**.\n\n' +
        '- `location` : chaine JSON **obligatoire** ex: `{"governorate":"Tunis","city":"Tunis"}`\n' +
        '- `moneyComplement` : chaine JSON optionnelle ex: `{"willing":true,"type":"offering","amount":50,"negotiable":true}`\n' +
        '- `seekingCategories` : tableau JSON optionnel ex: `["electronique","maison"]`\n' +
        '- `tags` : tableau JSON ou virgule-separe ex: `["chaise","bois"]` ou `chaise,bois`\n' +
        '- `photos` : **obligatoire pour offerType=bien**, max 8 fichiers, max 5MB chacun.',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['title', 'description', 'offerType', 'category', 'estimatedValue', 'seekingType', 'location'],
              properties: {
                title: { type: 'string', maxLength: 100, example: 'Chaise en bois vintage' },
                description: { type: 'string', maxLength: 2000, example: 'Chaise en bois massif en bon etat, ideale pour salon.' },
                offerType: { type: 'string', enum: ['bien', 'service'], example: 'bien' },
                category: {
                  type: 'string',
                  enum: ['electronique','informatique','maison','vetements','vehicules','livres',
                         'loisirs','bebe','sport','beaute','services_pro','artisanat','cours',
                         'freelance','musique','animaux','agriculture','autre'],
                  example: 'maison',
                },
                condition: {
                  type: 'string',
                  enum: ['neuf', 'comme_neuf', 'bon', 'acceptable', 'pour_pieces'],
                  example: 'bon',
                  description: 'Obligatoire si offerType=bien',
                },
                estimatedValue: { type: 'number', minimum: 0, example: 120 },
                seekingType: {
                  type: 'string',
                  enum: ['bien', 'service', 'both', 'open'],
                  example: 'open',
                },
                seekingDescription: { type: 'string', example: 'Accepte tout objet de valeur similaire' },
                seekingCategories: {
                  type: 'string',
                  example: '["electronique","maison"]',
                  description: 'Tableau JSON des categories recherchees',
                },
                location: {
                  type: 'string',
                  example: '{"governorate":"Tunis","city":"Tunis"}',
                  description: 'OBLIGATOIRE — chaine JSON avec governorate et city',
                },
                moneyComplement: {
                  type: 'string',
                  example: '{"willing":false}',
                  description: 'Chaine JSON du complement monetaire',
                },
                tags: {
                  type: 'string',
                  example: 'chaise,bois,vintage',
                  description: 'Tags virgule-separes ou tableau JSON',
                },
                photos: {
                  type: 'array',
                  items: { type: 'string', format: 'binary' },
                  description: 'Photos de l\'offre (jpeg/png/webp, max 5MB chacune). Obligatoires pour offerType=bien.',
                },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Offre creee avec succes' },
        400: { description: 'Validation echouee ou photo manquante pour offerType=bien' },
        401: { description: 'Non authentifie' },
      },
    },
  },

  '/api/offers/{id}': {
    get: {
      tags: ['Offers'],
      summary: 'Recuperer une offre par son ID (incremente le compteur de vues)',
      security: [],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: '641d0bff9f1f2c0012345678' },
      ],
      responses: {
        200: { description: 'Offre retournee' },
        404: { description: 'Offre non trouvee' },
      },
    },

    put: {
      tags: ['Offers'],
      summary: 'Modifier une offre (doit etre proprietaire)',
      description:
        'Envoyer en **multipart/form-data**.\n\n' +
        '- `location` : chaine JSON ex: `{"governorate":"Tunis","city":"Tunis"}`\n' +
        '- `moneyComplement` : chaine JSON ex: `{"willing":true,"type":"offering","amount":50}`\n' +
        '- `seekingCategories` : tableau JSON ex: `["maison"]`\n' +
        '- `removedPhotos` : tableau JSON des Cloudinary IDs a supprimer ex: `["badel/offers/abc123"]`',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: '641d0bff9f1f2c0012345678' },
      ],
      requestBody: {
        required: false,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                title: { type: 'string', example: 'Chaise en bois vintage - MAJ' },
                description: { type: 'string' },
                offerType: { type: 'string', enum: ['bien', 'service'] },
                category: { type: 'string' },
                condition: { type: 'string', enum: ['neuf', 'comme_neuf', 'bon', 'acceptable', 'pour_pieces'] },
                estimatedValue: { type: 'number' },
                seekingType: { type: 'string', enum: ['bien', 'service', 'both', 'open'] },
                seekingDescription: { type: 'string' },
                seekingCategories: { type: 'string', description: 'Tableau JSON ex: ["maison"]' },
                location: { type: 'string', description: 'chaine JSON ex: {"governorate":"Tunis","city":"Tunis"}' },
                moneyComplement: { type: 'string', description: 'chaine JSON ex: {"willing":true,"type":"offering","amount":50}' },
                tags: { type: 'string', description: 'Virgule-separes ou tableau JSON' },
                status: { type: 'string', enum: ['active', 'paused', 'exchanged', 'expired', 'deleted'] },
                photos: { type: 'array', items: { type: 'string', format: 'binary' }, description: 'Nouvelles photos a ajouter' },
                removedPhotos: {
                  type: 'string',
                  description: 'Tableau JSON des Cloudinary IDs a supprimer ex: ["badel/offers/abc123"]',
                  example: '[]',
                },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Offre mise a jour' },
        403: { description: 'Non autorise (pas proprietaire)' },
        404: { description: 'Offre non trouvee' },
      },
    },

    delete: {
      tags: ['Offers'],
      summary: 'Supprimer (soft-delete) une offre (doit etre proprietaire)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Offre supprimee (statut passe a deleted)' },
        403: { description: 'Non autorise' },
        404: { description: 'Offre non trouvee' },
      },
    },
  },

  '/api/offers/{id}/favorite': {
    put: {
      tags: ['Offers'],
      summary: 'Ajouter/retirer une offre des favoris (toggle)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Favori bascule — isFavorited indique l\'etat actuel' },
        404: { description: 'Offre non trouvee' },
      },
    },
  },

  '/api/offers/{id}/boost': {
    put: {
      tags: ['Offers'],
      summary: 'Booster une offre pendant 24h (doit etre proprietaire)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Offre boostee pour 24h' },
        403: { description: 'Non autorise' },
        404: { description: 'Offre non trouvee' },
      },
    },
  },

  // ══════════════════════════════════════════════
  // DEALS (PROPOSITIONS D'ECHANGE)
  // ══════════════════════════════════════════════
  '/api/deals': {
    post: {
      tags: ['Deals'],
      summary: 'Proposer un deal sur une offre',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/DealProposal' },
          },
        },
      },
      responses: {
        201: { description: 'Deal propose avec succes' },
        400: { description: 'Erreur de validation' },
        401: { description: 'Non authentifie' },
      },
    },
  },

  '/api/deals/my': {
    get: {
      tags: ['Deals'],
      summary: 'Recuperer tous mes deals (en tant que proposeur ou receveur)',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Deals retournes' } },
    },
  },

  '/api/deals/{id}': {
    get: {
      tags: ['Deals'],
      summary: 'Recuperer un deal par ID (doit etre participant)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Deal retourne' },
        403: { description: 'Pas participant de ce deal' },
        404: { description: 'Deal non trouve' },
      },
    },
  },

  '/api/deals/{id}/respond': {
    put: {
      tags: ['Deals'],
      summary: 'Repondre a un deal : accepter, rejeter ou contre-proposer',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['action'],
              properties: {
                action: {
                  type: 'string',
                  enum: ['accept', 'reject', 'counter'],
                  example: 'accept',
                },
                counterOffer: {
                  type: 'string',
                  example: 'Je propose un echange contre un autre produit de valeur similaire.',
                  description: 'Obligatoire si action=counter',
                },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Reponse enregistree' },
        400: { description: 'Action invalide' },
      },
    },
  },

  '/api/deals/{id}/accept-counter': {
    put: {
      tags: ['Deals'],
      summary: 'Accepter la contre-proposition d\'un deal',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: { 200: { description: 'Contre-proposition acceptee' } },
    },
  },

  '/api/deals/{id}/meeting': {
    put: {
      tags: ['Deals'],
      summary: 'Planifier un rendez-vous pour le deal',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['meetingLocation', 'meetingTime'],
              properties: {
                meetingLocation: { type: 'string', example: 'Place de la Republique, Tunis' },
                meetingTime: { type: 'string', format: 'date-time', example: '2026-05-03T14:30:00Z' },
              },
            },
          },
        },
      },
      responses: { 200: { description: 'Rendez-vous planifie' } },
    },
  },

  '/api/deals/{id}/confirm': {
    put: {
      tags: ['Deals'],
      summary: 'Confirmer que l\'echange a bien eu lieu',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: { 200: { description: 'Echange confirme' } },
    },
  },

  '/api/deals/{id}/cancel': {
    put: {
      tags: ['Deals'],
      summary: 'Annuler un deal',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: { 200: { description: 'Deal annule' } },
    },
  },

  // ══════════════════════════════════════════════
  // MESSAGERIE
  // ══════════════════════════════════════════════
  '/api/messages/conversations': {
    get: {
      tags: ['Messages'],
      summary: 'Lister toutes les conversations de l\'utilisateur',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Conversations retournees' } },
    },
    post: {
      tags: ['Messages'],
      summary: 'Demarrer une nouvelle conversation avec un utilisateur',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['participantId'],
              properties: {
                participantId: {
                  type: 'string',
                  example: '642e0bff9f1f2c0012345679',
                  description: 'ID de l\'autre utilisateur',
                },
                initialMessage: {
                  type: 'string',
                  example: 'Bonjour, je souhaite discuter de votre offre.',
                },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Conversation demarree' },
        400: { description: 'Erreur de validation' },
      },
    },
  },

  '/api/messages/unread-count': {
    get: {
      tags: ['Messages'],
      summary: 'Nombre de messages non lus',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Compteur retourne' } },
    },
  },

  '/api/messages/conversation/{conversationId}': {
    get: {
      tags: ['Messages'],
      summary: 'Recuperer tous les messages d\'une conversation',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'conversationId',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          example: '642e0bff9f1f2c0012345678',
        },
      ],
      responses: { 200: { description: 'Messages retournes' } },
    },
  },

  '/api/messages': {
    post: {
      tags: ['Messages'],
      summary: 'Envoyer un message dans une conversation (avec image optionnelle)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['conversationId', 'receiverId'],
              properties: {
                conversationId: { type: 'string', example: '642e0bff9f1f2c0012345678' },
                receiverId: { type: 'string', example: '642e0bff9f1f2c0012345679' },
                content: { type: 'string', example: 'Bonjour, je suis interesse par votre offre.' },
                image: {
                  type: 'string',
                  format: 'binary',
                  description: 'Image optionnelle (jpeg/png/webp, max 5MB)',
                },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Message envoye' },
        400: { description: 'Erreur de validation' },
      },
    },
  },

  // ══════════════════════════════════════════════
  // AVIS
  // ══════════════════════════════════════════════
  '/api/reviews': {
    post: {
      tags: ['Reviews'],
      summary: 'Creer un avis apres un echange termine',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ReviewCreate' },
          },
        },
      },
      responses: {
        201: { description: 'Avis cree' },
        400: { description: 'Erreur de validation ou deal non eligible' },
      },
    },
  },

  '/api/reviews/user/{userId}': {
    get: {
      tags: ['Reviews'],
      summary: 'Recuperer tous les avis recus par un utilisateur',
      security: [],
      parameters: [
        { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: { 200: { description: 'Avis retournes' } },
    },
  },

  '/api/reviews/deal/{dealId}': {
    get: {
      tags: ['Reviews'],
      summary: 'Recuperer les avis d\'un deal specifique',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'dealId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: { 200: { description: 'Avis du deal retournes' } },
    },
  },

  // ══════════════════════════════════════════════
  // NOTIFICATIONS
  // ══════════════════════════════════════════════
  '/api/notifications': {
    get: {
      tags: ['Notifications'],
      summary: 'Recuperer toutes les notifications de l\'utilisateur',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Notifications retournees' } },
    },
  },

  '/api/notifications/unread-count': {
    get: {
      tags: ['Notifications'],
      summary: 'Nombre de notifications non lues',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Compteur retourne' } },
    },
  },

  '/api/notifications/read-all': {
    put: {
      tags: ['Notifications'],
      summary: 'Marquer toutes les notifications comme lues',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Toutes les notifications marquees comme lues' } },
    },
  },

  '/api/notifications/{id}/read': {
    put: {
      tags: ['Notifications'],
      summary: 'Marquer une notification specifique comme lue',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: { 200: { description: 'Notification marquee comme lue' } },
    },
  },

  // ══════════════════════════════════════════════
  // RECHERCHE
  // ══════════════════════════════════════════════
  '/api/search': {
    get: {
      tags: ['Search'],
      summary: 'Recherche textuelle dans les offres',
      security: [],
      parameters: [
        { name: 'q', in: 'query', required: true, schema: { type: 'string' }, example: 'chaise bois' },
        {
          name: 'category',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['electronique','informatique','maison','vetements','vehicules','livres',
                   'loisirs','bebe','sport','beaute','services_pro','artisanat','cours',
                   'freelance','musique','animaux','agriculture','autre'],
          },
        },
        { name: 'offerType', in: 'query', schema: { type: 'string', enum: ['bien', 'service'] } },
        { name: 'minValue', in: 'query', schema: { type: 'number' } },
        { name: 'maxValue', in: 'query', schema: { type: 'number' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: { 200: { description: 'Resultats de recherche retournes' } },
    },
  },

  '/api/search/nearby': {
    get: {
      tags: ['Search'],
      summary: 'Rechercher des offres a proximite d\'un point GPS',
      security: [],
      parameters: [
        { name: 'latitude', in: 'query', required: true, schema: { type: 'number' }, example: 36.8065 },
        { name: 'longitude', in: 'query', required: true, schema: { type: 'number' }, example: 10.1815 },
        { name: 'maxDistance', in: 'query', schema: { type: 'number' }, description: 'Distance max en km', example: 10 },
      ],
      responses: { 200: { description: 'Offres proches retournees' } },
    },
  },

  '/api/search/categories': {
    get: {
      tags: ['Search'],
      summary: 'Recuperer les categories avec le nombre d\'offres',
      security: [],
      responses: { 200: { description: 'Categories avec compteurs retournees' } },
    },
  },

  '/api/search/autocomplete': {
    get: {
      tags: ['Search'],
      summary: 'Suggestions d\'autocomplete pour la recherche',
      security: [],
      parameters: [
        { name: 'q', in: 'query', required: true, schema: { type: 'string' }, example: 'chai' },
      ],
      responses: { 200: { description: 'Suggestions retournees' } },
    },
  },

  // ══════════════════════════════════════════════
  // MATCHING
  // ══════════════════════════════════════════════
  '/api/matches/my': {
    get: {
      tags: ['Matches'],
      summary: 'Trouver des correspondances pour toutes mes offres',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Correspondances retournees' } },
    },
  },

  '/api/matches/mutual': {
    get: {
      tags: ['Matches'],
      summary: 'Correspondances mutuelles (les deux utilisateurs veulent ce que l\'autre propose)',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Correspondances mutuelles retournees' } },
    },
  },

  '/api/matches/offer/{offerId}': {
    get: {
      tags: ['Matches'],
      summary: 'Trouver des correspondances pour une offre specifique',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'offerId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: { 200: { description: 'Correspondances retournees' } },
    },
  },

  // ══════════════════════════════════════════════
  // SIGNALEMENTS
  // ══════════════════════════════════════════════
  '/api/reports': {
    post: {
      tags: ['Reports'],
      summary: 'Signaler un utilisateur ou une offre',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ReportCreate' },
          },
        },
      },
      responses: {
        201: { description: 'Signalement cree' },
        400: { description: 'Erreur de validation' },
      },
    },
  },

  '/api/reports/my': {
    get: {
      tags: ['Reports'],
      summary: 'Recuperer mes signalements soumis',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Mes signalements retournes' } },
    },
  },
};

module.exports = swaggerSpec;
