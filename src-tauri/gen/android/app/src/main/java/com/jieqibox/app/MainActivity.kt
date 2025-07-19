package com.jieqibox.app

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.DocumentsContract
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.documentfile.provider.DocumentFile
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream

class MainActivity : TauriActivity() {
    
    private val TAG = "MainActivity"
    private var webView: WebView? = null
    
    // Activity result launcher for SAF file selection
    private val safFileSelectionLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val data = result.data
            if (data != null) {
                val uri = data.data
                if (uri != null) {
                    handleSafFileSelection(uri)
                } else {
                    Log.e(TAG, "No URI returned from SAF file selection")
                    sendSafFileResult("", "", "No URI returned")
                }
            } else {
                Log.e(TAG, "No data returned from SAF file selection")
                sendSafFileResult("", "", "No data returned")
            }
        } else {
            Log.e(TAG, "SAF file selection cancelled or failed")
            sendSafFileResult("", "", "File selection cancelled")
        }
    }
    
    override fun onWebViewCreate(webView: WebView) {
        super.onWebViewCreate(webView)
        this.webView = webView
        webView.addJavascriptInterface(SafFileInterface(), "SafFileInterface")
    }
    
    // JavaScript interface for SAF file selection
    inner class SafFileInterface {
        @JavascriptInterface
        fun startFileSelection() {
            Log.d(TAG, "Received SAF file selection request from JavaScript")
            runOnUiThread {
                this@MainActivity.requestSafFileSelection()
            }
        }
    }
    
    private fun requestSafFileSelection() {
        try {
            val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE)
                type = "*/*" // Allow all file types for engine files
                putExtra(Intent.EXTRA_TITLE, "Select Engine File")
            }
            
            safFileSelectionLauncher.launch(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to launch SAF file selection", e)
            sendSafFileResult("", "", "Failed to launch file selector: ${e.message}")
        }
    }
    
    private fun handleSafFileSelection(uri: Uri) {
        try {
            Log.d(TAG, "Handling SAF file selection: $uri")
            
            // Get file information
            val documentFile = DocumentFile.fromSingleUri(this, uri)
            if (documentFile == null) {
                Log.e(TAG, "Failed to create DocumentFile from URI")
                sendSafFileResult("", "", "Failed to access selected file")
                return
            }
            
            val filename = documentFile.name ?: "unknown_engine"
            Log.d(TAG, "Selected file: $filename")
            
            // Copy file to internal storage
            val internalPath = copyFileToInternalStorage(uri, filename)
            if (internalPath.isNotEmpty()) {
                Log.d(TAG, "Successfully copied file to: $internalPath")
                sendSafFileResult(uri.toString(), filename, internalPath)
            } else {
                Log.e(TAG, "Failed to copy file to internal storage")
                sendSafFileResult("", "", "Failed to copy file to internal storage")
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error handling SAF file selection", e)
            sendSafFileResult("", "", "Error processing file: ${e.message}")
        }
    }
    
    private fun copyFileToInternalStorage(uri: Uri, filename: String): String {
        try {
            // Get internal storage directory
            val internalDir = File(filesDir, "engines")
            if (!internalDir.exists()) {
                internalDir.mkdirs()
            }
            
            val destFile = File(internalDir, filename)
            Log.d(TAG, "Copying file to: ${destFile.absolutePath}")
            
            // Copy file content
            contentResolver.openInputStream(uri)?.use { inputStream ->
                FileOutputStream(destFile).use { outputStream ->
                    inputStream.copyTo(outputStream)
                }
            }
            
            // Set executable permissions
            destFile.setExecutable(true)
            
            return destFile.absolutePath
            
        } catch (e: Exception) {
            Log.e(TAG, "Error copying file to internal storage", e)
            return ""
        }
    }
    
    private fun sendSafFileResult(uri: String, filename: String, result: String) {
        try {
            // Send result back to JavaScript
            val jsCode = "window.dispatchEvent(new CustomEvent('saf-file-result', { detail: { uri: '$uri', filename: '$filename', result: '$result' } }));"
            runOnUiThread {
                webView?.evaluateJavascript(jsCode, null)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error sending SAF file result to JavaScript", e)
        }
    }
}