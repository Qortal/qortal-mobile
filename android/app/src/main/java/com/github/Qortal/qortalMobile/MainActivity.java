package com.github.Qortal.qortalMobile;

import com.getcapacitor.BridgeActivity;
import com.github.Qortal.qortalMobile.NativeBcrypt;
import com.github.Qortal.qortalMobile.NativePOW;
import com.github.Qortal.qortalMobile.FileWriter;
import com.github.Qortal.qortalMobile.EncryptedMediaServerPlugin;
import com.github.Qortal.qortalMobile.ChromecastPlugin;
import com.github.Qortal.qortalMobile.NetworkInfoPlugin;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeBcrypt.class);
        registerPlugin(NativePOW.class);
        registerPlugin(FileWriter.class);
        registerPlugin(EncryptedMediaServerPlugin.class);
        registerPlugin(ChromecastPlugin.class);
        registerPlugin(NetworkInfoPlugin.class);
        super.onCreate(savedInstanceState);

        // ✅ Enable mixed content mode for WebView
        WebView webView = this.bridge.getWebView();
        WebSettings webSettings = webView.getSettings();
        webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        webSettings.setMediaPlaybackRequiresUserGesture(false);
    }
}
