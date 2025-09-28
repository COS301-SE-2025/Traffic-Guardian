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
