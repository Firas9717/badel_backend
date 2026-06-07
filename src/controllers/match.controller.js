const Offer = require('../models/Offer');
const User = require('../models/User');

function calcValueScore(a, b) {
  const v1 = a || 0;
  const v2 = b || 0;
  const maxV = Math.max(v1, v2, 1);
  const score = 20 * (1 - Math.abs(v1 - v2) / maxV);
  return Math.max(0, Math.round(score));
}

async function getMatchesForOffer(req, res) {
  try {
    const offer = await Offer.findById(req.params.offerId).populate('user', 'trustScore');
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
    if (offer.user._id.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Not authorized' });

    const filter = { status: 'active', expiresAt: { $gt: new Date() }, user: { $ne: req.user._id } };
    const potential = await Offer.find(filter).populate('user', 'firstName lastName profilePhoto trustScore badges location');

    const results = potential.map(other => {
      let typeMatch = 0;
      // offer -> other
      if (other.seekingType === 'open' || other.seekingType === offer.offerType || other.seekingType === 'both') typeMatch += 15;
      if (offer.seekingType === 'open' || offer.seekingType === other.offerType || offer.seekingType === 'both') typeMatch += 15;

      let categoryMatch = 0;
      if (offer.seekingCategories && offer.seekingCategories.includes(other.category)) categoryMatch += 10;
      if (other.seekingCategories && other.seekingCategories.includes(offer.category)) categoryMatch += 10;

      const valueScore = calcValueScore(offer.estimatedValue, other.estimatedValue);

      let locationMatch = 0;
      try {
        if (offer.location && other.location) {
          if (offer.location.governorate && other.location.governorate && offer.location.governorate === other.location.governorate) locationMatch += 10;
          if (offer.location.city && other.location.city && offer.location.city === other.location.city) locationMatch += 5;
        }
      } catch (e) {}

      let trustBonus = 7;
      if (other.user && typeof other.user.trustScore === 'number') trustBonus = Math.round(15 * other.user.trustScore / 100);

      let total = typeMatch + categoryMatch + valueScore + locationMatch + trustBonus;
      if (total > 100) total = 100;

      return { offer: other, matchScore: total, matchDetails: { typeMatch, categoryMatch, valueScore, locationMatch, trustBonus } };
    });

    results.sort((a,b) => b.matchScore - a.matchScore);
    const top = results.slice(0,20);
    return res.status(200).json({ success: true, count: top.length, matches: top });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

async function getMyMatches(req, res) {
  try {
    const myOffers = await Offer.find({ user: req.user._id, status: 'active', expiresAt: { $gt: new Date() } });
    if (!myOffers || myOffers.length === 0) return res.status(200).json({ success: true, message: 'You have no active offers', matches: [] });

    const results = [];
    for (const ofr of myOffers) {
      const potential = await Offer.find({ status: 'active', expiresAt: { $gt: new Date() }, user: { $ne: req.user._id } }).populate('user', 'trustScore firstName lastName profilePhoto badges location');
      const scored = potential.map(other => {
        let typeMatch = 0;
        if (other.seekingType === 'open' || other.seekingType === ofr.offerType || other.seekingType === 'both') typeMatch += 15;
        if (ofr.seekingType === 'open' || ofr.seekingType === other.offerType || ofr.seekingType === 'both') typeMatch += 15;
        let categoryMatch = 0;
        if (ofr.seekingCategories && ofr.seekingCategories.includes(other.category)) categoryMatch += 10;
        if (other.seekingCategories && other.seekingCategories.includes(ofr.category)) categoryMatch += 10;
        const valueScore = calcValueScore(ofr.estimatedValue, other.estimatedValue);
        let locationMatch = 0;
        if (ofr.location && other.location) {
          if (ofr.location.governorate === other.location.governorate) locationMatch += 10;
          if (ofr.location.city === other.location.city) locationMatch += 5;
        }
        let trustBonus = 7;
        if (other.user && typeof other.user.trustScore === 'number') trustBonus = Math.round(15 * other.user.trustScore / 100);
        let total = typeMatch + categoryMatch + valueScore + locationMatch + trustBonus;
        if (total > 100) total = 100;
        return { offer: other, matchScore: total, matchDetails: { typeMatch, categoryMatch, valueScore, locationMatch, trustBonus } };
      });
      scored.sort((a,b) => b.matchScore - a.matchScore);
      results.push({ userOffer: ofr, matches: scored.slice(0,10) });
    }

    return res.status(200).json({ success: true, count: results.length, matchGroups: results });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

async function getMutualMatches(req, res) {
  try {
    const myOffers = await Offer.find({ user: req.user._id, status: 'active', expiresAt: { $gt: new Date() } });
    const mutuals = [];
    for (const a of myOffers) {
      const potential = await Offer.find({ status: 'active', expiresAt: { $gt: new Date() }, user: { $ne: req.user._id } }).populate('user', 'trustScore location');
      for (const b of potential) {
        // forward score (a -> b)
        let fType = 0;
        if (b.seekingType === 'open' || b.seekingType === a.offerType || b.seekingType === 'both') fType += 15;
        if (a.seekingType === 'open' || a.seekingType === b.offerType || a.seekingType === 'both') fType += 15;
        let fCategory = 0;
        if (a.seekingCategories && a.seekingCategories.includes(b.category)) fCategory += 10;
        if (b.seekingCategories && b.seekingCategories.includes(a.category)) fCategory += 10;
        const fValue = calcValueScore(a.estimatedValue, b.estimatedValue);
        let fLocation = 0;
        if (a.location && b.location) {
          if (a.location.governorate === b.location.governorate) fLocation += 10;
          if (a.location.city === b.location.city) fLocation += 5;
        }
        let fTrust = 7;
        if (b.user && typeof b.user.trustScore === 'number') fTrust = Math.round(15 * b.user.trustScore / 100);
        let forwardScore = fType + fCategory + fValue + fLocation + fTrust;
        if (forwardScore > 100) forwardScore = 100;

        // reverse score (b -> a)
        let rType = 0;
        if (a.seekingType === 'open' || a.seekingType === b.offerType || a.seekingType === 'both') rType += 15;
        if (b.seekingType === 'open' || b.seekingType === a.offerType || b.seekingType === 'both') rType += 15;
        let rCategory = 0;
        if (b.seekingCategories && b.seekingCategories.includes(a.category)) rCategory += 10;
        if (a.seekingCategories && a.seekingCategories.includes(b.category)) rCategory += 10;
        const rValue = calcValueScore(b.estimatedValue, a.estimatedValue);
        let rLocation = 0;
        if (a.location && b.location) {
          if (b.location.governorate === a.location.governorate) rLocation += 10;
          if (b.location.city === a.location.city) rLocation += 5;
        }
        let rTrust = 7;
        if (a.user && typeof a.user.trustScore === 'number') rTrust = Math.round(15 * a.user.trustScore / 100);
        let reverseScore = rType + rCategory + rValue + rLocation + rTrust;
        if (reverseScore > 100) reverseScore = 100;

        if (forwardScore >= 40 && reverseScore >= 40) {
          const combined = (forwardScore + reverseScore) / 2;
          mutuals.push({ userOffer: a, otherOffer: b, forwardScore, reverseScore, combinedScore: combined });
        }
      }
    }
    mutuals.sort((a,b) => b.combinedScore - a.combinedScore);
    return res.status(200).json({ success: true, count: mutuals.length, mutualMatches: mutuals });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

module.exports = { getMatchesForOffer, getMyMatches, getMutualMatches };
