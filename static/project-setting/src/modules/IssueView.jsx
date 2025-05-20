import React, { useState, useEffect } from "react";
import { useAppContext } from '../Context';
import Loader from "../components/Loader";
import ModalDialog from "../components/ModalDialog";
import TableList from "../components/TableList";
import VerifyTemplate from "../components/VerifyTemplate";
import { invoke } from '@forge/bridge';
import { useTemplate } from '../hooks/usetemplate';
import { isEmpty, mapCustomFieldsToValues, fetchCustomField } from '../utils/fieldMapper';
import { regexMapping, downloadTemplate } from '../utils/templateProcessor';

import AddIcon from '@atlaskit/icon/core/add';
import Button from '@atlaskit/button/new';
import { Stack, Text } from '@atlaskit/primitives';
import './IssueView.css';

function IssueView(){
    const context = useAppContext();
    const { templates, isLoading: templatesLoading, error: templatesError} = useTemplate();

    const [issueKey,setIssueKey] = useState(context.extension.issue.key);
    const [issueFields, setIssueFields] = useState([]); // All issue fields values 
    const [missingFields, setMissingFields] = useState([]); // Missing fields in the template
    const [isVerifying, setIsVerifying] = useState(false);

    const [templateName, setTemplateName] = useState(''); // Template name
    const [templateLanguage, setTemplateLanguage] = useState(''); // Template language, JSON or XML
    const [completedTemplate, setCompletedTemplate] = useState(''); 

    // Updated modal state management similar to ProjectSetting.jsx
    const [modalState, setModalState] = useState({
        message: '',           // Regular message
        alertMessage: '',      // Confirmation message
        alertAction: null,     // Action to perform on confirmation
        buttonAppearance: 'primary',
        titleAppearance: 'warning'
    });
    
    const [missingFieldOperationMessage, setMissingFieldOperationMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Helper functions for modal state management
    const showAlert = (message, action) => {
        setModalState(prevState => ({
            ...prevState,
            alertMessage: message,
            alertAction: action
        }));
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

    // Adding handleError function similar to ProjectSetting.jsx
    const handleError = (error, errorMessage, operation = '') => {
        const prefix = '[IssueView]';
        console.error(`${prefix} Error ${operation ? `during ${operation}` : ''}:`, error);
        setMessage(errorMessage);
        setTitleAppearance('danger');
    };    
    
    useEffect(() => {
        const initializeData = async () => {
            try {
                setIsLoading(true);
                console.log('Running initialization...');
                await fetchIssueFields().then((issueData) => {
                    setIssueFields(issueData);
                });

            } catch(error) {
                handleError(
                    error,
                    "Unable to load templates and issue data. Please try refreshing the page. If the problem persists, check your network connection or contact support.",
                    'Initialization'
                );
            } finally {
                setIsLoading(false);
            } 
        };
        initializeData();
    },[issueKey]);

    const cleanUp = () => {
        setModalState({
            message: '',           // Regular message
            alertMessage: '',      // Confirmation message
            alertAction: null,     // Action to perform on confirmation
            buttonAppearance: 'primary',
            titleAppearance: 'warning'
        });
        setIsVerifying(false);
        setMissingFields([]);
        setCompletedTemplate("");
        setTemplateName('');
        setTemplateLanguage('');
        setMissingFieldOperationMessage("");
    };    const fetchIssueFields = async () => {
        try {
            const issueData = await invoke("getIssueFields",{payload:{issueKey: issueKey}});
            return issueData;
        } catch (error) {
            handleError(
                error,
                "Unable to load issue data. This might be due to missing permissions or a network issue. Please refresh the page or contact support.",
                'fetching issue fields'
            );
            return {};
        }
    };

    const handleCancel = () => {
        cleanUp();
    }    
    
    const handleConfirm = async () => {
        try {
            setIsLoading(true);
            if (modalState.alertAction) await modalState.alertAction();
        } catch (error) {
            handleError(
                error,
                "There was an error while performing this action. Please try again or contact support.",
                'confirmation action'
            );        } finally {
            setIsLoading(false);
            setModalState(prevState => ({
                ...prevState,
                alertAction: null,
                alertMessage: ''
            }));
        }      
    }

    const handleVerified = async () => {
        try {
            try {
                await downloadTemplate(completedTemplate, templateLanguage, templateName);
            } catch (error) {
                throw error;
            }
        } catch (error) {
            console.error("Error downloading the template:", error);
            setMessage("We couldn't generate your download. Please check if your browser allows downloads from this site, or try saving the content manually by copying it to a text file.");
            cleanUp();
        } finally {
            // Optional cleanup
            cleanUp();
        }
    };
    
    const handleSelectTemplate = async (template) => {
        showAlert(`Are you sure you want to select the template "${template.name}"?`, async () => {
        try {
            // Extract fields from the template
            const customFields = await fetchCustomField(template.template);
            
            // compare the template fields with the issue fields and map them accordingly
            const {mappedFields, missingFields: missingFieldsHere} = await mapCustomFieldsToValues(customFields, issueFields);
            
            // When using missingFields from the utility, update the component state
            if (missingFieldsHere.length > 0) {
                setMissingFields(missingFieldsHere);
            }
            
            // replace the template fields with the mapped values    
            let mappedValues;
            try {
                mappedValues = await invoke('mapFields', { payload: { missingFields: missingFieldsHere, mappedFields: mappedFields, template: template.template}});
                // setMissingFieldOperationMessage(missingFieldOperationMessage);
                if (mappedValues === null || Object.keys(mappedValues).length === 0 || mappedValues === undefined) throw new Error('No mapped values returned from the server.');
            } catch (error) {
                console.error('Error: mapped values:', mappedValues);
                console.error('Error during field mapping:', error.message);
                throw error; // Re-throw to properly signal failure
            }

            const mappedTemplate = regexMapping(template.template, mappedValues);
            setCompletedTemplate(mappedTemplate);
            setTemplateLanguage(template.datatype);
            setTemplateName(template.name);
            setIsVerifying(true);
        } catch (error) {
            console.error('Error selecting template:', error);
            setMessage(`There was a problem processing template "${template.name}". This might be due to missing fields or formatting issues. Try a different template or contact support for assistance.`);
            cleanUp();
        }         
        });
    }// Field mapping moved to fieldMapper.js utility    // Template regex mapping moved to templateProcessor.js utility

    if (isLoading || templatesLoading) {
        return <Loader/>;
    }

    if (templatesError) {
        return (
            <div className="issue-view-container">
                <Stack alignInline="center" grow="fill" space="space.200">
                    <Text>{templatesError.message}</Text>
                </Stack>
            </div>
        );
    }

    const templateColumns = [
        {
            key: 'template',
            header: 'Template',
            width: 75,
            isSortable: true,
            renderCell: (item) => <Text align="center">{item.value.name}</Text>
        },
        {
            key: 'actions',
            header: 'Actions',
            width: 25
        }
    ];

    const templateActions = [
        {
            icon: AddIcon,
            label: 'Select',
            onClick: (item) => handleSelectTemplate(item.value)
        }
    ];

    return (
        <div className="issue-view-container">
            <Stack alignInline="center" grow="fill" space="space.200">
                {(!!modalState.alertMessage|| !!modalState.message ) && (
                    <ModalDialog
                        message={modalState.alertMessage || modalState.message}
                        handleCancel={handleCancel}
                        handleConfirm={!!modalState.alertMessage? handleConfirm : null}
                        titleAppearance={modalState.titleAppearance}
                        buttonAppearance={!!modalState.alertMessage? modalState.buttonAppearance : "danger"}
                    />
                )}
                
                {!!isVerifying ? (
                    <VerifyTemplate
                        missingFields={missingFields}
                        templateLanguage={templateLanguage}
                        completedTemplate={completedTemplate}
                        onCancel={handleCancel}
                        onVerified={handleVerified}
                    />
                ) : (
                    <TableList
                        data={templates}
                        columns={templateColumns}
                        actions={templateActions}
                        isLoading={isLoading}
                        emptyMessage="No templates available"
                        idField="key"
                    />
                )}
            </Stack>
        </div>
    );
}

export default IssueView;

