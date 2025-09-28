// services/usersApi.tsx
import { Platform } from "react-native";
import Constants from "expo-constants";

const envBase =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  (Constants?.expoConfig?.extra as any)?.apiBaseUrl ||
  (Constants?.manifest2 as any)?.extra?.apiBaseUrl ||
  "";

const fallbackBase = Platform.select({
  android: "http://10.0.2.2:5000",
  ios: "http://localhost:5000",
  default: "http://localhost:5000",
});

const BASE_URL = (envBase || fallbackBase) + "/api";

export type RegisterPayload = {
  username: string;
  email: string;
  password: string;
  cellphone: string;
};

export async function registerUser({ username, email, password, cellphone }: RegisterPayload) {
  const response = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      User_Username: username,
      User_Password: password,
      User_Email: email,
      User_CellPhone: cellphone,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Registration failed");
  return data;
}

export async function loginUser(email: string, password: string) {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ User_Email: email, User_Password: password }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Login failed");
  return data;
}

/** Optional helpers */
export async function getProfile(headers?: Record<string, string>) {
  const res = await fetch(`${BASE_URL}/users/me`, { headers: { ...(headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Failed to fetch profile");
  return data;
}

export const usersApi = { baseUrl: BASE_URL, registerUser, loginUser, getProfile };



/* import { Platform } from "react-native";

const API_URL = "http://localhost:5000/api";

const getBaseUrl = () => {
  if (Platform.OS === "android") {
    return "http://10.0.2.2:5000";

  } else if (Platform.OS === "ios") {
    return "http://localhost:5000";

  } else {
    return "http://localhost:5000";
  }
};

export async function registerUser(username: string, email: string, password: string ,cellphone : string) {
  try{
    const response = await fetch(`${getBaseUrl()}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        User_Username: username,
        User_Password: password,
        User_Email: email,
        User_CellPhone : cellphone
      }),
    });

    if(!response){
        throw new Error("API not running");
    }

    if(!response.ok){
      throw new Error("Registration failed" + JSON.stringify(response));
    }

    return await response.json();
  }catch(error){
    console.error("Register error:", error);
    throw error;
  }
}

export async function loginUser(email: string, password: string) {
  try {
    const payload = { User_Email: email, User_Password: password };

    const response = await fetch(`${getBaseUrl()}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.status !== 200) {
      throw new Error(data.message || "Login failed");
    }

    return data;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}


/**
 * {
  "User_Username": "testuser1",
  "User_Password": "password123",
  "User_Email": "testuser@gmail.com",
  "User_Role": "user",
  "User_Preferences": "{}"
}
 */
