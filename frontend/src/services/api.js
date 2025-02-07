const BASE_URL = "http://192.168.1.6:5000/api/auth"; // Replace with your backend's deployed URL if applicable

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
 * @param {Object} data - The client login details (email, password).
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
  
  // Send request to backend
  const response = await fetch(`${BASE_URL}/driver/signup`, {
  method: "POST",
  body: formData,
  headers: {
    "Accept": "application/json", // ✅ No "Content-Type" needed; FormData sets it automatically
  },
  });
  
  if (!response.ok) {
  const errorData = await response.json();
  throw new Error(errorData.message || "Failed to sign up");
  }
  
  return await response.json();
  } catch (error) {
    console.log("api.js driverSignup error",error)
  console.log(error);
  throw new Error(error.message || "Network error");
  }
}
  
  
