/**
 * Google Maps Scraper Service
 * 
 * Scrapes business information from Google Maps using Playwright.
 * Identifies businesses without websites or with only social media presence.
 * 
 * Features:
 * - Search by niche and location
 * - Extract business details (name, address, phone, website, etc.)
 * - Detect missing websites
 * - Identify social media links
 * - Deduplication support
 */

import { chromium } from 'playwright';
import logger from '../utils/logger.js';
import config from '../config/index.js';

// Target niches for scraping
export const TARGET_NICHES = [
  'Restaurantes y gastronomía',
  'Talleres mecánicos y autopartes',
  'Clínicas y consultorios médicos',
  'Estudios jurídicos y notarías',
  'Gimnasios y centros deportivos',
  'Tiendas de ropa y calzado',
  'Ferreterías y materiales de construcción',
  'Peluquerías y centros de estética',
  'Inmobiliarias y constructoras',
  'Escuelas y centros educativos',
];

// Social media domain patterns
const SOCIAL_MEDIA_PATTERNS = {
  facebook: /facebook\.com/i,
  instagram: /instagram\.com/i,
  twitter: /twitter\.com|x\.com/i,
  linkedin: /linkedin\.com/i,
  tiktok: /tiktok\.com/i,
  youtube: /youtube\.com/i,
};

/**
 * Extract social media URLs from text/links
 * @param {string} text - Text content to search
 * @param {Array} links - Array of link URLs
 * @returns {Object} Object with social media profiles
 */
const extractSocialMedia = (text = '', links = []) => {
  const socialMedia = {};
  const combinedText = `${text} ${links.join(' ')}`;

  Object.entries(SOCIAL_MEDIA_PATTERNS).forEach(([platform, pattern]) => {
    const match = combinedText.match(pattern);
    if (match) {
      // Try to extract full URL
      const urlMatch = combinedText.match(new RegExp(`https?://[^\\s]*${pattern.source.replace(/\\/g, '\\\\')}[^\\s]*`, 'i'));
      socialMedia[platform] = urlMatch ? urlMatch[0] : true;
    }
  });

  return socialMedia;
};

/**
 * Normalize phone number
 * @param {string} phone - Raw phone number
 * @returns {string} Normalized phone number
 */
const normalizePhone = (phone) => {
  if (!phone) return '';
  // Remove all non-digit characters except +
  return phone.replace(/[^\d+]/g, '');
};

/**
 * Main Google Maps scraping function
 * @param {Object} options - Scraping options
 * @param {string} options.niche - Business niche/category
 * @param {string} options.location - Location to search
 * @param {number} options.maxResults - Maximum number of results
 * @returns {Array} Array of scraped business data
 */
export const scrapeGoogleMaps = async ({ niche, location, maxResults = 20 }) => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();
  const results = [];

  try {
    // Construct Google Maps search URL
    const searchQuery = encodeURIComponent(`${niche} en ${location}`);
    const url = `https://www.google.com/maps/search/${searchQuery}`;
    
    logger.info('Starting Google Maps scraping', { niche, location, url });

    await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: config.scraper.timeout,
    });

    // Wait for results to load
    await page.waitForSelector('[role="feed"]', { timeout: 10000 }).catch(() => {
      logger.warn('No results feed found, may need manual review');
    });

    // Scroll to load more results
    await page.evaluate(async () => {
      const feed = document.querySelector('[role="feed"]');
      if (feed) {
        for (let i = 0; i < 5; i++) {
          feed.scrollTop += 500;
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    });

    // Extract business cards
    const businessCards = await page.$$('[role="article"]');
    
    logger.info(`Found ${businessCards.length} business cards`);

    for (let i = 0; i < Math.min(businessCards.length, maxResults); i++) {
      try {
        const card = businessCards[i];
        
        // Extract business name
        const name = await card.$eval('.fontHeadlineSmall', el => el.textContent).catch(() => null);
        
        if (!name) continue;

        // Click on the card to open detailed view
        await card.click();
        await page.waitForTimeout(1000); // Wait for details panel

        // Extract detailed information
        const details = await page.evaluate(() => {
          const data = {
            name: '',
            address: '',
            phone: '',
            website: '',
            links: [],
            rating: '',
            reviews: '',
          };

          // Get name
          const nameEl = document.querySelector('h1.fontHeadlineLarge');
          if (nameEl) data.name = nameEl.textContent.trim();

          // Get address
          const addressBtn = document.querySelector('button[data-item-id="address"]');
          if (addressBtn) data.address = addressBtn.textContent.trim();

          // Get phone
          const phoneBtn = document.querySelector('button[data-item-id*="phone"]');
          if (phoneBtn) data.phone = phoneBtn.textContent.trim();

          // Get website and other links
          const linkButtons = document.querySelectorAll('a[href]:not([href^="#"])');
          linkButtons.forEach(btn => {
            const href = btn.href;
            if (href && !href.includes('maps.google.com')) {
              data.links.push(href);
              if (!data.website && !href.includes('facebook') && !href.includes('instagram')) {
                data.website = href;
              }
            }
          });

          // Get rating
          const ratingEl = document.querySelector('div.F7nice span[aria-hidden]');
          if (ratingEl) data.rating = ratingEl.textContent;

          // Get review count
          const reviewEl = document.querySelector('div.F7nice span:nth-child(2)');
          if (reviewEl) data.reviews = reviewEl.textContent;

          return data;
        });

        // Determine if website exists
        const hasWebsite = !!details.website && 
          !details.website.match(/facebook\.com|instagram\.com|linkedin\.com/i);

        // Extract social media
        const socialMedia = extractSocialMedia('', details.links);

        // Build result object
        const business = {
          name: details.name || name,
          address: details.address,
          phone: normalizePhone(details.phone),
          email: null, // Email typically not available on Google Maps
          niche,
          location,
          website_url: hasWebsite ? details.website : null,
          has_website: hasWebsite,
          social_media: socialMedia,
          google_maps_url: page.url(),
          source: 'google_maps',
          company_size: 'small', // Default, can be refined later
          rating: details.rating ? parseFloat(details.rating) : null,
          review_count: details.reviews ? parseInt(details.reviews.replace(/[^0-9]/g, '')) : null,
        };

        results.push(business);
        logger.debug('Scraped business', { name: business.name, hasWebsite });

        // Go back to results list
        const backButton = await page.$('button[aria-label="Atrás"], button[aria-label="Back"]');
        if (backButton) {
          await backButton.click();
          await page.waitForTimeout(500);
        }

      } catch (error) {
        logger.error('Error scraping individual business', { error: error.message, index: i });
        continue;
      }
    }

    logger.info('Google Maps scraping completed', { totalResults: results.length });

  } catch (error) {
    logger.error('Google Maps scraping failed', { error: error.message, niche, location });
    throw error;
  } finally {
    await browser.close();
  }

  return results;
};

/**
 * Check if a business already exists in database (deduplication)
 * @param {Object} db - Database connection
 * @param {Object} business - Business object
 * @returns {Promise<Object|null>} Existing lead or null
 */
export const checkDuplicate = async (db, business) => {
  try {
    // Check by phone first (most reliable)
    if (business.phone) {
      const result = await db.query(
        'SELECT id, name, updated_at FROM leads WHERE phone = $1 LIMIT 1',
        [business.phone]
      );
      if (result.rows.length > 0) {
        return result.rows[0];
      }
    }

    // Check by name and location
    if (business.name && business.location) {
      const result = await db.query(
        `SELECT id, name, updated_at FROM leads 
         WHERE LOWER(name) = LOWER($1) AND location = $2 
         LIMIT 1`,
        [business.name, business.location]
      );
      if (result.rows.length > 0) {
        return result.rows[0];
      }
    }

    return null;
  } catch (error) {
    logger.error('Error checking for duplicates', { error: error.message });
    return null;
  }
};

/**
 * Save or update lead in database
 * @param {Object} db - Database connection
 * @param {Object} business - Business object
 * @param {Object} existingLead - Existing lead if found
 * @returns {Promise<Object>} Saved/updated lead
 */
export const saveLead = async (db, business, existingLead = null) => {
  try {
    if (existingLead) {
      // Update existing lead
      const result = await db.query(
        `UPDATE leads SET
          address = COALESCE($1, address),
          phone = COALESCE($2, phone),
          website_url = COALESCE($3, website_url),
          has_website = COALESCE($4, has_website),
          social_media = COALESCE($5, social_media),
          google_maps_url = COALESCE($6, google_maps_url),
          last_scraped_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
        RETURNING *`,
        [
          business.address,
          business.phone,
          business.website_url,
          business.has_website,
          JSON.stringify(business.social_media),
          business.google_maps_url,
          existingLead.id,
        ]
      );
      
      logger.info('Updated existing lead', { id: existingLead.id, name: business.name });
      return result.rows[0];
    } else {
      // Insert new lead
      const { v4: uuidv4 } = await import('uuid');
      const id = uuidv4();
      
      const result = await db.query(
        `INSERT INTO leads (
          id, name, address, phone, email, niche, location, 
          company_size, website_url, has_website, social_media,
          google_maps_url, source, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *`,
        [
          id,
          business.name,
          business.address,
          business.phone,
          business.email,
          business.niche,
          business.location,
          business.company_size,
          business.website_url,
          business.has_website,
          JSON.stringify(business.social_media),
          business.google_maps_url,
          business.source,
        ]
      );
      
      logger.info('Created new lead', { id, name: business.name });
      return result.rows[0];
    }
  } catch (error) {
    logger.error('Error saving lead', { error: error.message, business });
    throw error;
  }
};

/**
 * Full scraping workflow with deduplication and scoring
 * @param {Object} db - Database connection
 * @param {Object} options - Scraping options
 * @returns {Promise<Array>} Array of saved leads
 */
export const scrapeAndSave = async (db, { niche, location, maxResults = 20 }) => {
  const scrapedData = await scrapeGoogleMaps({ niche, location, maxResults });
  const savedLeads = [];

  for (const business of scrapedData) {
    try {
      // Check for duplicates
      const existingLead = await checkDuplicate(db, business);
      
      // Save or update lead
      const savedLead = await saveLead(db, business, existingLead);
      savedLeads.push(savedLead);
    } catch (error) {
      logger.error('Error processing business', { error: error.message, business });
    }
  }

  return savedLeads;
};

export default {
  scrapeGoogleMaps,
  scrapeAndSave,
  checkDuplicate,
  saveLead,
  TARGET_NICHES,
};
