import React, { useState, useEffect, useMemo } from 'react';
import { invoke } from '@forge/bridge';

import './ProjectSetting.css';

import { useAppContext } from '../Context';
import { useTemplate } from '../hooks/usetemplate';
import { useTemplateActions } from '../hooks/useTemplateActions';

import { extractFieldsFromTemplate } from '../utils/fieldExtractor';

import Loader from '../components/Loader';
import ModalDialog from '../components/ModalDialog';
import TemplateEditor from '../components/TemplateEditor';
import TableList from '../components/TableList';

import { Inline, Text } from '@atlaskit/primitives';
import EditIcon from '@atlaskit/icon/core/edit';
import DeleteIcon from '@atlaskit/icon/core/delete';
import Tabs, { Tab, TabList } from '@atlaskit/tabs';


function ProjectSetting() {
  const context = useAppContext();
  
  const [customFields, setCustomFields] = useState([]);
  const [projectField, setprojectField] = useState({});
  const [templateCode, setTemplateCode] = useState('{\n    "Instruction": "${summary}"\n}');
  const [language, setLanguage] = useState('json');
  const [infoPanel, setInfoPanel] = useState('templates'); // either 'templates' or 'fields' //tabs 
  const [templateName, setTemplateName] = useState('');
  const [isLoading, setIsLoading] = useState(true); // New loading state

  const [modalState, setModalState] = useState({
    message: '',           // Regular message
    alertMessage: '',      // Confirmation message
    alertAction: null,     // Action to perform on confirmation
    buttonAppearance: 'subtle',
    titleAppearance: 'warning'
  });
  const { templates, 
          isLoading: templatesLoading, 
          error: templateError, 
          fetchTemplates,
          createTemplate, 
          deleteTemplate } = useTemplate(context.extension.project.key); // add fetchtemplate at the useeffect at the mainfile

  const showAlert = (message, action) => {
    setModalState(prevState=>({
      ...prevState,
      alertMessage: message,
      alertAction: action
    }))
  };

  const handleConfirm = async () => {
    if (modalState.alertAction) await modalState.alertAction();
    setModalState(prevState=>({
      ...prevState,
      alertMessage: '',
      alertAction: null,
      buttonAppearance:'subtle',
      titleAppearance:'warning'
    }))
  };

  const handleCancel = () => {
    setModalState({
      message: '',
      alertMessage: '',
      alertAction: null,
      buttonAppearance: 'subtle',
      titleAppearance: 'warning'
    });
    setInfoPanel('templates'); // Reset to default tab
  };

  const setMessage = (message) => {
    setModalState(prevState => ({
      ...prevState,
      message
    }));
  };

  const setButtonAppearance = (appearance) => {
    setModalState(prevState => ({
      ...prevState,
      buttonAppearance: appearance
    }));
  };
  
  const setTitleAppearance = (appearance) => {
    setModalState(prevState => ({
      ...prevState,
      titleAppearance: appearance
    }));
  };

  const { handleSubmit, handleFileUpload, handleDelete } = useTemplateActions({
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
  });

  useEffect(() => {
    if (templateError) {
      handleError(
        null,
        templateError.message,
        templateError.operation
      );
    }
  }, [templateError]);

  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true);
        await fetchprojectField();
      } catch (error) {
        handleError(
          error,
          "Unable to load project data. Please try refreshing the page. If the problem persists, check your network connection or contact support.",
          'Initialization'
        );
      } finally {
        setIsLoading(false);
      }
    };
    initializeData();
  }, []);

  useEffect(() => {
    fetchCustomField();
  }, [templateCode]); 

  const fetchCustomField = async () => {
    try {
      setCustomFields(extractFieldsFromTemplate(templateCode))
    } catch (error) {
      handleError(
        error,
        "Problem analyzing the template fields. The template might be incorrectly formatted. Please check the template format or try a different one.",
        'custom field extraction'
      );
      setCustomFields([]);
    }
  };

  const fetchprojectField = async () => {
    try {
      const fieldRef = await invoke('getFieldValuesRef', { payload: { pkey: context.extension.project.key } });
      setprojectField(fieldRef); 
      return fieldRef;
    } catch (error) {
      handleError(
        error,
        "Could not retrieve project field references. Some field validations might not work correctly. Try refreshing the page, or proceed with caution.",
        'fetching field value references'
      );
      setprojectField({}); // Fallback to empty object
      return {};
    }
  };

  const handleEditTemplateCode = async (value) => {
    setButtonAppearance('primary');
    showAlert('Are you sure you want to edit this template?', () => {
      try {
        setTemplateCode(value.template);
        setLanguage(value.datatype);
      } catch (error) {
        handleError(
          error,
          "Failed to load the template for editing. The template might be corrupted. Try selecting a different template.",
          "Edit templateCode"
        );
      }
    });
  };

  const handleError = (error, errorMessage, operation = '') => {
    const prefix = '[ProjectSetting]';
    console.error(`${prefix} Error ${operation ? `during ${operation}` : ''}:`, error);
    setMessage(errorMessage);
  };

  const handleTabKey = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.target;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const updatedTemplateCode = 
        templateCode.substring(0, start) + '    ' + templateCode.substring(end);
      
      setTemplateCode(updatedTemplateCode);

      // Delay updating caret position until after DOM update
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4;
      }, 0);
    }
  }

  const templateData = useMemo(() => {
    return templates.map(({key, value}) => ({
      key,
      name: value.name,
      value
    }));
  }, [templates]);

  const fieldData = useMemo(() => {
    return customFields.map(field => ({
      field,
      availability: projectField[field] ? 'Available' : 'Not Found'
    }));
  }, [customFields,projectField]);

  const projectFieldData = useMemo(() => 
    Object.entries(projectField).map(([field, value]) => ({
      field,
      name: value ? value : 'Not Found'
    })), [projectField]);

  if (isLoading || templatesLoading) {
    return <Loader />;
  }
  
  return (
    <div className="project-setting-container">
      {(!!modalState.alertMessage || !!modalState.message) && 
        <ModalDialog 
          message={modalState.alertMessage || modalState.message}
          handleCancel={handleCancel}
          handleConfirm={!!modalState.alertMessage? handleConfirm : null}
          titleAppearance={modalState.titleAppearance}
          buttonAppearance={modalState.buttonAppearance}
        />}
      
      <Inline space='space.200' grow='fill'>
      <TemplateEditor
          templateCode={templateCode}
          setTemplateCode={setTemplateCode} 
          templateName={templateName}
          setTemplateName={setTemplateName}
          language={language}
          handleSubmit={handleSubmit}
          handleFileUpload={handleFileUpload}
          handleTabKey={handleTabKey}
        />

        <div className="info-panel">
          <Tabs onChange={(index) => setInfoPanel(index === 0?'templates':'fields')} id="default">
            <TabList>
              <Tab>Templates</Tab>
              <Tab>Fields</Tab>
            </TabList>
          </Tabs>

          {infoPanel === 'templates' ? (
            <div>
              <TableList 
                data={templateData}
                caption="Available Templates"
                columns={[
                  {
                    key: 'name',
                    header: 'Template',
                    width: 70,
                    isSortable: true
                  },
                  {
                    key: 'actions',
                    header: 'Actions',
                    width: 30
                  }
                ]}
                actions={[
                  {
                    icon: EditIcon,
                    label: 'Edit',
                    onClick: (item) => handleEditTemplateCode(item.value)
                  },
                  {
                    icon: DeleteIcon,
                    label: 'Delete',
                    onClick: (item) => handleDelete(item.key)
                  }
                ]}
                rowsPerPage={10}
                isLoading={isLoading}
                emptyMessage="No templates found"
                idField="key"
              />
            </div>
          ) : (
            <div>
              <TableList 
                data={fieldData}
                caption="Detected Fields"
                columns={[
                  {
                    key: 'field',
                    header: 'Field ID',
                    width: 60,
                    isSortable: true
                  },
                  {
                    key: 'availability',
                    header: 'Availability',
                    width: 40
                  }
                ]}
                rowsPerPage={5}
                isLoading={isLoading}
                emptyMessage="No fields found"
              />

              <TableList 
                data={projectFieldData}
                caption="Project Fields"
                columns={[
                  {
                    key: 'field',
                    header: 'Field ID',
                    isSortable: true
                  },
                  {
                    key: 'name',
                    header: 'Name',
                    isSortable: true
                  }
                ]}
                rowsPerPage={8}
                isLoading={isLoading}
                emptyMessage="No fields found"
              />
            </div>
          )}
        </div>
      </Inline>
    </div>
  );
}

export default ProjectSetting;
