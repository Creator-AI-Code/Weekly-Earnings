plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

val runNumber = (System.getenv("GITHUB_RUN_NUMBER") ?: "1").toInt()

android {
    namespace = "app.momentum.next"
    compileSdk = 35

    defaultConfig {
        // a different id from the Capacitor app, so both install side by side until the native one reaches parity
        applicationId = "app.momentum.next"
        minSdk = 26
        targetSdk = 35
        versionCode = runNumber
        versionName = "3.0.0-alpha.$runNumber"
    }
    signingConfigs {
        // the same committed key as the Capacitor app: every CI build installs over the previous one
        getByName("debug") {
            storeFile = file("../../android-app/momentum-debug.jks")
            storePassword = "android"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
        }
    }
    buildTypes { debug { signingConfig = signingConfigs.getByName("debug") } }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures { compose = true }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2024.12.01"))
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-core")
}
