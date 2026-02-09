package com.github.Qortal.qortalMobile;

import android.util.Log;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.JSObject;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URL;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "ProxyServer")
public class ProxyServerPlugin extends Plugin {
    private static final String TAG = "ProxyServerPlugin";
    private ServerSocket serverSocket;
    private ExecutorService executorService;
    private int proxyPort = -1;
    private String targetHost = "localhost";
    private int targetPort = 12392;
    private volatile boolean isRunning = false;

    @PluginMethod
    public void startProxy(PluginCall call) {
        if (isRunning) {
            Log.w(TAG, "Proxy server already running on port " + proxyPort);
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("port", proxyPort);
            call.resolve(ret);
            return;
        }

        Integer requestedPort = call.getInt("port");
        String host = call.getString("targetHost", "localhost");
        Integer port = call.getInt("targetPort", 12392);

        targetHost = host;
        targetPort = port;

        try {
            // If no port specified, let system assign one
            if (requestedPort == null || requestedPort == 0) {
                serverSocket = new ServerSocket(0);
            } else {
                serverSocket = new ServerSocket(requestedPort);
            }
            
            serverSocket.setReuseAddress(true);
            proxyPort = serverSocket.getLocalPort();
            isRunning = true;

            Log.d(TAG, "Starting proxy server on port " + proxyPort + " forwarding to " + targetHost + ":" + targetPort);

            // Start accepting connections in background
            executorService = Executors.newCachedThreadPool();
            executorService.execute(this::acceptConnections);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("port", proxyPort);
            call.resolve(ret);

        } catch (IOException e) {
            Log.e(TAG, "Failed to start proxy server", e);
            call.reject("Failed to start proxy server: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopProxy(PluginCall call) {
        stopProxyServer();
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void getProxyInfo(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("isRunning", isRunning);
        ret.put("port", proxyPort);
        ret.put("targetHost", targetHost);
        ret.put("targetPort", targetPort);
        call.resolve(ret);
    }

    private void acceptConnections() {
        Log.d(TAG, "Proxy server listening for connections on port " + proxyPort);
        
        while (isRunning && serverSocket != null && !serverSocket.isClosed()) {
            try {
                Socket clientSocket = serverSocket.accept();
                Log.d(TAG, "Accepted connection from " + clientSocket.getRemoteSocketAddress());
                
                // Handle each connection in a separate thread
                executorService.execute(() -> handleConnection(clientSocket));
                
            } catch (IOException e) {
                if (isRunning) {
                    Log.e(TAG, "Error accepting connection", e);
                }
            }
        }
        Log.d(TAG, "Proxy server stopped listening");
    }

    private void handleConnection(Socket clientSocket) {
        try {
            InputStream clientInput = new BufferedInputStream(clientSocket.getInputStream());
            OutputStream clientOutput = new BufferedOutputStream(clientSocket.getOutputStream());

            // Read HTTP request from client (Chromecast)
            StringBuilder requestBuilder = new StringBuilder();
            byte[] buffer = new byte[8192];
            int bytesRead;
            boolean headersComplete = false;
            int contentLength = 0;
            String requestLine = null;
            Map<String, String> headers = new HashMap<>();

            // Read request headers
            while (!headersComplete && (bytesRead = clientInput.read(buffer)) != -1) {
                String chunk = new String(buffer, 0, bytesRead);
                requestBuilder.append(chunk);
                
                String request = requestBuilder.toString();
                int headerEnd = request.indexOf("\r\n\r\n");
                
                if (headerEnd != -1) {
                    String headerSection = request.substring(0, headerEnd);
                    String[] lines = headerSection.split("\r\n");
                    
                    if (lines.length > 0) {
                        requestLine = lines[0];
                        
                        // Parse headers
                        for (int i = 1; i < lines.length; i++) {
                            int colonIndex = lines[i].indexOf(":");
                            if (colonIndex > 0) {
                                String headerName = lines[i].substring(0, colonIndex).trim();
                                String headerValue = lines[i].substring(colonIndex + 1).trim();
                                headers.put(headerName.toLowerCase(), headerValue);
                            }
                        }
                    }
                    
                    headersComplete = true;
                }
                
                if (requestBuilder.length() > 100000) {
                    Log.e(TAG, "Request too large, aborting");
                    break;
                }
            }

            if (requestLine == null) {
                Log.e(TAG, "Failed to parse request line");
                clientSocket.close();
                return;
            }

            // Parse request line (e.g., "GET /path HTTP/1.1")
            String[] requestParts = requestLine.split(" ");
            if (requestParts.length < 2) {
                Log.e(TAG, "Invalid request line: " + requestLine);
                clientSocket.close();
                return;
            }

            String method = requestParts[0];
            String path = requestParts[1];

            Log.d(TAG, "Proxying request: " + method + " " + path);

            // Forward request to target (localhost Qortal node)
            String targetUrl = "http://" + targetHost + ":" + targetPort + path;
            URL url = new URL(targetUrl);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod(method);
            connection.setConnectTimeout(30000);
            connection.setReadTimeout(30000);

            // Copy relevant headers to target request
            for (Map.Entry<String, String> header : headers.entrySet()) {
                String headerName = header.getKey();
                // Skip headers that shouldn't be forwarded
                if (!headerName.equals("host") && !headerName.equals("connection")) {
                    connection.setRequestProperty(headerName, header.getValue());
                }
            }

            connection.connect();

            // Get response from target
            int responseCode = connection.getResponseCode();
            String responseMessage = connection.getResponseMessage();

            Log.d(TAG, "Target response: " + responseCode + " " + responseMessage);

            // Send response status to client
            String statusLine = "HTTP/1.1 " + responseCode + " " + responseMessage + "\r\n";
            clientOutput.write(statusLine.getBytes());

            // Forward response headers
            Map<String, List<String>> responseHeaders = connection.getHeaderFields();
            for (Map.Entry<String, List<String>> entry : responseHeaders.entrySet()) {
                String headerName = entry.getKey();
                if (headerName != null) { // Skip status line
                    for (String headerValue : entry.getValue()) {
                        String headerLine = headerName + ": " + headerValue + "\r\n";
                        clientOutput.write(headerLine.getBytes());
                    }
                }
            }
            clientOutput.write("\r\n".getBytes());
            clientOutput.flush();

            // Stream response body
            InputStream targetInput = new BufferedInputStream(connection.getInputStream());
            byte[] streamBuffer = new byte[8192];
            int streamBytesRead;
            long totalBytes = 0;

            while ((streamBytesRead = targetInput.read(streamBuffer)) != -1) {
                clientOutput.write(streamBuffer, 0, streamBytesRead);
                clientOutput.flush();
                totalBytes += streamBytesRead;
            }

            Log.d(TAG, "Streamed " + totalBytes + " bytes to client");

            targetInput.close();
            connection.disconnect();

        } catch (Exception e) {
            Log.e(TAG, "Error handling connection", e);
        } finally {
            try {
                clientSocket.close();
            } catch (IOException e) {
                Log.e(TAG, "Error closing client socket", e);
            }
        }
    }

    private void stopProxyServer() {
        Log.d(TAG, "Stopping proxy server");
        isRunning = false;

        if (serverSocket != null) {
            try {
                serverSocket.close();
            } catch (IOException e) {
                Log.e(TAG, "Error closing server socket", e);
            }
            serverSocket = null;
        }

        if (executorService != null) {
            executorService.shutdownNow();
            executorService = null;
        }

        proxyPort = -1;
        Log.d(TAG, "Proxy server stopped");
    }

    @Override
    protected void handleOnDestroy() {
        stopProxyServer();
        super.handleOnDestroy();
    }
}


