import Resolver from '@forge/resolver';
import { saveValueWithGeneratedKey, getValue, deleteValue, getAllTemplate, getAllKeys } from './service/storageService';
import { getFieldValuesRef, getIssueFields } from './api/data';
import { getActualValue } from './api/llm';

const resolver = new Resolver();
  
  resolver.define('saveValueWithGeneratedKey', async ({ payload }) => {
    const value = payload.payload.value;
    const pKey = payload.payload.projectKey;
    const pDataType =  payload.payload.dataType;
    const name = payload.payload.name;

      // Log the payload structure and check if 'value' exists
      if (payload && value) {
        console.log('Value received in resolver:', value);
        console.log('Type of value:', typeof value);
        console.log('Resolver: Name is: ', name )
        return await saveValueWithGeneratedKey(pKey, value, pDataType , name);
    } else {
        console.log('Payload or payload.value is undefined!');
    }
  });
  
  resolver.define('deleteValue', async ({ payload }) => {
    const { key } = payload.payload;
    console.log('reach delete resolver, with key: ', key)
    return await deleteValue(key);
  });
  
  resolver.define('getAllTemplate', async () => {
    console.log('Reached getAll Template Resolver')
    return await getAllTemplate();
  });

  resolver.define('getFieldValuesRef', async ({ payload }) => {
    const { pkey } = payload.payload;
    return await getFieldValuesRef(pkey);
  });


  // Issue view resolver

  resolver.define('getIssueFields', async ({ payload }) => {
    const { issueKey } = payload.payload;
    console.log('getIssueFields resolver called with issueKey:', issueKey);
    return await getIssueFields(issueKey);
  })

  resolver.define('mapFields', async ({ payload }) => {
    console.log('mapFields resolver called with payload:', payload);
    const {missingFields, mappedFields, template} = payload.payload;
    console.log('missingFields:', missingFields);
    const mappedValues = await getActualValue(missingFields, mappedFields, template)
      .then((response) => {
        console.log('resolver, response:', response);
        return response;
      })
      .catch((error) => {
        console.error('Error in getActualValue:', error);
        return error;
      });

    return mappedValues;
  })

export const handler = resolver.getDefinitions();

