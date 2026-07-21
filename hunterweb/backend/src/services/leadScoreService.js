/**
 * Lead Score Algorithm
 * 
 * Calculates a score (0-100) for each lead based on opportunity criteria:
 * - Absence of website (higher score = no website)
 * - Competition in niche (more competition = higher opportunity)
 * - Company size (larger = higher opportunity)
 * - Social media activity (low activity = higher opportunity)
 * 
 * Scoring breakdown:
 * - No website: 40 points
 * - Company size: 30 points (large=30, medium=20, small=10)
 * - Social media presence: 20 points (inverse - less presence = more points)
 * - Niche competition: 10 points
 */

import logger from '../utils/logger.js';

// Niche competition levels (1-10, higher = more competition = more opportunity)
const NICHE_COMPETITION = {
  'Restaurantes y gastronomía': 9,
  'Talleres mecánicos y autopartes': 7,
  'Clínicas y consultorios médicos': 8,
  'Estudios jurídicos y notarías': 6,
  'Gimnasios y centros deportivos': 8,
  'Tiendas de ropa y calzado': 9,
  'Ferreterías y materiales de construcción': 6,
  'Peluquerías y centros de estética': 8,
  'Inmobiliarias y constructoras': 7,
  'Escuelas y centros educativos': 5,
};

// Default competition level for unknown niches
const DEFAULT_COMPETITION = 5;

/**
 * Calculate social media score (inverse - less presence = higher score)
 * @param {Object} socialMedia - Social media profiles object
 * @returns {number} Score from 0-20
 */
const calculateSocialMediaScore = (socialMedia) => {
  if (!socialMedia || Object.keys(socialMedia).length === 0) {
    return 20; // No social media = maximum points
  }

  const platforms = Object.keys(socialMedia);
  const platformCount = platforms.length;

  // Base score decreases with each platform
  let score = 20 - (platformCount * 5);

  // Check for activity indicators (if available in the data)
  platforms.forEach(platform => {
    const profile = socialMedia[platform];
    if (typeof profile === 'object' && profile.hasActivity === false) {
      score += 2; // Bonus for inactive accounts
    }
  });

  return Math.max(0, Math.min(20, score));
};

/**
 * Calculate company size score
 * @param {string} size - Company size ('small', 'medium', 'large')
 * @returns {number} Score from 0-30
 */
const calculateCompanySizeScore = (size) => {
  switch (size?.toLowerCase()) {
    case 'large':
      return 30;
    case 'medium':
      return 20;
    case 'small':
    default:
      return 10;
  }
};

/**
 * Calculate niche competition score
 * @param {string} niche - Business niche/category
 * @returns {number} Score from 0-10
 */
const calculateNicheCompetitionScore = (niche) => {
  if (!niche) {
    return DEFAULT_COMPETITION;
  }

  // Find matching niche (case-insensitive partial match)
  const matchedNiche = Object.keys(NICHE_COMPETITION).find(key => 
    key.toLowerCase().includes(niche.toLowerCase()) ||
    niche.toLowerCase().includes(key.toLowerCase())
  );

  const competitionLevel = matchedNiche 
    ? NICHE_COMPETITION[matchedNiche]
    : DEFAULT_COMPETITION;

  // Scale to 0-10 range
  return competitionLevel;
};

/**
 * Main lead score calculation function
 * @param {Object} lead - Lead object with all properties
 * @returns {Object} { score: number, factors: object }
 */
export const calculateLeadScore = (lead) => {
  try {
    let totalScore = 0;
    const factors = {};

    // 1. Website absence score (40 points max)
    const hasWebsite = lead.has_website || !!lead.website_url;
    const websiteScore = hasWebsite ? 0 : 40;
    totalScore += websiteScore;
    factors.website = {
      score: websiteScore,
      maxScore: 40,
      hasWebsite,
      reason: hasWebsite ? 'Has website' : 'No website detected',
    };

    // 2. Company size score (30 points max)
    const sizeScore = calculateCompanySizeScore(lead.company_size);
    totalScore += sizeScore;
    factors.companySize = {
      score: sizeScore,
      maxScore: 30,
      size: lead.company_size || 'small',
    };

    // 3. Social media score (20 points max)
    const socialScore = calculateSocialMediaScore(lead.social_media);
    totalScore += socialScore;
    factors.socialMedia = {
      score: socialScore,
      maxScore: 20,
      platformCount: lead.social_media ? Object.keys(lead.social_media).length : 0,
      reason: socialScore === 20 ? 'No social media presence' : 'Some social media presence',
    };

    // 4. Niche competition score (10 points max)
    const nicheScore = calculateNicheCompetitionScore(lead.niche);
    totalScore += nicheScore;
    factors.nicheCompetition = {
      score: nicheScore,
      maxScore: 10,
      niche: lead.niche || 'Unknown',
    };

    // Ensure score is within 0-100 range
    totalScore = Math.max(0, Math.min(100, totalScore));

    logger.debug('Lead score calculated', {
      leadId: lead.id,
      totalScore,
      factors,
    });

    return {
      score: totalScore,
      factors,
      breakdown: {
        website: `${websiteScore}/40`,
        companySize: `${sizeScore}/30`,
        socialMedia: `${socialScore}/20`,
        nicheCompetition: `${nicheScore}/10`,
      },
    };
  } catch (error) {
    logger.error('Error calculating lead score', { error: error.message, lead });
    // Return minimum score on error
    return {
      score: 0,
      factors: { error: error.message },
      breakdown: {},
    };
  }
};

/**
 * Batch calculate scores for multiple leads
 * @param {Array} leads - Array of lead objects
 * @returns {Array} Array of leads with updated scores
 */
export const calculateLeadScoresBatch = (leads) => {
  return leads.map(lead => {
    const result = calculateLeadScore(lead);
    return {
      ...lead,
      lead_score: result.score,
      score_factors: result.factors,
    };
  });
};

export default {
  calculateLeadScore,
  calculateLeadScoresBatch,
  NICHE_COMPETITION,
};
