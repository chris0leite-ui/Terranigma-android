pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\.android.*")
                includeGroupByRegex("com\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "Terranigma"
include(":core")

// :app requires the Android SDK — include it only when the SDK is present
// (GitHub Actions sets ANDROID_HOME; local dev without SDK still runs :core tests)
val androidHome = System.getenv("ANDROID_HOME") ?: ""
if (androidHome.isNotEmpty()) {
    include(":app")
}
