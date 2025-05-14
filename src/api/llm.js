import 'dotenv/config';
import { GoogleGenAI, Type } from "@google/genai";
import { convertADFtoString } from '../utils/adfReader';
import { missingFieldMessage } from '../utils/missingFieldMessage';

const currentApiKey = (process.env.GOOGLE_API_KEY)? process.env.GOOGLE_API_KEY : process.env.FORGE_ENV_GOOGLE_API_KEY;
const googleGenAI = new GoogleGenAI({apiKey: currentApiKey})
const selectedModel = 'gemini-2.0-flash' 

function responseConfig (customFields) {
    // customFields is an array of field names, e.g. ["summary", "customfield_12407", "customfield_10659"]
    const properties = {};
    const propertyOrdering = [];

    customFields.forEach((field) => {
        properties[field] = { type: Type.STRING }; // letting all answers be string
        propertyOrdering.push(field);
    });

    return {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: properties,
            required: propertyOrdering,
            propertyOrdering: propertyOrdering,
        }
        
    };
}

async function searchDescription (parsedResponse, template, actualDescription, mappedFields) {

    // console.log('parsedResponse in searchDescription', parsedResponse)
    console.log('template in searchDescription', template)
    // console.log('actualDescription in searchDescriptions', actualDescription)
    console.log('mappedFields in searchDescription', mappedFields)
    const prompt_description = `
        You are an Atlassian Jira template field value fallback assistant.

        You will be given three pieces of information:
        1.  'parsedResponse': The result from a previous field mapping step.
        2.  'template': The original template mapping user-preferred key names to field ID placeholders.
        3.  'actualDescription': The textual description of the Jira issue.

        Input Descriptions:

        1.  'parsedResponse' (variable: ${parsedResponse}):
            * This is a JSON object where keys are Jira 'fieldId's (e.g., "customfield_10001", "fields.summary") or it could be strings that users think it's related (e.g., "name" for preffered name of "candidate name", "city" for key of "destinationOfTravel") and values are the already extracted field values.
            * Some of these values will be the literal strings "Missing Value" or "Empty value", indicating that these specific fields need fallback processing.
            * Other values will be actual data and should be preserved as is.
            * Example 'parsedResponse':
                {
                "fields.summary": "Initial bug report",
                "customfield_10001": "Missing Value",
                "customfield_10002": "Empty value",
                "customfield_10003": "2024-07-15"
                }

        2.  'template' (variable: ${template}):
            * This is a string representing the user's desired template structure. It's typically a stringified JSON object (but could resemble XML in structure, focus on key-value mapping).
            * It maps user's preferred key names (e.g., "examDate", "candidateName") to 'fieldId' placeholders (e.g., "\${fields.summary}", "\${customfield_10001}", "\${city}","\${approvers}").
            * You will use this to find the user's preferred key name associated with a 'fieldId' that has a "Missing Value" or "Empty value" in 'parsedResponse'.
            * Example 'template' (as a stringified JSON):

                "{\"summaryText\": \"\${fields.summary}\", \"assigneeName\": \"\${customfield_10001}\", \"priorityLevel\": \"\${customfield_10002}\", \"resolutionDate\": \"\${customfield_10003}\"}"
                
            * To use this, you'll need to identify pairs like '"assigneeName": "\${customfield_10001}"', extract the 'fieldId' ("customfield_10001") from the placeholder, and use the user's preferred key name ("assigneeName").

        3.  'actualDescription' (variable: ${actualDescription}):
            * This is a string containing the general description of the Jira issue.
            * Example 'actualDescription': "This is an urgent issue. The assigneeName should be Bob The Builder. Priority level is High. Please investigate."

        Your Task:
        Your goal is to update the 'parsedResponse' object by trying to find fallback values in the 'actualDescription' for any 'fieldId' that currently has "Missing Value" or "Empty value".

        1.  Create a working copy of the 'parsedResponse' object. This copy will be modified and will be your final output.
        2.  Iterate through each 'fieldId' and its 'value' in the original 'parsedResponse'.
        3.  If a 'value' is "Missing Value" or "Empty value":
            a.  This 'fieldId' (e.g., "customfield_10001") needs a fallback attempt.
            b.  **Find User's Preferred Key Name:** Search the 'template' string. Look for an entry where the 'fieldId' placeholder (e.g., "\${customfield_10001}") matches the current 'fieldId'. 
                Extract the corresponding user's preferred key name (e.g., "assigneeName" from an entry like '"assigneeName": "\${customfield_10001}"').
            c.  **Search Description:** If a user's preferred key name is found:
                i.  Use this preferred key name (e.g., "assigneeName") as the search term within the 'actualDescription' string.
                ii. Look for patterns such as "[Preferred Key Name]: [ValueToExtract]", "[Preferred Key Name] is [ValueToExtract]", or sentences where the preferred key name and a potential value are clearly linked (e.g., "The [Preferred Key Name] should be [ValueToExtract]").
                iii. If a plausible value is found in 'actualDescription':
                    1.  Extract this found value as a simple string.
                    2.  Update your working copy of 'parsedResponse' by setting the value for the current 'fieldId' (e.g., "customfield_10001") to this newly extracted string.
                iv. If no plausible value is found in 'actualDescription' for this preferred key name, the value for the current 'fieldId' in your working copy remains "Missing Value" or "Empty value".
            d.  If the 'fieldId' (from 'parsedResponse') cannot be clearly mapped to a user's preferred key name in the 'template', then its value in the working copy should remain "Missing Value" or "Empty value".
        4.  Fields in 'parsedResponse' that did not initially have "Missing Value" or "Empty value" should remain untouched in your working copy.
        5.  Finally, only return the modified working copy of the 'parsedResponse' object as a JSON object, without any explanations.

        Example Scenario:

        Given:
        parsedResponse:
        {
        "fields.summary": "Initial bug report",
        "customfield_10001": "Missing Value",
        "customfield_10002": "Empty value",
        "customfield_10003": "2024-07-15"
        }
        template (stringified JSON):
        "{\"summaryText\": \"<span class="math-inline">\{fields\.summary\}\\", \\"assigneeName\\"\: \\"</span>{customfield_10001}\", \"priorityLevel\": \"<span class="math-inline">\{customfield\_10002\}\\", \\"resolutionDate\\"\: \\"</span>{customfield_10003}\"}"
        actualDescription:
        "This ticket is critical. The assignee name must be Clara Oswald. Also, the priorityLevel is Highest. Log attached."

        Your output should be:
        {
            "fields.summary": "Initial bug report",
            "customfield_10001": "Clara Oswald",
            "customfield_10002": "Highest",
            "customfield_10003": "2024-07-15"
        }
    `

    const generationConfig = JSON.stringify(responseConfig(Object.keys(mappedFields)),null, 2)


    // Description Prompt
    const response = await googleGenAI.models.generateContent({
        model: selectedModel,
        contents: prompt_description,
        config:generationConfig
    })

    return response.text;
}

function extractResponse (responseText) {
    try {
        const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
        const match = responseText.match(jsonRegex);

        if (match && match[1]) {
            responseText = match[1].trim(); // Extract the content and trim whitespace
        } else if (responseText.startsWith('```') && responseText.endsWith('```')) {
            responseText = responseText.slice(3, -3).trim(); // Basic removal if 'json' is missing
        }
        return responseText;
    } catch (error) {
        throw new Error("Error extracting JSON from response: " + error.message);
    }
}


export const getActualValue = async (missingFields, mappedFields, template) => {
    const actualDescription = mappedFields["description"] ? convertADFtoString(mappedFields["description"]) : 'null';
    console.log('mappedFields in llm.js', mappedFields)

    const prompt_initial = `
    You are an Atlassian Jira template field mapping assistant performing an initial mapping.

    You will be given a 'targetSet' and an 'issueValueSet'.

    Target Set Description:
    The 'targetSet' (variable: ${Object.keys(mappedFields)}) is a list contains required 'fieldID's. The value is a placeholder for a Jira 'fieldId' (e.g., "\${customfield_12345}").
    Example 'targetSet': (customfield_12444,customfield_10154,customfield_10010,customfield_12440,description,summary)

    Issue Value Set Description:
    The 'issueValueSet' (variable: ${JSON.stringify(mappedFields)}) is a stringified JSON object. Its keys are 'fieldId's (matching those in the 'targetSet' placeholders), 
    and its values are the raw field values from Jira.
    Example 'issueValueSet': {"summary": "Initial bug report", "customfield_10001": {"displayName": "John Doe", "accountId": "123..."}}

    Your Task:
    1.  Apply the "Specific Extraction Rules" (detailed below) to the raw value obtained to get the cleaned actual value.
    2.  If, after applying extraction rules, the cleaned value is an empty string, an empty array, or 'null', then the value for this field should be the string "Empty value".
    3.  If the raw value from 'issueValueSet' was the literal string "Missing Value" or "Empty value", preserve that string as the field's value.
    4.  Construct a new JSON object where:
        a.  Keys are the original fieldID from the 'Issue Value Set'.
        b.  Values are the cleaned actual values (or "Missing Value"/"Empty value" strings as determined above).
    6.  Only return this final JSON object output, without any explanations.

    Specific Extraction Rules (when processing values from 'issueValueSet'):
    1.  If a value is a string (and not "Missing Value" or "Empty value"), use it directly.
    2.  If a value is an object containing a 'value' key (e.g., for Jira select lists), use the content of the 'value' key. If 'value.value' is an empty string or null, consider it an 'Empty value'.
    3.  If a value is an object representing a user (often containing 'displayName' or 'name'), extract the 'displayName' or 'name'. If these are empty or null, consider it an 'Empty value'.
    4.  If a value is an array of user objects, extract the 'displayName' (or 'name') from each user object and return them as a list of strings. If the array is empty, or results in an empty list of names, consider it an 'Empty value'.
    5.  If a value is a date-time string (e.g., '2023-10-01T00:00:00.000+0000'), format it as 'YYYY-MM-DD'.

    Example Input:
    issueValueSet: {
        "customfield_10001": {"displayName": "Alice Wonderland", "name": "alicew"},
        "customfield_10002": null, // This will become "Missing Value"
        "customfield_10003": "2024-07-15T10:00:00.000+0000",
        "customfield_10004": [] // This will become "Empty value",
        "customfield_10005": ["Jacky","Kelvin","Syafiq"],
        "requestType": {
            _expands: [Array],
            id: '3302',
            _links: [Object],
            name: 'Change Management Approval Request',
            description: 'Aa formal submission limited to support function teams like IT, HR, and Finance.',
            helpText: '',
            defaultName: 'Change Management Approval Request',
            issueTypeId: '11477',
        },
        "currentStatus": {
            status: 'Waiting for 1st Approval',
            statusCategory: 'INDETERMINATE',
            statusDate: [Object]
        },
    }

    Expected Output JSON:
    {
    "customfield_10001": "Alice Wonderland",
    "customfield_10002": "Missing Value",
    "customfield_10003": "2024-07-15",
    "customfield_10004": "Empty value",
    "customfield_10005": ["Jacky","Kelvin","Syafiq"],
    "requestType": "Change Management Approval Request",
    "currentStatus": "Waiting for 1st Approval"
    }`

    // const generationConfig = JSON.stringify(responseConfig(Object.keys(mappedFields)),null, 2)
    
    // Initial Prompt
    const response = await googleGenAI.models.generateContent({
        model: selectedModel,
        contents: prompt_initial,
        // config:generationConfig
    })

    let responseText = response.text;

    let parsedResponse;
    let responseMessaage = null;
    try {
        // console.log('responseText in llm.js done (direct JSON):', responseText);
        parsedResponse = JSON.parse(responseText);
        responseMessaage = null;
        return parsedResponse;
    } catch (directJsonError) {
        // If direct parsing fails, try to extract from markdown
        // console.log('responseText in llm.js (markdown):', responseText);
        // console.log('Error parsing JSON directly:', directJsonError.message);
        console.log('Reached JSON matching regex')
        console.log('missingFields length: ', missingFields.length)
        try {
            // check if needed description fallback to search missing fields
            if (missingFields.length > 0){
                
                console.log('reach description checking request')
                const firstResponseContent = extractResponse(responseText);
                const finalResponse = await searchDescription(firstResponseContent, template, actualDescription, mappedFields);
                parsedResponse = JSON.parse(extractResponse(finalResponse))

            } else{
                // no need to search description, just extract the JSON
                parsedResponse = JSON.parse(extractResponse(responseText));

            }
            return parsedResponse;

        } catch (error) {
            console.error("Error parsing LLM response:", error);
            console.error("Raw LLM response:", responseText);
            return {};
        }
    }

}
