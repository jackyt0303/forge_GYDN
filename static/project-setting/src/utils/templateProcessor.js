/**
 * Utility functions for template manipulation and regex operations
 */

/**
 * Maps field values to template placeholders using regex
 * @param {string} templateContent - The template content with placeholders
 * @param {Object} mappedFields - Object containing field names and their values
 * @returns {string} - Template with placeholders replaced by values
 */
export const regexMapping = (templateContent, mappedFields) => {
    try {
        if (!templateContent) {
            throw new Error('Template content is empty or undefined');
        }
        
        if (!mappedFields || typeof mappedFields !== 'object') {
            throw new Error('Mapped fields are not provided or not in the correct format');
        }
        
        // Replace the template fields with the mapped values
        let finalTemplate = templateContent;

        // Use the same pattern as in fetchCustomField
        for (const [field, value] of Object.entries(mappedFields)) {
            
            // Escape special regex characters : " . * + ? ^ $ { } ( ) | [ ] \ " to ensure misinterpretation
            const escapedField = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the matched substring, '\\' means to escape \ using a single \
            
            // Use a literal regex pattern with escaping
            const regex = new RegExp(`\\$\\{${escapedField}\\}`, 'g');
            
            // Replace all occurrences of the placeholder with the actual value
            finalTemplate = finalTemplate.replace(regex, value || '');
        }
        return finalTemplate;
    } catch (error) {
        console.error('Error modifying template:', error);
        throw new Error('Failed to map field values to the template. This might be due to unexpected characters in the field values.');
    }
};

/**
 * Generates a download for the completed template
 * @param {string} completedTemplate - The processed template content
 * @param {string} templateLanguage - The template language (JSON, XML, etc.)
 * @param {string} templateName - The name of the template
 * @returns {void}
 */
export const downloadTemplate = (completedTemplate, templateLanguage, templateName) => {
    try {
        if (!completedTemplate || !templateLanguage) {
            throw new Error("Template content or language is missing.");
        }

        // Decide MIME type based on file extension
        let mimeType = "text/plain";
        let fileExtension = "txt";

        if (templateLanguage.toLowerCase() === "json") {
            mimeType = "application/json";
            fileExtension = "json";
        } else if (templateLanguage.toLowerCase() === "xml") {
            mimeType = "application/xml";
            fileExtension = "xml";
        }

        const blob = new Blob([completedTemplate], { type: mimeType });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `${templateName}.${fileExtension}`;
        a.click();
        URL.revokeObjectURL(url);
        
        return true;
    } catch (error) {
        console.error("Error downloading the template:", error);
        throw error;
    }
};
