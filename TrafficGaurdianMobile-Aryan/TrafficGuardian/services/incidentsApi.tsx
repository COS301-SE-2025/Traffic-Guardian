import { Platform } from "react-native";

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

export async function createIncident(date : string,location : string, Incident_CarID : string, Incident_Severity : string, description : string, coords : any){
    return JSON.stringify(coords);

    try{
    const response = await fetch(`${getBaseUrl()}/api/incidents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        { 
        Incident_Date: date.trim(),
        Incident_Location: location.trim(),
        Incident_CarID: Incident_CarID,
        Incident_Severity: Incident_Severity.trim(),
        Incident_Status: "open",
        Incident_Reporter : "idk_for now",
        Incident_Description : description.trim()
        }
        ),
    });

    if(!response){
        throw new Error("API not running");
    }

    if (!response.ok) {
      throw new Error("Reporting failed");
    }

    return await response.json();
  }catch(error){
    console.error("Reporting error:", error);
    throw error;
  }
}