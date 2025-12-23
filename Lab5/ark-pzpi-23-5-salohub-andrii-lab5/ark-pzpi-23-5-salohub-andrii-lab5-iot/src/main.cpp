#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <WiFi.h>

const char *WIFI_SSID = "Wokwi-GUEST";
const char *WIFI_PASSWORD = "";
const char *SERVER_BASE_URL = "http://192.168.1.7:3000/api/iot";
const int ENGINE_BUTTON_PIN = 15;

struct DeviceConfig {
  String vin;
  unsigned long activeIntervalMs;
  unsigned long idleIntervalMs;
  float batteryLowThreshold;
  float fuelLowThreshold;
  float humidityHighThreshold;
  float smoothingAlphaFuel;
  float smoothingAlphaBattery;
  bool enabled;
};

struct SensorData {
  float fuelLevel;
  float humidity;
  float batteryVoltage;
  int mileage;
  bool engineRunning;
};

Preferences preferences;
DeviceConfig config;
SensorData currentData;

unsigned long lastTelemetrySend = 0;
unsigned long lastMileageUpdate = 0;
unsigned long lastSyncTime = 0;
const unsigned long SYNC_INTERVAL = 60000;

bool lastButtonState = HIGH;
bool isFirstSync = true;

float smoothData(float currentVal, float newVal, float alpha) {
  return (alpha * newVal) + ((1.0 - alpha) * currentVal);
}

void loadSettings() {
  preferences.begin("car-iot", false);

  config.vin = preferences.getString("vin", "ZACNJBBB1LPL49421");
  config.activeIntervalMs = preferences.getULong("activeMs", 10000);
  config.idleIntervalMs = preferences.getULong("idleMs", 1800000);
  config.batteryLowThreshold = preferences.getFloat("batThresh", 11.5);
  config.fuelLowThreshold = preferences.getFloat("fuelThresh", 10.0);
  config.humidityHighThreshold = preferences.getFloat("humThresh", 80.0);
  config.smoothingAlphaFuel = preferences.getFloat("alphaFuel", 0.1);
  config.smoothingAlphaBattery = preferences.getFloat("alphaBat", 0.3);
  config.enabled = preferences.getBool("enabled", true);

  currentData.mileage = preferences.getInt("mileage", 120000);
  currentData.fuelLevel = 85.0;
  currentData.batteryVoltage = 12.6;
  currentData.humidity = 40.0;
  currentData.engineRunning = false;

  Serial.println("--- IoT DEVICE CONFIGURATION LOADED ---");
  Serial.println("");
  Serial.println("Target VIN: " + config.vin);
  Serial.printf("Active Interval: %lu ms (%.1f sec)\n", config.activeIntervalMs,
                config.activeIntervalMs / 1000.0);
  Serial.printf("Idle Interval: %lu ms (%.1f min)\n", config.idleIntervalMs,
                config.idleIntervalMs / 60000.0);
  Serial.printf("Battery Threshold: %.2f V\n", config.batteryLowThreshold);
  Serial.printf("Fuel Threshold: %.1f%%\n", config.fuelLowThreshold);
  Serial.printf("Humidity Threshold: %.1f%%\n", config.humidityHighThreshold);
  Serial.printf("Smoothing: Fuel=%.2f, Battery=%.2f\n",
                config.smoothingAlphaFuel, config.smoothingAlphaBattery);
  Serial.printf("Status: %s\n", config.enabled ? "ENABLED" : "DISABLED");
  Serial.println("");
}

void saveSettings() {
  preferences.putString("vin", config.vin);
  preferences.putULong("activeMs", config.activeIntervalMs);
  preferences.putULong("idleMs", config.idleIntervalMs);
  preferences.putFloat("batThresh", config.batteryLowThreshold);
  preferences.putFloat("fuelThresh", config.fuelLowThreshold);
  preferences.putFloat("humThresh", config.humidityHighThreshold);
  preferences.putFloat("alphaFuel", config.smoothingAlphaFuel);
  preferences.putFloat("alphaBat", config.smoothingAlphaBattery);
  preferences.putBool("enabled", config.enabled);
  Serial.println("Configuration saved to Flash");
}

void updateSettingsFromServer(JsonObject serverConfig) {
  if (serverConfig.isNull()) {
    Serial.println("No server config received");
    return;
  }

  bool changed = false;

  String newVin = serverConfig["targetVin"] | "";
  if (newVin != "" && newVin != config.vin) {
    Serial.println("IDENTITY CHANGE: " + config.vin + " → " + newVin);
    config.vin = newVin;
    changed = true;
  }

  unsigned long activeMs = serverConfig["activeInterval"] | 0;
  if (activeMs > 0 && activeMs != config.activeIntervalMs) {
    Serial.printf("⏱️  Active interval: %lu → %lu ms\n", config.activeIntervalMs,
                  activeMs);
    config.activeIntervalMs = activeMs;
    changed = true;
  }

  unsigned long idleMs = serverConfig["idleInterval"] | 0;
  if (idleMs > 0 && idleMs != config.idleIntervalMs) {
    Serial.printf("Idle interval: %lu → %lu ms\n", config.idleIntervalMs,
                  idleMs);
    config.idleIntervalMs = idleMs;
    changed = true;
  }

  float batThresh = serverConfig["batteryLowThreshold"] | 0.0;
  if (batThresh > 0 && abs(batThresh - config.batteryLowThreshold) > 0.01) {
    Serial.printf("Battery threshold: %.2f → %.2f V\n",
                  config.batteryLowThreshold, batThresh);
    config.batteryLowThreshold = batThresh;
    changed = true;
  }

  float fuelThresh = serverConfig["fuelLowThreshold"] | 0.0;
  if (fuelThresh > 0 && abs(fuelThresh - config.fuelLowThreshold) > 0.1) {
    Serial.printf("⛽ Fuel threshold: %.1f → %.1f%%\n", config.fuelLowThreshold,
                  fuelThresh);
    config.fuelLowThreshold = fuelThresh;
    changed = true;
  }

  float humThresh = serverConfig["humidityHighThreshold"] | 0.0;
  if (humThresh > 0 && abs(humThresh - config.humidityHighThreshold) > 0.1) {
    Serial.printf("Humidity threshold: %.1f → %.1f%%\n",
                  config.humidityHighThreshold, humThresh);
    config.humidityHighThreshold = humThresh;
    changed = true;
  }

  JsonObject smoothing = serverConfig["smoothing"];
  if (!smoothing.isNull()) {
    float alphaFuel = smoothing["fuel"] | 0.0;
    if (alphaFuel > 0 && abs(alphaFuel - config.smoothingAlphaFuel) > 0.01) {
      Serial.printf("Fuel smoothing: %.2f → %.2f\n", config.smoothingAlphaFuel,
                    alphaFuel);
      config.smoothingAlphaFuel = alphaFuel;
      changed = true;
    }

    float alphaBat = smoothing["battery"] | 0.0;
    if (alphaBat > 0 && abs(alphaBat - config.smoothingAlphaBattery) > 0.01) {
      Serial.printf("Battery smoothing: %.2f → %.2f\n",
                    config.smoothingAlphaBattery, alphaBat);
      config.smoothingAlphaBattery = alphaBat;
      changed = true;
    }
  }

  if (serverConfig.containsKey("enabled")) {
    bool enabled = serverConfig["enabled"];
    if (enabled != config.enabled) {
      Serial.printf("Device status: %s → %s\n",
                    config.enabled ? "ENABLED" : "DISABLED",
                    enabled ? "ENABLED" : "DISABLED");
      config.enabled = enabled;
      changed = true;
    }
  }

  if (changed) {
    saveSettings();
    Serial.println("Configuration updated from server\n");
  } else {
    Serial.println("No configuration changes\n");
  }
}

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED)
    return;

  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected");
    Serial.println("IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("\nWiFi Connection Failed");
  }
}

void syncWithServer() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Can't sync: No WiFi");
    return;
  }

  WiFiClient client;
  HTTPClient http;

  String url = String(SERVER_BASE_URL) + "/sync/" + config.vin;

  if (isFirstSync) {
    Serial.println("--- FIRST SYNC WITH SERVER ---");
  }

  Serial.println("GET " + url);

  if (http.begin(client, url)) {
    int httpCode = http.GET();

    if (httpCode == 200) {
      String payload = http.getString();
      DynamicJsonDocument doc(4096);
      DeserializationError error = deserializeJson(doc, payload);

      if (error) {
        Serial.println("JSON Parse Error: " + String(error.c_str()));
        http.end();
        return;
      }

      if (doc["success"] == true) {
        JsonObject data = doc["data"];

        String serverVin = data["vin"] | "";
        if (serverVin != "" && serverVin != config.vin) {
          Serial.println("Server knows this device as: " + serverVin);
        }

        int serverMileage = data["currentMileage"] | 0;
        if (serverMileage > currentData.mileage) {
          Serial.printf("Odometer sync: %d → %d km\n", currentData.mileage,
                        serverMileage);
          currentData.mileage = serverMileage;
          preferences.putInt("mileage", currentData.mileage);
        }

        JsonObject serverConfig = data["config"];
        if (!serverConfig.isNull()) {
          Serial.println("\nReceiving configuration from server:");
          updateSettingsFromServer(serverConfig);
        }

        Serial.println("Sync completed successfully\n");
        isFirstSync = false;

      } else {
        Serial.println("Server returned error");
      }

    } else if (httpCode == 404) {
      Serial.println("CRITICAL: Car with VIN " + config.vin +
                     " not found in database!");
      Serial.println("Please register this VIN in the system first");
    } else {
      Serial.printf("Sync failed. HTTP %d\n", httpCode);
    }

    http.end();
  } else {
    Serial.println("HTTP connection failed");
  }
}

void sendTelemetry(String eventType) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Can't send: No WiFi");
    return;
  }

  if (!config.enabled) {
    Serial.println("Device disabled, skipping telemetry");
    return;
  }

  WiFiClient client;
  HTTPClient http;
  String url = String(SERVER_BASE_URL) + "/telemetry";

  DynamicJsonDocument doc(1024);
  doc["vin"] = config.vin;
  doc["mileage"] = currentData.mileage;
  doc["fuelLevel"] = currentData.fuelLevel;
  doc["humidity"] = currentData.humidity;
  doc["batteryVoltage"] = currentData.batteryVoltage;
  doc["engineRunning"] = currentData.engineRunning;
  doc["eventType"] = eventType;

  if (currentData.batteryVoltage < config.batteryLowThreshold) {
    doc["alert"] = "LOW_BATTERY_WARNING";
    Serial.println("Alert: Battery voltage low!");
  }

  if (currentData.fuelLevel < config.fuelLowThreshold) {
    doc["alert"] = "LOW_FUEL_WARNING";
    Serial.println("Alert: Fuel level low!");
  }

  if (currentData.humidity > config.humidityHighThreshold) {
    doc["alert"] = "HIGH_HUMIDITY_WARNING";
    Serial.println("Alert: High humidity detected!");
  }

  String jsonData;
  serializeJson(doc, jsonData);

  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");

  Serial.println("POST " + url);
  Serial.println(jsonData);

  int httpCode = http.POST(jsonData);

  if (httpCode == 200) {
    Serial.println("Telemetry sent (" + eventType + ")\n");
  } else {
    Serial.printf("Send failed: HTTP %d\n\n", httpCode);
  }

  http.end();
}

void simulateSensors() {
  static unsigned long lastSim = 0;
  if (millis() - lastSim < 1000)
    return;
  lastSim = millis();

  float rawFuel = currentData.fuelLevel;
  if (currentData.engineRunning && rawFuel > 0) {
    rawFuel -= 0.02;
  }

  float rawVoltage = currentData.engineRunning ? (14.2 + random(-5, 5) / 10.0)
                                               : (12.5 - random(0, 5) / 100.0);

  float rawHumidity = 50.0 + random(-100, 100) / 10.0;

  currentData.fuelLevel =
      smoothData(currentData.fuelLevel, rawFuel, config.smoothingAlphaFuel);
  if (currentData.fuelLevel < 0)
    currentData.fuelLevel = 0;

  currentData.batteryVoltage = smoothData(
      currentData.batteryVoltage, rawVoltage, config.smoothingAlphaBattery);

  currentData.humidity = rawHumidity;

  if (currentData.engineRunning && (millis() - lastMileageUpdate >= 30000)) {
    currentData.mileage += 1;
    preferences.putInt("mileage", currentData.mileage);
    Serial.printf("Driving... Odometer: %d km\n", currentData.mileage);
    lastMileageUpdate = millis();
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(ENGINE_BUTTON_PIN, INPUT_PULLUP);

  loadSettings();
  connectWiFi();

  syncWithServer();

  Serial.println("System ready!\n");
}

void loop() {
  connectWiFi();
  unsigned long currentTime = millis();

  bool btnState = digitalRead(ENGINE_BUTTON_PIN);
  if (lastButtonState == HIGH && btnState == LOW) {
    currentData.engineRunning = !currentData.engineRunning;

    String event = currentData.engineRunning ? "engine_start" : "engine_stop";
    String emoji = currentData.engineRunning ? "RUNNING" : "OFF";

    String eventUpper = event;
    eventUpper.toUpperCase();

    Serial.println("\n" + emoji + " EVENT: " + eventUpper);

    sendTelemetry(event);
    lastTelemetrySend = currentTime;

    delay(200);
  }
  lastButtonState = btnState;

  simulateSensors();

  unsigned long interval = currentData.engineRunning ? config.activeIntervalMs
                                                     : config.idleIntervalMs;

  if (currentTime - lastTelemetrySend >= interval) {
    Serial.println("\nPeriodic telemetry send");
    Serial.printf(
        "Mileage: %d km | Fuel: %.1f%% | Battery: %.2fV | Humidity: %.1f%%\n",
        currentData.mileage, currentData.fuelLevel, currentData.batteryVoltage,
        currentData.humidity);

    sendTelemetry("periodic");
    lastTelemetrySend = currentTime;
  }

  if (currentTime - lastSyncTime >= SYNC_INTERVAL) {
    Serial.println("\nConfiguration sync check...");
    syncWithServer();
    lastSyncTime = currentTime;
  }

  delay(50);
}
