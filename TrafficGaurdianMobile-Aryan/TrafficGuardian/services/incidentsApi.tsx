// services/incidentsApi.tsx
import { Platform } from "react-native";
import Constants from "expo-constants";

type FetchOpts = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: any;
};

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

async function doFetch<T = any>(path: string, opts: FetchOpts = {}): Promise<T> {
  const { method = "GET", headers = {}, body } = opts;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data && (data.message || data.error)) || `HTTP ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

/** Incidents API */

export type NewIncidentPayload = {
  title?: string;
  description?: string;
  type?: string;
  severity?: string;
  latitude: number;
  longitude: number;
  userId?: string | number;
  [key: string]: any;
};

export const incidentsApi = {
  baseUrl: BASE_URL,

  getAll: (headers?: Record<string, string>) => doFetch("/incidents", { headers }),

  getById: (id: string | number, headers?: Record<string, string>) =>
    doFetch(`/incidents/${id}`, { headers }),

  create: (payload: NewIncidentPayload, headers?: Record<string, string>) =>
    doFetch("/incidents", { method: "POST", body: payload, headers }),

  /** Upload voice note for an incident */
  uploadVoice: async (incidentId: string | number, fileUri: string, headers?: Record<string, string>) => {
    const url = `${BASE_URL}/incidents/${incidentId}/voice`;
    const form = new FormData();
    form.append("voice", {
      // @ts-ignore – RN file shape
      uri: fileUri,
      name: "voice.m4a",
      type: "audio/m4a",
    });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        ...(headers ?? {}),
        // NOTE: Let RN set correct multipart boundary automatically
      } as any,
      body: form as any,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || `Upload failed: ${res.status}`);
    return data;
  },

  remove: (id: string | number, headers?: Record<string, string>) =>
    doFetch(`/incidents/${id}`, { method: "DELETE", headers }),
};


/*import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";

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

export async function createIncident(date : string,location : string, Incident_Severity : string, description : string, coords : any, user : any){
    try{
      console.log(user.user.User_Username);
    const response = await fetch(`${getBaseUrl()}/api/incidents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" ,
        "X-API-KEY": user.apiKey 
      },
      body: JSON.stringify(
        { 
        Incidents_DateTime: date.trim(),
        Incident_Status : "open",
        Incident_Severity: Incident_Severity.trim(),
        Incident_Reporter : user.user.User_Username,
        Incident_Description : description.trim(),
        Incidents_Longitude : coords.longitude,
        Incidents_Latitude : coords.latitude
        }
        ),
    });

    if(!response){
        throw new Error("API not running");
    }

    if(!response.ok){
      throw new Error("Reporting failed");
    }

    return await response.json();
  }catch(error){
    console.error("Reporting error:", error);
    throw error;
  }
}

export async function sendVoice(voiceURI: string, user : any){
  const formData = new FormData();
  formData.append("voice", {
    uri: voiceURI,
    name: "recording.m4a",
    type: "audio/m4a",
  } as any);

  const response = await fetch(`${getBaseUrl()}/api/uploads/voice`, {
    method: "POST",
    headers : {"X-API-KEY" : user.apiKey},
    body: formData,
  });

  if (!response.ok){
    console.log(response);
    throw new Error("Voice upload failed");
  }

  return await response.json();
}
*/