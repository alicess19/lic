import AsyncStorage from '@react-native-async-storage/async-storage';
const defCache = 60;
const memoryCache: { [key: string]: number } = {};
const dataMemoryCache: { [key: string]: any } = {};

export const fetchFitb = async (resourceKey: string, cacheMinutes = defCache) => {
  try {
    const now = Date.now();
    const cacheMs = cacheMinutes * 60 * 1000;
    const cacheKey = `fitbit_lastFetch_${resourceKey}`;
    let lastFetch: number | null = null;
    try {
      const lastFetchStr = await AsyncStorage.getItem(cacheKey);
      if (lastFetchStr) {
        lastFetch = parseInt(lastFetchStr, 10);
      }
    } catch (asyncError) {
      console.warn('err- citire din asyncstorage, se fol mem:', asyncError);
      lastFetch = memoryCache[resourceKey] || null;
    }
    if (lastFetch && now - lastFetch < cacheMs) {
      console.log(`cache activ pt ${resourceKey}, ultimul fetch: ${new Date(lastFetch).toLocaleTimeString()}`);
      return false;
    }
    console.log(`cache exp/nu ex pt ${resourceKey}, fetch nou`);
    return true;
  } catch (error) {
    console.error('err- veruf cache pt fetchFitb:', error);
    return true;
  }
};

export const updFetch = async (resourceKey: string) => {
  try {
    const timestamp = Date.now();
    const cacheKey = `fitbit_lastFetch_${resourceKey}`;
    try {
      await AsyncStorage.setItem(cacheKey, timestamp.toString());
    } catch (asyncError) {
      console.warn('err- salvare async:', asyncError);
    }
    memoryCache[resourceKey] = timestamp;
    console.log(`marca timp- salvata: ${resourceKey}: ${new Date(timestamp).toLocaleTimeString()}`);
  } catch (error) {
    console.error('err- actualizare fetch timestamp:', error);
  }
};
export const saveFitbitData = async (resourceKey: string, data: any) => {
  try {
    const dataKey = `fitbit_data_${resourceKey}`;
    try {
      await AsyncStorage.setItem(dataKey, JSON.stringify(data));
    } catch (asyncError) {
      console.warn('err- salvate date asyncstorage:', asyncError);
    }
    dataMemoryCache[resourceKey] = data;
    console.log(`date Fitbit salvate pt ${resourceKey}`);
  } catch (error) {
    console.error('err- salvare date Fitbit:', error);
  }
};
export const loadFitbitData = async (resourceKey: string) => {
  try {
    const dataKey = `fitbit_data_${resourceKey}`;
    try {
      const dataStr = await AsyncStorage.getItem(dataKey);
      if (dataStr) {
        const data = JSON.parse(dataStr);
        console.log(`date Fitbit inc din asyncstorage pt ${resourceKey}`);
        return data;
      }
    } catch (asyncError) {
      console.warn('err- citire date asyncstor., fol memoria:', asyncError);
    }
    if (dataMemoryCache[resourceKey]) {
      console.log(`date Fitbit inc din mem pt ${resourceKey}`);
      return dataMemoryCache[resourceKey];
    }
    console.log(`nu ex date cached pt ${resourceKey}`);
    return null;
  } catch (error) {
    console.error('err- inc date Fitbit:', error);
    return null;
  }
};

export const getFitbitDataWithCache = async (resourceKey: string, cacheMinutes = defCache) => {
  const shouldFetch = await fetchFitb(resourceKey, cacheMinutes);
  if (!shouldFetch) {
    const cachedData = await loadFitbitData(resourceKey);
    return {
      shouldFetch: false,
      data: cachedData,
    };
  }
  return {
    shouldFetch: true,
    data: null,
  };
};

export const saveFitbitFetchResult = async (resourceKey: string, data: any) => {
  await Promise.all([
    updFetch(resourceKey),
    saveFitbitData(resourceKey, data),
  ]);
};

export const clearExpiredCache = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const fitbitKeys = keys.filter(key => key.startsWith('fitbit_'));
    const now = Date.now();
    for (const key of fitbitKeys) {
      try {
        if (key.includes('lastFetch')) {
          const timestampStr = await AsyncStorage.getItem(key);
          if (timestampStr) {
            const timestamp = parseInt(timestampStr, 10);
            if (now - timestamp > 24 * 60 * 60 * 1000) {
              await AsyncStorage.removeItem(key);
              const dataKey = key.replace('lastFetch', 'data');
              await AsyncStorage.removeItem(dataKey);
              const resourceKey = key.replace('fitbit_lastFetch_', '');
              delete memoryCache[resourceKey];
              delete dataMemoryCache[resourceKey];
              console.log(`cache clean pt ${resourceKey}`);
            }
          }
        }
      } catch (error) {
        console.warn(`err curatare cache pt ${key}:`, error);
      }
    }
  } catch (error) {
    console.error('err curatare cache exp:', error);
  }
};

export const debugCache = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const fitbitKeys = keys.filter(key => key.startsWith('fitbit_lastFetch_'));
    const now = Date.now();
    console.log('cache active:');
    for (const key of fitbitKeys) {
      try {
        const timestampStr = await AsyncStorage.getItem(key);
        if (timestampStr) {
          const timestamp = parseInt(timestampStr, 10);
          const resourceKey = key.replace('fitbit_lastFetch_', '');
          const ageMinutes = Math.floor((now - timestamp) / (60 * 1000));
          const dataKey = `fitbit_data_${resourceKey}`;
          const hasData = await AsyncStorage.getItem(dataKey);
          console.log(`  ${resourceKey}: ${ageMinutes} min in urma ${hasData ? 'cu date' : 'fara date'}`);
        }
      } catch (error) {
        console.warn(`err debug pt ${key}:`, error);
      }
    }
    console.log('cache memorie:', Object.keys(memoryCache).map(key => ({
      key,
      ageMinutes: Math.floor((now - memoryCache[key]) / (60 * 1000)),
      hasData: !!dataMemoryCache[key],
    })));
  } catch (error) {
    console.error('errr debug cache:', error);
  }
};
