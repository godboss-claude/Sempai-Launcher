# Sempai Visuals

Client-side Fabric mod for Sempai Launcher. Its menu opens with Right Shift; the Minecraft title screen opens the themed panel on first entry. Features include active-effect HUD, compact effect list, and compact player list with ping while holding Tab.

The launcher theme is read from `config/sempai-visuals.json`. Each supported game version has a separately compiled JAR. The launcher gives Fabric a per-version mods directory so incompatible mods do not collide across game versions.

Built release variants are Minecraft 1.12.2 (Legacy Fabric), 26.1, 26.1.1, 26.1.2, 26.2, and 26.3. The 1.12.2 port opens the themed settings screen with Right Shift and returns mouse control to the screen; Minecraft itself hides the cursor during normal gameplay. Build the modern matrix with `build-matrix.ps1` using JDK 25; build the Legacy Fabric port with `gradlew.bat -p legacy build` using JDK 21 or newer.
