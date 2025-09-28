import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";

const API_URL = "http://localhost:5000/api";

const getBaseUrl = () => {
/*   if (Platform.OS === "android") {
    return "http://10.0.2.2:5000";

  } else if (Platform.OS === "ios") {
    return "http://localhost:5000";

  } else {
    return "http://localhost:5000";
  } */
  return "https://api.traffic.guardian.co.za";
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
