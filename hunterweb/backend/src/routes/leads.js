import { Router } from 'express';
import { query } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { calculateLeadScore } from '../services/leadScoreService.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * GET /api/leads
 * Get all leads with pagination, filtering, and sorting
 * 
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - niche: Filter by niche
 * - location: Filter by location
 * - has_website: Filter by website presence (true/false)
 * - status: Filter by status
 * - min_score: Minimum lead score
 * - max_score: Maximum lead score
 * - sort_by: Field to sort by (default: lead_score)
 * - order: Sort order (asc/desc, default: desc)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      niche,
      location,
      has_website,
      status,
      min_score,
      max_score,
      source,
      sort_by = 'lead_score',
      order = 'desc',
    } = req.query;

    // Validate pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    // Validate sort field
    const validSortFields = ['lead_score', 'name', 'created_at', 'updated_at', 'company_size'];
    const sortByField = validSortFields.includes(sort_by) ? sort_by : 'lead_score';
    const orderDir = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Build WHERE clause
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (niche) {
      conditions.push(`niche ILIKE $${paramIndex}`);
      params.push(`%${niche}%`);
      paramIndex++;
    }

    if (location) {
      conditions.push(`location ILIKE $${paramIndex}`);
      params.push(`%${location}%`);
      paramIndex++;
    }

    if (has_website !== undefined) {
      conditions.push(`has_website = $${paramIndex}`);
      params.push(has_website === 'true');
      paramIndex++;
    }

    if (status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (min_score !== undefined) {
      conditions.push(`lead_score >= $${paramIndex}`);
      params.push(parseInt(min_score));
      paramIndex++;
    }

    if (max_score !== undefined) {
      conditions.push(`lead_score <= $${paramIndex}`);
      params.push(parseInt(max_score));
      paramIndex++;
    }

    if (source) {
      conditions.push(`source = $${paramIndex}`);
      params.push(source);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM leads ${whereClause}`;
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const dataQuery = `
      SELECT 
        id, name, address, phone, email, niche, location,
        company_size, website_url, has_website, social_media,
        linkedin_url, google_maps_url, lead_score, status, source,
        created_at, updated_at, last_scraped_at
      FROM leads
      ${whereClause}
      ORDER BY ${sortByField} ${orderDir}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const dataParams = [...params, limitNum, offset];
    const dataResult = await query(dataQuery, dataParams);

    // Parse JSONB fields
    const leads = dataResult.rows.map(lead => ({
      ...lead,
      social_media: typeof lead.social_media === 'string' 
        ? JSON.parse(lead.social_media) 
        : lead.social_media,
    }));

    logger.debug('Leads retrieved', { 
      total, 
      page: pageNum, 
      limit: limitNum,
      filters: { niche, location, has_website, status },
    });

    res.json({
      success: true,
      data: {
        leads,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
          hasMore: offset + leads.length < total,
        },
      },
    });
  } catch (error) {
    logger.error('Error getting leads', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error retrieving leads',
    });
  }
});

/**
 * GET /api/leads/:id
 * Get single lead by ID
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT * FROM leads WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found',
      });
    }

    const lead = result.rows[0];
    lead.social_media = typeof lead.social_media === 'string' 
      ? JSON.parse(lead.social_media) 
      : lead.social_media;

    res.json({
      success: true,
      data: lead,
    });
  } catch (error) {
    logger.error('Error getting lead', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error retrieving lead',
    });
  }
});

/**
 * POST /api/leads
 * Create a new lead
 */
router.post('/', authenticate, authorize('admin', 'user'), async (req, res) => {
  try {
    const {
      name,
      address,
      phone,
      email,
      niche,
      location,
      company_size = 'small',
      website_url,
      linkedin_url,
      google_maps_url,
      social_media = {},
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required',
      });
    }

    // Calculate lead score
    const leadData = {
      name,
      address,
      phone,
      email,
      niche,
      location,
      company_size,
      website_url,
      has_website: !!website_url,
      social_media,
      linkedin_url,
      google_maps_url,
    };

    const scoreResult = calculateLeadScore(leadData);

    // Insert lead
    const { v4: uuidv4 } = await import('uuid');
    const id = uuidv4();

    const result = await query(
      `INSERT INTO leads (
        id, name, address, phone, email, niche, location,
        company_size, website_url, has_website, social_media,
        linkedin_url, google_maps_url, lead_score, source
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        id,
        name,
        address,
        phone,
        email,
        niche,
        location,
        company_size,
        website_url,
        !!website_url,
        JSON.stringify(social_media),
        linkedin_url,
        google_maps_url,
        scoreResult.score,
        'manual',
      ]
    );

    const lead = result.rows[0];
    lead.social_media = typeof lead.social_media === 'string' 
      ? JSON.parse(lead.social_media) 
      : lead.social_media;

    logger.info('Lead created', { id, name, score: scoreResult.score });

    res.status(201).json({
      success: true,
      data: lead,
    });
  } catch (error) {
    logger.error('Error creating lead', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error creating lead',
    });
  }
});

/**
 * PUT /api/leads/:id
 * Update an existing lead
 */
router.put('/:id', authenticate, authorize('admin', 'user'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      address,
      phone,
      email,
      niche,
      location,
      company_size,
      website_url,
      linkedin_url,
      google_maps_url,
      social_media,
      status,
    } = req.body;

    // Check if lead exists
    const existing = await query('SELECT id FROM leads WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found',
      });
    }

    // Recalculate score if relevant fields changed
    let lead_score = null;
    if (website_url !== undefined || company_size !== undefined || 
        social_media !== undefined || niche !== undefined) {
      const leadData = {
        website_url: website_url,
        company_size: company_size,
        social_media: social_media,
        niche: niche,
      };
      const scoreResult = calculateLeadScore(leadData);
      lead_score = scoreResult.score;
    }

    // Build update query dynamically
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      params.push(name);
      paramIndex++;
    }
    if (address !== undefined) {
      updates.push(`address = $${paramIndex}`);
      params.push(address);
      paramIndex++;
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex}`);
      params.push(phone);
      paramIndex++;
    }
    if (email !== undefined) {
      updates.push(`email = $${paramIndex}`);
      params.push(email);
      paramIndex++;
    }
    if (niche !== undefined) {
      updates.push(`niche = $${paramIndex}`);
      params.push(niche);
      paramIndex++;
    }
    if (location !== undefined) {
      updates.push(`location = $${paramIndex}`);
      params.push(location);
      paramIndex++;
    }
    if (company_size !== undefined) {
      updates.push(`company_size = $${paramIndex}`);
      params.push(company_size);
      paramIndex++;
    }
    if (website_url !== undefined) {
      updates.push(`website_url = $${paramIndex}, has_website = $${paramIndex + 1}`);
      params.push(website_url, !!website_url);
      paramIndex += 2;
    }
    if (social_media !== undefined) {
      updates.push(`social_media = $${paramIndex}`);
      params.push(JSON.stringify(social_media));
      paramIndex++;
    }
    if (linkedin_url !== undefined) {
      updates.push(`linkedin_url = $${paramIndex}`);
      params.push(linkedin_url);
      paramIndex++;
    }
    if (google_maps_url !== undefined) {
      updates.push(`google_maps_url = $${paramIndex}`);
      params.push(google_maps_url);
      paramIndex++;
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }
    if (lead_score !== null) {
      updates.push(`lead_score = $${paramIndex}`);
      params.push(lead_score);
      paramIndex++;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const result = await query(
      `UPDATE leads SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    const lead = result.rows[0];
    lead.social_media = typeof lead.social_media === 'string' 
      ? JSON.parse(lead.social_media) 
      : lead.social_media;

    logger.info('Lead updated', { id, name: lead.name });

    res.json({
      success: true,
      data: lead,
    });
  } catch (error) {
    logger.error('Error updating lead', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error updating lead',
    });
  }
});

/**
 * DELETE /api/leads/:id
 * Delete a lead
 */
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM leads WHERE id = $1 RETURNING id, name',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found',
      });
    }

    logger.info('Lead deleted', { id, name: result.rows[0].name });

    res.json({
      success: true,
      message: 'Lead deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting lead', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error deleting lead',
    });
  }
});

/**
 * POST /api/leads/recalculate-scores
 * Recalculate scores for all leads (admin only)
 */
router.post('/recalculate-scores', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await query('SELECT * FROM leads');
    const leads = result.rows;

    let updated = 0;
    for (const lead of leads) {
      const scoreResult = calculateLeadScore({
        ...lead,
        social_media: typeof lead.social_media === 'string' 
          ? JSON.parse(lead.social_media) 
          : lead.social_media,
      });

      if (scoreResult.score !== lead.lead_score) {
        await query(
          'UPDATE leads SET lead_score = $1 WHERE id = $2',
          [scoreResult.score, lead.id]
        );
        updated++;
      }
    }

    logger.info('Scores recalculated', { total: leads.length, updated });

    res.json({
      success: true,
      data: {
        total: leads.length,
        updated,
      },
    });
  } catch (error) {
    logger.error('Error recalculating scores', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error recalculating scores',
    });
  }
});

export default router;
