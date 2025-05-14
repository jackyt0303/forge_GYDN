import api, { route } from "@forge/api";

export async function getFieldValuesRef(pKey) {
    try {
        const response = await api.asApp().requestJira(route`/rest/api/3/issue/createmeta/${pKey}/issuetypes`, {
            headers: {
                'Accept': 'application/json'
            }
        });

        console.log(`Response frm getFieldValuesRef: ${response.status} ${response.statusText}`);
        const responseBody = await response.json();
        const fieldsMap = new Map();
        await Promise.all(responseBody.issueTypes.map(async (issueType) => {
            try {
                const fields = await getAllFields(pKey, issueType.id);

                // add all the fields to the map
                fields.forEach(field => {
                    if (!fieldsMap.has(field.fieldId)) {
                        fieldsMap.set(field.fieldId, field.name); // Add only if the key doesn't exist
                    }
                });
            } catch (error) {
                console.error(`Error retrieving fields for issue type "${issueType.name}":`, error);
                return null;
            }
        }));
        const fieldsObject = await Object.fromEntries(fieldsMap); // Convert Map to object if needed
        // console.log('fieldsObject: ', fieldsObject) // for debugging
        return fieldsObject; // Convert Map back to object if needed

    } catch (error) {
        console.error(`Error retrieving issues for key "${pKey}":`, error);
        throw error;
    }
}

async function getAllFields(pKey, issueTypeId) {
    try {
        const response = await api.asApp().requestJira(route`/rest/api/3/issue/createmeta/${pKey}/issuetypes/${issueTypeId}`, {
            headers: {
                'Accept': 'application/json'
            }
        });

        const responseBody = await response.json();
        return responseBody.fields.map(field => ({
            name: field.name,
            fieldId: field.fieldId
        }));
    } catch (error) {
        console.error('Error retrieving all fields:', error);
        throw error;
    }
}

export async function getIssueFields(issueKey) {
    const notEmptyFields = {};
    try {
        const response = await api.asApp().requestJira(route`/rest/api/3/issue/${issueKey}`, {
            headers: {
              'Accept': 'application/json'
            }
          });
          
        console.log(`Response: ${response.status} ${response.statusText}`);
        const responseBody = await response.json();
        
        const allFields = responseBody.fields;
        Object.entries(allFields).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                notEmptyFields[key] = value;
            }
        });
        //debugging
    
        // console.log('Issue Fields Response body: ', responseBody.fields)
        // console.log('notEmptyFields: ', notEmptyFields)
        // console.log('backend- issuefield check keys: ', Object.keys(notEmptyFields))
        return notEmptyFields;

    } catch (error) {
        console.error(`Error retrieving issue ID for key "${issueKey}":`, error);
        throw error;
    }
}