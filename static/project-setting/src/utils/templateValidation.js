/**
 * Validates a template string in either JSON or XML format
 * 
 * @param {string} value - The template string to validate
 * @param {string} language - The template format, either 'json' or 'xml'
 * @returns {Object} Validation result object
 * @returns {boolean} .isValid - Whether the template is valid
 * @returns {string} [.message] - Error message if validation fails
 * 
 * @example
 * // Validate JSON template
 * validateTemplate('{"key": "value"}', 'json')
 * // Returns: { isValid: true }
 * 
 * // Validate invalid XML
 * validateTemplate('<invalid>', 'xml') 
 * // Returns: { isValid: false, message: '❌ Invalid XML format...' }
 */
export const validateTemplate = (value, language) => {
    if (!language || language === 'json') {
      try {
        JSON.parse(value);
        return { isValid: true };
      } catch (err) {
        return { isValid: false, message: '❌ Invalid JSON format. Please fix errors.' };
      }
    }
  
    if (!language || language === 'xml') {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(value, 'application/xml');
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        return { isValid: false, message: `❌ Invalid XML format. ${parserError.textContent}` };
      }
      return { isValid: true };
    }
  
    return { isValid: false, message: '❌ Unsupported file format. Use JSON or XML.' };
  };