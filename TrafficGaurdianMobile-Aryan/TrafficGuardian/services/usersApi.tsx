const API_URL = "http://localhost:5000/api/";

export async function registerUser(username: string, email: string, password: string) {
  try{
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        User_Username: username,
        User_Password: password,
        User_Email: email,}),
    });

    if(!response){
        throw new Error("API not running");
    }

    if (!response.ok) {
      throw new Error("Registration failed");
    }

    return await response.json();
  }catch(error){
    console.error("Register error:", error);
    throw error;
  }
}

export async function loginUser(email: string, password: string) {
  try{
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        User_Password: password,
        User_Email: email,}),
    });

    if(!response){
        throw new Error("API not running");
    }

    if (!response.ok) {
      throw new Error("Registration failed");
    }

    return await response.json();
  }catch(error){
    console.error("Register error:", error);
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
