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

// :app is only included when explicitly requested via BUILD_ANDROID=true.
// The test job leaves this unset; only the build-apk job sets it.
// This keeps :core tests fast and independent of the Android SDK.
if (System.getenv("BUILD_ANDROID") == "true") {
    include(":app")
}
