plugins {
    id("com.android.application") version "8.2.2"
    kotlin("android") version "2.0.21"
}

android {
    namespace = "com.terranigma"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.terranigma"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "0.1.0"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    kotlinOptions {
        jvmTarget = "11"
    }
}

dependencies {
    implementation(project(":core"))
    implementation("androidx.appcompat:appcompat:1.7.0")
}
