/**
 * Schema Utility Functions
 * Helper functions for schema search and value formatting
 */

/**
 * Normalize a value for case-insensitive search
 */
export const normalizeSearchValue = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value.toLowerCase();
    if (typeof value === 'number' || typeof value === 'boolean') return String(value).toLowerCase();
    try {
        return JSON.stringify(value).toLowerCase();
    } catch (error) {
        return '';
    }
};

/**
 * Escape special regex characters in a string
 */
export const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Format a default column value for display
 */
export const formatDefaultValue = (value) => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'object') {
        try {
            return JSON.stringify(value);
        } catch (error) {
            return '[object]';
        }
    }
    return String(value);
};

/**
 * Format a query result value for display
 */
export const formatResultValue = (value) => {
    if (value === null || value === undefined) {
        return '—';
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (typeof value === 'object') {
        try {
            return JSON.stringify(value);
        } catch (error) {
            return '[object]';
        }
    }
    return String(value);
};
