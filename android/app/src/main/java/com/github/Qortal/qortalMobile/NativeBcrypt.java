package com.github.Qortal.qortalMobile;

import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.ThreadFactory;
import android.os.Process;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.mindrot.jbcrypt.BCrypt;

@CapacitorPlugin(name = "NativeBcrypt")
public class NativeBcrypt extends Plugin {
    // Use a fixed thread pool with the number of CPU cores
    private final ExecutorService executor = Executors.newFixedThreadPool(
        Runtime.getRuntime().availableProcessors(),
        new ThreadFactory() {
            @Override
            public Thread newThread(Runnable r) {
                Thread thread = new Thread(r);
                thread.setPriority(Thread.MAX_PRIORITY); // Set thread priority to high
                return thread;
            }
        }
    );

    @PluginMethod
    public void hashPassword(PluginCall call) {
        String password = call.getString("password");
        String salt = call.getString("salt");

        if (password == null || salt == null) {
            call.reject("Password or salt is missing");
            return;
        }

        executor.execute(() -> {
            try {
                // Perform bcrypt hashing
                String hash = BCrypt.hashpw(password, salt);

                // Prepare the result
                JSObject result = new JSObject();
                result.put("hash", hash);

                // Resolve the call on the main thread
                getActivity().runOnUiThread(() -> call.resolve(result));
            } catch (Exception e) {
                // Reject the call on the main thread in case of an error
                getActivity().runOnUiThread(() -> call.reject("Hashing failed: " + e.getMessage()));
            }
        });
    }

    @Override
    public void handleOnDestroy() {
        super.handleOnDestroy();
        executor.shutdown(); // Shutdown the executor to release resources
    }
}
