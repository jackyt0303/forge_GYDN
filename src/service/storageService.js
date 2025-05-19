import { kvs, WhereConditions } from '@forge/kvs';
import { v4 as uuidv4 } from 'uuid'; 
// Generate a unique key using UUID

const prefix = 'TEMPLATE-'; // Prefix for keys

/**
 * Save a value to Forge KVS with a dynamically generated unique ID key.
 * @param {string} pKey - project Key.
 * @param {Object} value - template value.
 * @param {string} pDataType - data type of the template.
 * @param {string} name - name of the template.
 * @returns {Promise<string>} - The generated template name.
 */
export async function saveValueWithGeneratedKey(pKey, value, pDataType, name) {
  const uuid = uuidv4(); 
  const uniqueKey = `${prefix}${pKey}-${uuid}`;
  const formattedName = `${prefix}${pKey}-${name}`;
  const formattedValue = {
    name: formattedName,
    id: uniqueKey,
    projectKey: pKey, //"get from project api",
    template: value,
    datatype: pDataType //"pass here through request payload",
  }
  await saveValue(uniqueKey, formattedValue);
  return formattedName;
}

/**
 * Retrieve a value from Forge KVS by key.
 * @param {string} key - The key to retrieve the value from.
 * @returns {Promise<any>} - The stored value, or null if not found.
 */
export async function getValue(key) {
  try {
    return await kvs.get(key);
  } catch (error) {
    console.error(`Error retrieving value for key "${key}":`, error);
    throw error;
  }
}

/**
 * Delete a value from Forge KVS by key.
 * @param {string} key - The key to delete the value from.
 */
export async function deleteValue(key) {
  try {
    const targetTemplate = await getValue(key);
    await kvs.delete(key);
    return targetTemplate;
  } catch (error) {
    console.error(`Error deleting value for key "${key}":`, error);
    throw error;
  }
}

/**
 * List all key-value pairs in Forge KVS that start with a specific prefix.
 * @returns {Promise<Array<{key: string, value: any}>>} - Array of matching key-value pairs.
 */
export async function getAllTemplate() {
  const allResults = [];
  let cursor = undefined;

  try {
    do {
      const queryResult = await kvs.query()
        .where('key', WhereConditions.beginsWith(prefix))
        .limit(100) // Explicitly set a higher limit
        .cursor(cursor)
        .getMany();

      allResults.push(...queryResult.results);
      // console.log('queryResult.results: ', queryResult.results)
      cursor = queryResult.cursor; // update cursor for next iteration
    } while (cursor); // continue until no more results
  } catch (error) {
    console.error(`Error listing all values:`, error);
    throw error;
  }
  return allResults;
}


