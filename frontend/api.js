import { Alert, Platform } from 'react-native';
import { API_BASE_URL } from './config';

// Alert.alert is a no-op on Expo web, so fall back to window.alert there.
export function notify(title, message) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

// Generic JSON request. Throws an Error with a readable message on network or HTTP failure.
export async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new Error(`Cannot reach the server at ${API_BASE_URL}. Is the backend running?`);
  }

  let data = null;
  try {
    data = await response.json();
  } catch (e) {
    // non-JSON body; handled below
  }

  if (!response.ok) {
    throw new Error((data && data.message) || `Request failed (${response.status})`);
  }
  if (data === null) throw new Error('Invalid response from server');
  return data;
}
