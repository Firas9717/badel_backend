const User = require('../models/User');
const Offer = require('../models/Offer');
const Deal = require('../models/Deal');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Report = require('../models/Report');
const Review = require('../models/Review');
const Notification = require('../models/Notification');
const Event = require('../models/Event');

const crypto = require('crypto');
const { cookieOptions } = require('../config/auth');

/**
 * @desc    Admin login
 * @route   POST /api/admin/login
 * @access  Public
 */
exports.adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@badel.tn';
        const adminPass = process.env.ADMIN_PASS || 'Badel@2026';
        
        let isAdminValid = false;
        let adminUser = await User.findOne({ email, role: 'admin' }).select('+password');
        
        if (adminUser) {
            // Existing admin user in DB — verify password
            isAdminValid = await adminUser.comparePassword(password);
        } else if (email === adminEmail && password === adminPass) {
            // Env/default credentials match — auto-create a real admin user in DB
            isAdminValid = true;
            adminUser = await User.findOne({ email });
            if (adminUser) {
                // User exists but isn't admin — promote them
                adminUser.role = 'admin';
                await adminUser.save();
            } else {
                // Create a brand new admin user
                adminUser = await User.create({
                    firstName: 'Admin',
                    lastName: 'BADEL',
                    email: adminEmail,
                    password: adminPass,
                    role: 'admin',
                    isEmailVerified: true,
                    isActive: true,
                    trustScore: 100
                });
            }
        }

        if (!isAdminValid) {
            return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
        }

        // Generate token
        const jwt = require('jsonwebtoken');
        const token = jwt.sign({ id: adminUser._id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1d' });
        
        res.status(200).cookie('token', token, cookieOptions).json({ success: true, message: 'Admin login successful', token });
    } catch (err) {
        console.error('Admin Login Error:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

/**
 * @desc    Track a user or system event
 * @route   POST /api/admin/track
 * @access  Public (so guests can be tracked)
 */
exports.trackEvent = async (req, res) => {
    try {
        const { eventName, properties, device, source } = req.body;
        if (!eventName) return res.status(400).json({ success: false, message: 'eventName is required' });

        const event = await Event.create({
            eventName,
            user: req.user ? req.user._id : null,
            properties: properties || {},
            device: device || 'unknown',
            source: source || 'direct',
            ipAddress: req.ip
        });

        res.status(201).json({ success: true, eventId: event._id });
    } catch (err) {
        // Fail silently so we don't break frontend if analytics fail
        console.error('Track Event Error:', err);
        res.status(200).json({ success: false, message: 'Failed to track event' });
    }
};

/**
 * @desc    Get comprehensive dashboard statistics
 * @route   GET /api/admin/stats
 * @access  Private/Admin
 */
exports.getAdminStats = async (req, res) => {
    try {
        // ── 1. Total Counts ──
        const [
            totalUsers, totalOffers, totalDeals,
            totalMessages, totalConversations,
            totalReports, totalReviews, totalNotifications
        ] = await Promise.all([
            User.countDocuments(),
            Offer.countDocuments(),
            Deal.countDocuments(),
            Message.countDocuments(),
            Conversation.countDocuments(),
            Report.countDocuments(),
            Review.countDocuments(),
            Notification.countDocuments()
        ]);

        // Active / Banned users
        const [activeUsers, bannedUsers] = await Promise.all([
            User.countDocuments({ isActive: true, isBanned: false }),
            User.countDocuments({ isBanned: true })
        ]);

        // Active offers
        const activeOffers = await Offer.countDocuments({ status: 'active' });

        // Pending reports
        const pendingReports = await Report.countDocuments({ status: 'pending' });

        // ── 2. Registrations by Month (all time) ──
        const registrationsByMonth = await User.aggregate([
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        // ── 3. Category distribution ──
        const categoryStats = await Offer.aggregate([
            { $group: { _id: "$category", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // ── 4. Offer Type distribution (Bien vs Service) ──
        const typeStats = await Offer.aggregate([
            { $group: { _id: "$offerType", count: { $sum: 1 } } }
        ]);

        // ── 5. City/Governorate distribution (from Users) ──
        const cityStats = await User.aggregate([
            { $match: { "location.governorate": { $ne: null } } },
            { $group: { _id: "$location.governorate", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // ── 6. Deals by Status ──
        const dealsByStatus = await Deal.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // ── 7. Completed deals count ──
        const completedDeals = await Deal.countDocuments({ status: 'completed' });

        // ── 8. Daily activity over the last 30 days (messages sent) ──
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const dailyMessages = await Message.aggregate([
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                        day: { $dayOfMonth: "$createdAt" }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
        ]);

        // ── 9. Daily new offers over the last 30 days ──
        const dailyOffers = await Offer.aggregate([
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                        day: { $dayOfMonth: "$createdAt" }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
        ]);

        // ── 10. Daily new deals over the last 30 days ──
        const dailyDeals = await Deal.aggregate([
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                        day: { $dayOfMonth: "$createdAt" }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
        ]);

        // ── 11. Recent Users (last 10) ──
        const recentUsers = await User.find()
            .select('firstName lastName email profilePhoto location createdAt isActive isBanned trustScore')
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        // ── 12. Recent Offers (last 10) ──
        const recentOffers = await Offer.find()
            .select('title category offerType status estimatedValue createdAt')
            .populate('user', 'firstName lastName')
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        // ── 13. Review average rating ──
        const reviewStats = await Review.aggregate([
            {
                $group: {
                    _id: null,
                    avgRating: { $avg: "$rating" },
                    total: { $sum: 1 }
                }
            }
        ]);

        // ── 14. Offer status distribution ──
        const offersByStatus = await Offer.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // ── 15. Offer condition distribution ──
        const offersByCondition = await Offer.aggregate([
            { $match: { condition: { $ne: null } } },
            { $group: { _id: "$condition", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // ── 16. Reports by reason ──
        const reportsByReason = await Report.aggregate([
            { $group: { _id: "$reason", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // ── 17. Trust score distribution ──
        const trustDistribution = await User.aggregate([
            {
                $bucket: {
                    groupBy: "$trustScore",
                    boundaries: [0, 20, 40, 60, 80, 101],
                    default: "Other",
                    output: { count: { $sum: 1 } }
                }
            }
        ]);

        // ── ADVANCED ANALYTICS (Priority 1) ──
        
        // 1. User Funnel (Approximation)
        const usersWithProfile = await User.countDocuments({ profilePhoto: { $exists: true, $ne: 'avatar.png' } });
        const usersWithOffers = (await Offer.distinct('user')).length;
        
        // 2. Dead Offers (> 7 days, 0 views)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const deadOffers = await Offer.countDocuments({ 
            createdAt: { $lt: sevenDaysAgo }, 
            status: 'active',
            $or: [{ views: 0 }, { views: { $exists: false } }] 
        });
        
        // 3. Response Rate - use aggregation to compare updatedAt vs createdAt
        let responseRate = 0;
        try {
            const convStats = await Conversation.aggregate([
                {
                    $project: {
                        hasResponse: {
                            $cond: [{ $gt: ["$updatedAt", "$createdAt"] }, 1, 0]
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        responded: { $sum: "$hasResponse" }
                    }
                }
            ]);
            if (convStats.length > 0 && convStats[0].total > 0) {
                responseRate = ((convStats[0].responded / convStats[0].total) * 100).toFixed(1);
            }
        } catch(e) { console.error('Response rate calc error:', e.message); }
        
        // 4. Reports by Category (Join Report with Offer using correct field names)
        let reportsByCategory = [];
        try {
            reportsByCategory = await Report.aggregate([
                { $match: { type: 'offer', targetOffer: { $exists: true } } },
                { $lookup: { from: 'offers', localField: 'targetOffer', foreignField: '_id', as: 'offer' } },
                { $unwind: "$offer" },
                { $group: { _id: "$offer.category", count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]);
        } catch(e) { console.error('Reports by category error:', e.message); }

        // 5. Offer Quality metrics
        let qualityStats = { withPhotos: 0, totalViews: 0 };
        try {
            const offerQualityStats = await Offer.aggregate([
                {
                    $group: {
                        _id: null,
                        withPhotos: { $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ["$photos", []] } }, 0] }, 1, 0] } },
                        totalViews: { $sum: { $ifNull: ["$views", 0] } }
                    }
                }
            ]);
            qualityStats = offerQualityStats[0] || { withPhotos: 0, totalViews: 0 };
        } catch(e) { console.error('Quality stats error:', e.message); }
        const percentWithPhotos = totalOffers > 0 ? ((qualityStats.withPhotos / totalOffers) * 100).toFixed(1) : 0;

        // 6. Site Events (Pageviews and Searches without results)
        const totalPageViews = await Event.countDocuments({ eventName: 'page_view' });
        const searchesNoResult = await Event.countDocuments({ eventName: 'search_no_result' });

        res.json({
            success: true,
            data: {
                counts: {
                    users: totalUsers,
                    activeUsers,
                    bannedUsers,
                    offers: totalOffers,
                    activeOffers,
                    deals: totalDeals,
                    completedDeals,
                    messages: totalMessages,
                    conversations: totalConversations,
                    reports: totalReports,
                    pendingReports,
                    reviews: totalReviews,
                    notifications: totalNotifications
                },
                registrations: registrationsByMonth,
                categories: categoryStats,
                types: typeStats,
                cities: cityStats,
                dealsByStatus,
                offersByStatus,
                offersByCondition,
                dailyMessages,
                dailyOffers,
                dailyDeals,
                recentUsers,
                recentOffers,
                reviewStats: reviewStats[0] || { avgRating: 0, total: 0 },
                reportsByReason,
                trustDistribution,
                advanced: {
                    userFunnel: {
                        visitors: totalPageViews > 0 ? totalPageViews : totalUsers * 3, // Use actual page views if available
                        registered: totalUsers,
                        profileCompleted: usersWithProfile,
                        firstOffer: usersWithOffers
                    },
                    offerFunnel: {
                        views: qualityStats.totalViews,
                        messages: totalMessages,
                        dealsProposed: totalDeals,
                        dealsCompleted: completedDeals
                    },
                    deadOffers,
                    responseRate,
                    reportsByCategory,
                    offerQuality: {
                        percentWithPhotos
                    },
                    events: {
                        pageViews: totalPageViews,
                        searchesNoResult
                    }
                }
            }
        });
    } catch (err) {
        console.error('Admin stats error:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

/**
 * @desc    Get paginated and searchable users list
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
exports.getUsers = async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        const query = {};
        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        const skip = (page - 1) * limit;
        const [users, total] = await Promise.all([
            User.find(query)
                .select('firstName lastName email profilePhoto location createdAt isActive isBanned trustScore banReason')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            User.countDocuments(query)
        ]);
        res.json({
            success: true,
            data: {
                users,
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error('Get Users Error:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

/**
 * @desc    Ban a user
 * @route   PATCH /api/admin/users/:id/ban
 * @access  Private/Admin
 */
exports.banUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
        }

        user.isBanned = true;
        user.banReason = reason || 'Non spécifiée';
        await user.save();

        const { disconnectUser } = require('../config/socket');
        if (disconnectUser) disconnectUser(id);

        res.json({ success: true, message: 'Utilisateur banni avec succès', user });
    } catch (err) {
        console.error('Ban User Error:', err);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};

/**
 * @desc    Unban a user
 * @route   PATCH /api/admin/users/:id/unban
 * @access  Private/Admin
 */
exports.unbanUser = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
        }

        user.isBanned = false;
        user.banReason = undefined;
        await user.save();

        res.json({ success: true, message: 'Utilisateur débanni avec succès', user });
    } catch (err) {
        console.error('Unban User Error:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

