import AsyncStorage from "@react-native-async-storage/async-storage";

// Small JSON values on the phone. A read that fails gives the fallback and a
// write that fails is dropped: nothing here is the only copy of anything.

export async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export async function writeJSON(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Full or unavailable storage: the app keeps working from memory.
  }
}
