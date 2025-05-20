/**
 * Utility functions for mapping custom fields to their values
 */

/**
 * Checks if a value is empty (null, undefined, empty string, empty array or empty object)
 * @param {*} value - The value to check
 * @returns {boolean} - True if the value is empty, false otherwise
 */
export const isEmpty = (value) => {
    if (value === "" || value === null || value === undefined) return true;
    if (Array.isArray(value) && value.length === 0) return true;
    if (typeof value === 'object' && Object.keys(value).length === 0) return true;
    return false;
};

/**
 * Maps custom fields to their corresponding values in the issue fields
 * @param {Array} customFields - Array of custom field names to map
 * @param {Object} issueFields - Object containing issue field values
 * @returns {Object} - Object containing mapped fields and missing fields
 */
export const mapCustomFieldsToValues = async (customFields, issueFields) => {
    let mappedFields = {};
    try {
        // Find missing fields
        let missingFieldsHere = [];
        
        // Map customFields to their corresponding values in fieldValues
        mappedFields = customFields.reduce((acc, field) => {
            if (!issueFields[field]) {
                acc[field] = 'missing value'; 
                missingFieldsHere.push(field);
            } else if (issueFields[field] && isEmpty(issueFields[field])) {
                acc[field] = 'empty value';
                missingFieldsHere.push(field);
            } else {
                acc[field] = issueFields[field];
            }
            return acc;
        }, {});

        // add description field to the mappedFields if it exists in issueFields
        if (issueFields.description && isEmpty(mappedFields.description)) {
            mappedFields.description = issueFields.description;
        }
        
        return {"mappedFields": mappedFields, "missingFields": missingFieldsHere}; 
    } catch (error) {
        console.error('Error during field mapping:', error.message);
        throw error; // Re-throw to properly signal failure
    } 
};

/**
 * Extracts custom fields from template content
 * @param {string} templateContent - The template content to analyze
 * @returns {Array} - Array of extracted field names
 */
export const fetchCustomField = async (templateContent) => {
    try {
        const matches = [...templateContent.matchAll(/\$\{([^}]+)\}/g)].map((m) => m[1]);
        return([...new Set(matches)]);
    } catch (error) {
        console.error('[IP]Error fetching custom fields:', error);
        throw new Error("Problem analyzing the template fields. The template might be incorrectly formatted.");
    }
};
