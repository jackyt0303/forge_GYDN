# Project GYDN - Jira Forge App

GYDN is a Jira Forge application that allows users to manage templates and use them to generate documents or structured data based on Jira issue fields.

## Features

### Project Settings (`jiraProjectPage`)

The Project Settings module allows users to:

*   **Create and Manage Templates**:
    *   Define templates with placeholders for Jira issue fields (e.g., `${summary}`, `${customfield_10001}`).
    *   Support for JSON and XML template formats.
    *   Upload template files.
    *   Edit existing templates.
    *   Delete templates.
    *   View a list of available templates.
*   **View Detected and Project Fields**:
    *   See fields extracted from the currently edited template and their availability in the project.
    *   List all available fields for the current Jira project.

### Issue View (`jiraIssuePanel`)

The Issue View module, accessible from a Jira issue, enables users to:

*   **Select a Template**: Choose from the list of predefined templates.
*   **Map Issue Fields to Template**:
    *   The app automatically maps Jira issue fields to the placeholders in the selected template.
    *   It attempts to find values for missing fields by searching the issue's description field using AI (via Google Gemini).
*   **Verify and Download**:
    *   Preview the populated template.
    *   View a list of any fields that were missing from the issue but potentially found in the description.
    *   Download the completed document/data in the template's format (JSON/XML).

## How it Works

1.  **Template Definition**: Users define templates in Project Settings, specifying placeholders for Jira fields.
2.  **Field Mapping**:
    *   When a user selects a template in the Issue View, the app fetches the current issue's fields.
    *   It uses the `mapCustomFieldsToValues` utility (from [static/project-setting/src/utils/fieldMapper.js](static/project-setting/src/utils/fieldMapper.js)) to match template fields with issue data.
    *   If fields are missing, the `getActualValue` function (in [src/api/llm.js](src/api/llm.js)) is invoked. This function uses a Large Language Model (Google Gemini) to:
        *   Normalize complex Jira field values (e.g., user objects, date-time strings).
        *   Attempt to find values for missing fields by searching the issue's description text.
3.  **Template Processing**: The `regexMapping` function (from [static/project-setting/src/utils/templateProcessor.js](static/project-setting/src/utils/templateProcessor.js)) replaces placeholders in the template with the mapped values.
4.  **Download**: Users can download the processed template.

## Technical Stack

*   **Forge**: Atlassian Forge framework
*   **Frontend**: React, Vite
    *   UI Components: Atlaskit
    *   State Management: React Context API, custom hooks (`useTemplate`, `useTemplateActions`)
*   **Backend**: Node.js (Forge runtime)
    *   AI Integration: Google Gemini API for intelligent field value extraction and fallback.
    *   Storage: Forge storage API (via `storageService.js`)

## Key Files

*   `manifest.yml`: Defines the Forge app structure, modules, and permissions.
*   `src/index.js`: Backend resolver functions for Forge.
*   `src/api/llm.js`: Logic for interacting with the Google Gemini LLM for field value extraction.
*   `static/project-setting/src/modules/ProjectSetting.jsx`: Frontend component for the project settings page.
*   `static/project-setting/src/modules/IssueView.jsx`: Frontend component for the issue panel.
*   `static/project-setting/src/hooks/useTemplate.jsx`: Custom hook for managing template data.
*   `static/project-setting/src/utils/templateProcessor.js`: Utilities for processing templates (regex mapping, download).
*   `static/project-setting/src/utils/fieldMapper.js`: Utilities for mapping custom fields to issue values.

## Setup and Build

1. npm install pnpm -g
2. cd static/project-setting
3. pnpm i 
4. pnpm run build 
5. cd ../../
6. forge deploy 
7. (Optional) forge tunnel (For debugging purpose)