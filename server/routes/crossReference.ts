import { Router } from 'express';
import { getDbConnection } from '../db.js';
import {
    getRelationalTrackingData,
    getRelationalSolpedData,
    getRelationalVendorData,
    type EnrichedTransaction, type TrackingMetrics
} from '../services/crossReferenceEngineRelational.js';
import { type SolpedRow, type VendorSummary } from '../services/crossReferenceEngine.js';
import { type BudgetExecutionSummary } from '../services/budgetExecutionEngine.js';
import { calculateBudgetExecutionRelational } from '../services/budgetExecutionEngineRelational.js';

const router = Router();

// ─── In-Memory Cache ────────────────────────────────────────────────

interface CachedData {
    tracking: { transactions: EnrichedTransaction[]; metrics: TrackingMetrics } | null;
    solpeds: SolpedRow[] | null;
    vendors: VendorSummary[] | null;
    budgetExecution: Map<string, BudgetExecutionSummary>; // keyed by "year-mgmt-ceco"
    timestamp: number;
}

const cache: CachedData = {
    tracking: null,
    solpeds: null,
    vendors: null,
    budgetExecution: new Map(),
    timestamp: 0
};

/** Invalidate entire cache — called when SAP files are uploaded or deleted */
export function invalidateCrossReferenceCache() {
    cache.tracking = null;
    cache.solpeds = null;
    cache.vendors = null;
    cache.budgetExecution.clear();
    cache.timestamp = 0;
    console.log('[Cache] Cross-reference cache invalidated');
}

/** Also invalidate budget cache when budgets change */
export function invalidateBudgetCache() {
    cache.budgetExecution.clear();
    console.log('[Cache] Budget execution cache invalidated');
}

/** Pre-warm: compute all views at server startup */
export async function prewarmCache() {
    try {
        console.log('[Cache] Pre-warming SQL-based cache...');

        // Compute tracking data
        console.time('[Cache] prewarm tracking');
        cache.tracking = await getRelationalTrackingData();
        console.log(`[Cache] Tracking pre-warmer: ${cache.tracking.transactions.length} items found.`);
        console.timeEnd('[Cache] prewarm tracking');

        // Compute solpeds
        console.time('[Cache] prewarm solpeds');
        cache.solpeds = await getRelationalSolpedData();
        console.log(`[Cache] Solpeds pre-warmer: ${cache.solpeds.length} items found.`);
        console.timeEnd('[Cache] prewarm solpeds');

        // Compute vendors
        console.time('[Cache] prewarm vendors');
        cache.vendors = await getRelationalVendorData();
        console.log(`[Cache] Vendors pre-warmer: ${cache.vendors.length} items found.`);
        console.timeEnd('[Cache] prewarm vendors');

        console.log('[Cache] Pre-warm complete ✓');
    } catch (error) {
        console.error('[Cache] Pre-warm failed:', error);
    }
}

// GET /api/sap/cross-reference/tracking
router.get('/tracking', async (req, res) => {
    try {
        if (cache.tracking) {
            console.log('[Cache] Tracking HIT');
            return res.json(cache.tracking);
        }

        console.log('[Cache] Tracking MISS — computing with SQL...');
        console.time('[SQL] getRelationalTrackingData');
        cache.tracking = await getRelationalTrackingData();
        console.timeEnd('[SQL] getRelationalTrackingData');

        res.json(cache.tracking);
    } catch (error) {
        console.error('Error building tracking data:', error);
        res.status(500).json({ error: 'Error processing tracking data' });
    }
});

// GET /api/sap/cross-reference/solpeds
router.get('/solpeds', async (req, res) => {
    try {
        if (cache.solpeds) {
            console.log('[Cache] Solpeds HIT');
            return res.json(cache.solpeds);
        }

        console.log('[Cache] Solpeds MISS — computing with SQL...');

        console.time('[SQL] getRelationalSolpedData');
        cache.solpeds = await getRelationalSolpedData();
        console.timeEnd('[SQL] getRelationalSolpedData');

        res.json(cache.solpeds);
    } catch (error) {
        console.error('Error building solped data:', error);
        res.status(500).json({ error: 'Error processing solped data' });
    }
});

// GET /api/sap/cross-reference/vendors
router.get('/vendors', async (req, res) => {
    try {
        if (cache.vendors) {
            console.log('[Cache] Vendors HIT');
            return res.json(cache.vendors);
        }

        console.log('[Cache] Vendors MISS — computing with SQL...');

        console.time('[SQL] getRelationalVendorData');
        cache.vendors = await getRelationalVendorData();
        console.timeEnd('[SQL] getRelationalVendorData');

        res.json(cache.vendors);
    } catch (error) {
        console.error('Error building vendor data:', error);
        res.status(500).json({ error: 'Error processing vendor data' });
    }
});

// POST /api/sap/cross-reference/budget-execution
// Uses POST because we need to send exchange rates in the body
router.post('/budget-execution', async (req, res) => {
    try {
        const { year, management_id, cost_center_id, exchange_rates } = req.body;

        if (!year || !management_id) {
            return res.status(400).json({ error: 'year and management_id are required' });
        }

        const cecoId = cost_center_id || 'all';
        const cacheKey = `${year}-${management_id}-${cecoId}`;

        // Check cache
        if (cache.budgetExecution.has(cacheKey)) {
            console.log(`[Cache] Budget execution HIT: ${cacheKey}`);
            return res.json(cache.budgetExecution.get(cacheKey));
        }

        console.log(`[Cache] Budget execution MISS: ${cacheKey} — computing with SQL...`);

        console.time(`[SQL] calculateBudgetExecutionRelational ${cacheKey}`);
        const result = await calculateBudgetExecutionRelational(
            Number(year),
            management_id,
            cecoId,
            exchange_rates || []
        );
        console.timeEnd(`[SQL] calculateBudgetExecutionRelational ${cacheKey}`);

        cache.budgetExecution.set(cacheKey, result);
        res.json(result);
    } catch (error) {
        console.error('Error calculating budget execution:', error);
        res.status(500).json({ error: 'Error calculating budget execution' });
    }
});

export const crossReferenceRouter = router;
