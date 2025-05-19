import { useCallback } from 'react';
import { validateTemplate } from '../utils/templateValidation';

export const useTemplateActions = ({
  templateCode,
  templateName,
  language,
  createTemplate,
  setMessage,
  setButtonAppearance,
  setTitleAppearance,
  showAlert,
  setIsLoading,
  deleteTemplate,
  setTemplateCode, 
  setLanguage
}) => {

  const handleSubmit = useCallback(async () => {
    setButtonAppearance('primary');
    
    const validateAndSave = async () => {
      if (!templateName) {
        setMessage("Please enter a template name before saving. A descriptive name helps identify the template later.");
        return;
      }

      try {
        setIsLoading(true);
        const result = await createTemplate({
          value: templateCode,
          language,
          name: templateName
        });

        if (result.success) {
            setMessage(`✅ Template saved successfully with name: ${result.name}`);
        }
      }  finally {
        setIsLoading(false);
      }
    };

    showAlert('Are you sure you want to save this template?', validateAndSave);
  }, [templateName, templateCode, language, createTemplate, setMessage, setButtonAppearance, showAlert, setIsLoading]);

  const handleFileUpload = useCallback(async (e) => {
    // no try catch, as the error are all handled in the usetemplate hook
    const file = e.target.files[0];
    
    if (!file) {
    setMessage("No file was selected. Please choose a JSON or XML file to upload.");
    return;
    }
    
    if (!['json', 'xml'].includes(file.name.split('.').pop().toLowerCase())) {
    setMessage("Unsupported file type. Please upload only JSON or XML files. Other formats are not compatible with this tool.");
    return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
    const rawContent = event.target.result;
    const fileType = file.name.split('.').pop().toLowerCase();
    const validationResult = validateTemplate(rawContent, fileType); 
    
    if (!validationResult.isValid) {
        setMessage(`${validationResult.message} Please fix the errors in your file before uploading again.`);
        return;
    }
    
    setTemplateCode(rawContent);
    setLanguage(fileType === 'xml' ? 'xml' : 'json');
    };
    
    reader.readAsText(file);
  }, [setMessage, setTemplateCode, setLanguage]);

  const handleDelete = useCallback(async (key) => {
    setButtonAppearance('danger');
    setTitleAppearance('danger');
    
    showAlert(`Are you sure you want to delete the template with key: ${key}?`, async () => {
      try {
        setIsLoading(true);
        const response = await deleteTemplate(key);

        if (response.success) {
          setMessage(`✅ Template: ${response.deletedTemplateName} deleted successfully.`);
        } // no need to handle error here as it is already handled by the "deleteTemplate()" function in usetemplate.jsx

      } finally {
        setIsLoading(false);
      }
    });
  }, [templateName, setIsLoading, setMessage, setButtonAppearance, setTitleAppearance, deleteTemplate, showAlert]);

  return {
    handleSubmit,
    handleFileUpload,
    handleDelete
  };
}; 