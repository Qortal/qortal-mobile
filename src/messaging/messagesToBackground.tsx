

// Utility to generate unique request IDs
function generateRequestId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Map to store callbacks by requestId
const callbackMap = new Map();

// Global listener for handling message responses
window.addEventListener("message", (event) => {
  const { type, requestId, payload, error, message } = event.data;

  // Only process messages of type `backgroundMessageResponse`
  if (type !== "backgroundMessageResponse") return;

  // Check if there’s a callback stored for this requestId
  if (callbackMap.has(requestId)) {
    const { resolve, reject } = callbackMap.get(requestId);
    callbackMap.delete(requestId); // Remove callback after use

    if (error) {
      reject({ error, message });
    } else {
      resolve({ payload });
    }
  }
});

// Define the sendMessage function
export const sendMessageBackground = (action, data = {}, timeout = 60000) => {
  return new Promise((resolve) => {
    const requestId = generateRequestId(); // Unique ID for each request
    callbackMap.set(requestId, { resolve }); // Store resolve callback only

    // Send the message with `backgroundMessage` type
    window.postMessage({ type: "backgroundMessage", action, requestId, payload: data }, "*");

    // Set up a timeout to automatically resolve with an error if no response is received
    const timeoutId = setTimeout(() => {
      // Remove the callback to prevent memory leaks
      callbackMap.delete(requestId);
      resolve({ error: "timeout", message: `Request timed out after ${timeout} ms` });
    }, timeout);

    // Adjust resolve to clear the timeout when a response arrives
    callbackMap.set(requestId, {
      resolve: (response) => {
        clearTimeout(timeoutId); // Clear the timeout if the response is received in time
        resolve(response);
      }
    });
  }).then((response) => {
    // Return payload or error based on response content
    if (response?.payload) {
      return response.payload;
    } else if (response?.error) {
      return { error: response.error, message: response?.message || "An error occurred" };
    }
  });
};



window.sendMessage = sendMessageBackground;