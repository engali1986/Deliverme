const BASE_URL = "http://localhost:5000/api/auth"; // Replace with your backend's deployed URL if applicable

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
