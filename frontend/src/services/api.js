import AsyncStorage from "@react-native-async-storage/async-storage";
const BASE_URL = "http://192.168.1.7:5000/api/auth"; // Replace with your backend's deployed URL if applicable

/**
 * Handles user signup for clients.
 * @param {Object} data - The client signup details (email, mobile, name, password).
 */
export async function clientSignup(data) {
  try {
    const response = await fetch(`${BASE_URL}/client/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    console.log("api.js client signup response",response)
    console.log("api.js client signup response.ok",response.ok || "cannot find response.ok")
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to sign up");
    }

    return await response.json();
  } catch (error) {
    console.log(error)
    throw new Error(error.message || "Network error");
  }
}

/**
 * Handles user login for clients.
 * @param {Object} data - The client login details (mobile, password).
 */
export async function clientSignin(data) {
  try {
    const response = await fetch(`${BASE_URL}/client/signin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to sign in");
    }

    return await response.json();
  } catch (error) {
    throw new Error(error.message || "Network error");
  }
}

/**
 * Handles user Verify for clients.
 * @param {Object} data - The client Verify details (mobile, password).
 */
export async function verifyClient(data) {
  console.log("api.js verifyClient data mobile, verificationCode", data)
  try {
    const response = await fetch(`${BASE_URL}/client/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    console.log("api.js verifyClient response", response)

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Verification failed");
    }

    return response.json();
  } catch (error) {
    throw new Error(error.message || "Network error");
  }
}

/**
 * Handles user signup for drivers.
 * @param {Object} data - The driver signup details (email, mobile, name, password).
 */
export async function driverSignup(data) {
  console.log("api.js driverignup data",data)
  try {
  const formData = new FormData();
  
  // Append all form fields to FormData
  Object.keys(data).forEach((key) => {
    if (["license", "registration", "criminal", "personal"].includes(key)) {
      formData.append(key, {
        uri: data[key],
        type: "image/jpeg",
        name: `${key}.jpg`,
      });
    } else {
      formData.append(key, data[key]); // ✅ Ensure text fields are sent correctly
    }
  });
  console.log("api.js driver signup formData:", formData)
  console.log("api.js driver signup base_url:", `${BASE_URL}/driver/signup` )
  // Send request to backend
  const response = await fetch(`${BASE_URL}/driver/signup`, {
  method: "POST",
  body: formData,
  headers: {
    "Accept": "application/json", // ✅ No "Content-Type" needed; FormData sets it automatically
  },
  });
  console.log("api.js driver signup response.ok:", response.ok || "cannot find response.ok" )
  if (!response.ok) {
  const errorData = await response.json();
  throw new Error(errorData.message || "Failed to sign up");
  }
  
  return await response.json();
  } catch (error) {
    console.log("api.js driverSignup error",error, error.message)
  console.log(error);
  throw new Error(error.message || "Network error");
  }
}
/**
 * Handles driver sign-in request and stores JWT token.
 * @param {Object} data - The driver login details (mobile, password).
 */

export async function driverSignin(data) {
  console.log("api.js driversignin Data  mobile, password:",data)
  try {
    const response = await fetch(`${BASE_URL}/driver/signin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    console.log("api.js driversignin response:",response)
    console.log("api.js driversignin response.ok:",response.ok || "cannot read response.ok")

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to sign in");
    }

    const result = await response.json();
    // if (result.token) {
    //   // Store the token securely
    //   await AsyncStorage.setItem("driverToken", result.token);
    //   await AsyncStorage.setItem("driverData", JSON.stringify(result.driver));
    //   return result; // Returns driver details and JWT token
    // }

    return result // Returns driver data if no Token

    
  } catch (error) {
    console.log("Driver Sign-In Error:", error);
    throw new Error(error.message || "Network error");
  }
}


export async function verifyDriver(data) {
  console.log("api.js verifyDriver data mobile, verificationCode", data)
  try {
    const response = await fetch(`${BASE_URL}/driver/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    console.log("api.js verifyDriver response", response)

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Verification failed");
    }

    return response.json();
  } catch (error) {
    throw new Error(error.message || "Network error");
  }
}
  
  
