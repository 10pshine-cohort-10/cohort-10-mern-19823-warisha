export async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      credentials: "same-origin",
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch {
    throw new Error(
      "Unable to reach the server. Please check your connection and try again.",
    );
  }
  if (response.status === 204) return null;
  let data;
  try {
    data = await response.json();
  } catch {
    const error = new Error(
      "The server returned an unexpected response. Please try again.",
    );
    error.status = response.status;
    throw error;
  }
  if (!response.ok) {
    const error = new Error(data.error || "Request failed.");
    error.status = response.status;
    throw error;
  }
  return data;
}
