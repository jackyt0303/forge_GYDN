import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@forge/bridge';
import { validateTemplate } from '../utils/templateValidation';

export const useTemplate = (projectKey) => {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const fetchTemplates = useCallback(async () => {
    try {
      setIsLoading(true);
      const allTemplates = await invoke('getAllTemplate');
      setTemplates(allTemplates);
    } catch (error) {
      setError({
        message: "We couldn't retrieve your available templates. Please try again in a moment or contact your administrator if this issue continues.",
        operation: 'fetching all template'
      });
      setTemplates([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createTemplate = useCallback(async (templateData) => {
    try {
      setIsLoading(true);
      const { value, language, name } = templateData;

      if (!name) {
        throw new Error("Please enter a template name before saving. A descriptive name helps identify the template later.");
      }

      const validation = validateTemplate(value, language);
      if (!validation.isValid) {
        throw new Error(`${validation.message} Please correct the template format before saving.`);
      }

      const savedName = await invoke('saveValueWithGeneratedKey', {
        payload: {
          projectKey,
          value,
          dataType: language,
          name: name || 'Unnamed Template'
        }
      });

      await fetchTemplates();
      return { success: true, name: savedName };
    } catch (error) {
      setError({
        message: "Failed to save template. This might be due to network issues or permission problems. Please try again or contact your administrator if the problem persists.",
        operation: 'saving template'
      });
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  }, [projectKey, fetchTemplates]);

  const deleteTemplate = useCallback(async (key) => {
    try {
      setIsLoading(true);
      const templateName = await invoke('getTemplate', key);
      await invoke('deleteValue', { payload: { key } });
      return { success: true, deletedTemplateName: templateName};
    } catch (error) {
      setError({
        message: `Failed to delete template with key: ${key}. This could be due to network issues or the template may no longer exist. Please refresh the page and try again.`,
        operation: 'Delete Template'
      });
      return { success: false, error };
    } finally {
      await fetchTemplates();
      setIsLoading(false);
    }
  }, [fetchTemplates]);

  useEffect(() => {
    fetchTemplates();
  }, []);

  return {
    templates,
    isLoading,
    error,
    fetchTemplates,
    createTemplate,
    deleteTemplate
  };
};
