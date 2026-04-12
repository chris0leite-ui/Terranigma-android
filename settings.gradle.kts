pluginManagement {
    repositories {
        google { content {
            includeGroupByRegex("com\\.android.*")
            includeGroupByRegex("com\\.google.*")
            includeGroupByRegex("androidx.*")
        }}
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories { google(); mavenCentral() }
}
rootProject.name = "Terranigma"
include(":core")
if (System.getenv("BUILD_ANDROID") == "true") include(":app")
