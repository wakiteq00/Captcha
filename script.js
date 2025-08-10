const tg = window.Telegram.WebApp;
tg.expand();

// Stats datas
let stats = {
  today: 0,
  yesterday: 0,
  total: 0,
  online: 0
};

// Get webhook URL from query parameters
function getWebhookUrl() {
  try {
    return new URLSearchParams(window.location.search).get("webhook");
  } catch (e) {
    console.error("Error parsing webhook URL:", e);
    return null;
  }
}

// Get browser fingerprint
async function getFingerprint() {
  try {
    if (!window.FingerprintJS) {
      console.log("FingerprintJS not available");
      return null;
    }
    const fp = await FingerprintJS.load();
    const { visitorId } = await fp.get();
    return visitorId || null;
  } catch (err) {
    console.error("Fingerprint error:", err);
    return null;
  }
}

// Load stats from API
async function loadStats() {
  try {
    const response = await fetch('/api/stats');
    if (response.ok) {
      const data = await response.json();
      stats = data;
      updateStatsDisplay();
    }
  } catch (err) {
    console.error("Error loading stats:", err);
  }
}

// Update the TV screen with stats
function updateStatsDisplay() {
  const statsBox = document.getElementById("statsBox");
  if (statsBox) {
    statsBox.innerHTML = `
      📊 Today: ${stats.today}<br>
      📅 Yesterday: ${stats.yesterday}<br>
      🔢 Total: ${stats.total}<br>
      🔌 Online: ${stats.online}
    `;
  }
}

// Main verification handler
async function handleVerification() {
  const verifyBtn = document.getElementById("verifyBtn");
  if (verifyBtn) verifyBtn.disabled = true;

  const userId = tg.initDataUnsafe?.user?.id;
  if (!userId) {
    showMessage("❌ Telegram session invalid");
    if (verifyBtn) verifyBtn.disabled = false;
    return;
  }

  showMessage("🔍 Running security checks...");

  try {
    const fingerprint = await getFingerprint();
    const apiUrl = `https://premium-security.onrender.com/api/onWebhook?user_id=${userId}&bot_token=${encodeURIComponent(tg.initData)}&fingerprint=${fingerprint || ''}`;
    
    let response;
    try {
      response = await Promise.race([
        fetch(apiUrl, { headers: { 'X-API-KEY': 'papa' } }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 8000))
      ]);
    } catch (fetchError) {
      console.error("API fetch error:", fetchError);
      throw new Error("Connection timeout. Please try again.");
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      showMessage("❌ Error: " + (data.error || "Verification failed"));
      if (verifyBtn) verifyBtn.disabled = false;
      return;
    }

    // Prepare verification payload
    const payload = {
      status: "completed",
      verification_data: data,
      telegram_id: userId,
      username: tg.initDataUnsafe.user?.username || "no_username"
    };

    // Send to webhook URL if available
    const webhookUrl = getWebhookUrl();
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        // Send data to Telegram (closes web app)
        tg.sendData(JSON.stringify(payload));

        setTimeout(() => {
          try {
            tg.close();
          } catch (closeError) {
            console.error("Error closing WebApp:", closeError);
          }
        }, 1200);
      } catch (webhookError) {
        console.error("Webhook delivery failed:", webhookError);
        showMessage("❌ Verification delivery failed to bot.");
        if (verifyBtn) verifyBtn.disabled = false;
        return;
      }
    } else {
      showMessage("❌ Webhook missing");
      if (verifyBtn) verifyBtn.disabled = false;
      return;
    }

    // Refresh stats after verification
    await loadStats();

    if (data.flags.vpn || data.flags.multi_account) {
      showMessage(data.flags.vpn ? "⚠️ VPN Detected" : "⚠️ Suspicious Activity");
    } else {
      showMessage("✅ Verification Complete");
    }

  } catch (err) {
    console.error("Verification error:", err);
    showMessage(err.message || "🌐 Connection Error - Try Again");
    if (verifyBtn) verifyBtn.disabled = false;
  }
}

// Display messages to user
function showMessage(msg) {
  try {
    const div = document.getElementById("message");
    if (div) {
      div.textContent = msg;
      div.classList.remove("hidden");
    }
  } catch (e) {
    console.error("Error showing message:", e);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  try {
    const verifyBtn = document.getElementById("verifyBtn");
    if (verifyBtn) {
      verifyBtn.addEventListener("click", handleVerification);
    }
    
    if (window.FingerprintJS) {
      FingerprintJS.load().catch(e => console.log("FingerprintJS preload failed:", e));
    }
    
    // Load stats on page load
    loadStats();
    // Refresh stats every 30 seconds
    setInterval(loadStats, 30000);
  } catch (initError) {
    console.error("Initialization error:", initError);
  }
});
