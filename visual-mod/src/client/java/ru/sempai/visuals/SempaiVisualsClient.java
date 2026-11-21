package ru.sempai.visuals;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keymapping.v1.KeyMappingHelper;
import net.fabricmc.fabric.api.client.rendering.v1.hud.HudElementRegistry;
import net.fabricmc.fabric.api.client.screen.v1.ScreenEvents;
import net.minecraft.client.KeyMapping;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.screens.TitleScreen;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.multiplayer.PlayerInfo;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.Identifier;
import com.mojang.blaze3d.platform.InputConstants;
import net.fabricmc.loader.api.FabricLoader;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Properties;

public final class SempaiVisualsClient implements ClientModInitializer {
    private static final String MOD_ID = "sempai_visuals";
    private static final Properties OPTIONS = new Properties();
    private static Path optionsFile;
    private static String theme = "emerald";
    private static long nextThemeCheckAt;
    private static Screen pendingTitleMenu;
    private static KeyMapping openMenu;
    private static boolean effectsHud = true;
    private static boolean compactHud = true;
    private static boolean compactTab = true;

    @Override
    public void onInitializeClient() {
        Path config = FabricLoader.getInstance().getConfigDir();
        optionsFile = config.resolve("sempai-visuals-client.properties");
        loadOptions();
        refreshTheme();

        KeyMapping.Category category = KeyMapping.Category.register(Identifier.fromNamespaceAndPath(MOD_ID, "main"));
        openMenu = KeyMappingHelper.registerKeyMapping(new KeyMapping(
                "key.sempai_visuals.open_menu", InputConstants.KEY_RSHIFT, category));

        ClientTickEvents.END_CLIENT_TICK.register(client -> {
            refreshTheme();
            if (pendingTitleMenu != null) {
                Screen current = currentScreen(client);
                if (current == pendingTitleMenu) {
                    Screen parent = pendingTitleMenu;
                    pendingTitleMenu = null;
                    setCurrentScreen(client, new VisualMenu(parent));
                    releaseCursor(client);
                    while (openMenu.consumeClick()) { }
                    return;
                }
                if (current != null) pendingTitleMenu = null;
            }
            while (openMenu.consumeClick()) {
                openVisualMenu(client);
            }
        });

        HudElementRegistry.addLast(Identifier.fromNamespaceAndPath(MOD_ID, "effects"), (graphics, delta) -> {
            Minecraft client = Minecraft.getInstance();
            if (!effectsHud || client.player == null || isHudHidden(client) || client.player.getActiveEffects().isEmpty()) return;
            int visibleEffects = Math.min(client.player.getActiveEffects().size(), 11);
            int y = 12;
            int accent = accentColor();
            graphics.fill(8, 8, 142, 18 + visibleEffects * 12, 0x990A1015);
            graphics.fill(8, 8, 10, 18 + visibleEffects * 12, accent);
            graphics.text(client.font, "SEMPAI  |  EFFECTS", 15, y, accent, false);
            y += 13;
            for (var effect : client.player.getActiveEffects()) {
                String name = effect.getEffect().value().getDisplayName().getString();
                int seconds = Math.max(0, effect.getDuration() / 20);
                String duration = String.format(Locale.ROOT, "%d:%02d", seconds / 60, seconds % 60);
                if (!compactHud) name += " " + Component.translatable("potion.potency." + effect.getAmplifier()).getString();
                graphics.text(client.font, name + "  " + duration, 15, y, 0xFFE6E6EE, false);
                y += 12;
                if (y > 150) break;
            }
        });

        ScreenEvents.AFTER_INIT.register((client, screen, width, height) -> {
            if (screen instanceof TitleScreen) pendingTitleMenu = screen;
        });
    }

    private static void openVisualMenu(Minecraft client) {
        Screen current = currentScreen(client);
        setCurrentScreen(client, new VisualMenu(current));
        releaseCursor(client);
    }

    private static void releaseCursor(Minecraft client) {
        try {
            var field = Minecraft.class.getDeclaredField("mouseHandler");
            field.setAccessible(true);
            Object handler = field.get(client);
            handler.getClass().getMethod("releaseMouse").invoke(handler);
        } catch (ReflectiveOperationException ignored) { }
    }

    private static void refreshTheme() {
        long now = System.currentTimeMillis();
        if (now < nextThemeCheckAt) return;
        nextThemeCheckAt = now + 1000;
        Path launcherConfig = FabricLoader.getInstance().getConfigDir().resolve("sempai-visuals.json");
        if (!Files.isRegularFile(launcherConfig)) return;
        try {
            JsonObject json = JsonParser.parseString(Files.readString(launcherConfig)).getAsJsonObject();
            if (json.has("theme")) theme = "pink".equals(json.get("theme").getAsString()) ? "pink" : "emerald";
        } catch (Exception ignored) {
            // Keep the last valid theme if the launcher is writing the file.
        }
    }

    private static int accentColor() { return "pink".equals(theme) ? 0xFFFF6AAE : 0xFF54E6B1; }
    private static boolean effectsHud() { return effectsHud; }
    public static boolean compactTabEnabled() { return compactTab; }

    private static Screen currentScreen(Minecraft client) {
        try {
            Object screen = client.gui.getClass().getMethod("screen").invoke(client.gui);
            if (screen instanceof Screen value) return value;
        } catch (ReflectiveOperationException ignored) { }
        try {
            var field = Minecraft.class.getDeclaredField("screen");
            field.setAccessible(true);
            Object screen = field.get(client);
            if (screen instanceof Screen value) return value;
        } catch (ReflectiveOperationException ignored) { }
        return null;
    }

    private static void setCurrentScreen(Minecraft client, Screen screen) {
        try {
            Minecraft.class.getMethod("setScreen", Screen.class).invoke(client, screen);
            return;
        } catch (ReflectiveOperationException ignored) { }
        try {
            client.gui.getClass().getMethod("setScreen", Screen.class).invoke(client.gui, screen);
        } catch (ReflectiveOperationException ignored) { }
    }

    private static boolean isHudHidden(Minecraft client) {
        try {
            Object hud = client.gui.getClass().getField("hud").get(client.gui);
            return Boolean.TRUE.equals(hud.getClass().getMethod("isHidden").invoke(hud));
        } catch (ReflectiveOperationException ignored) { return false; }
    }

    public static void drawCompactTab(net.minecraft.client.gui.GuiGraphicsExtractor graphics) {
        Minecraft client = Minecraft.getInstance();
        if (client.getConnection() == null) return;
        var players = client.getConnection().getOnlinePlayers().stream()
                .sorted(java.util.Comparator.comparing(info -> info.getProfile().name(), String.CASE_INSENSITIVE_ORDER))
                .limit(36).toList();
        int columns = players.size() > 18 ? 2 : 1;
        int rows = Math.max(1, (players.size() + columns - 1) / columns);
        int colWidth = columns == 2 ? 150 : 190;
        int width = columns * colWidth + 16;
        int left = (client.getWindow().getGuiScaledWidth() - width) / 2;
        int top = Math.max(10, (client.getWindow().getGuiScaledHeight() - rows * 12 - 44) / 2);
        int accent = accentColor();
        graphics.fill(left, top, left + width, top + rows * 12 + 40, 0xE60C1118);
        graphics.outline(left, top, width, rows * 12 + 40, accent);
        graphics.text(client.font, "SEMPAI  •  " + players.size() + " ИГРОКОВ", left + 9, top + 7, accent, false);
        for (int i = 0; i < players.size(); i++) {
            PlayerInfo info = players.get(i);
            int col = i / rows;
            int row = i % rows;
            int x = left + 9 + col * colWidth;
            int y = top + 22 + row * 12;
            graphics.text(client.font, info.getProfile().name(), x, y, 0xFFE8EAF0, false);
            graphics.text(client.font, info.getLatency() + " ms", x + colWidth - 40, y, 0xFF9BA3AF, false);
        }
        graphics.text(client.font, "Tab — закрыть", left + 9, top + rows * 12 + 25, 0xFF9BA3AF, false);
    }
    private static void loadOptions() {
        if (Files.isRegularFile(optionsFile)) {
            try (var input = Files.newInputStream(optionsFile)) { OPTIONS.load(input); } catch (IOException ignored) { }
        }
        effectsHud = Boolean.parseBoolean(OPTIONS.getProperty("effectsHud", "true"));
        compactHud = Boolean.parseBoolean(OPTIONS.getProperty("compactHud", "true"));
        compactTab = Boolean.parseBoolean(OPTIONS.getProperty("compactTab", "true"));
    }

    private static void saveOptions() {
        OPTIONS.setProperty("effectsHud", Boolean.toString(effectsHud));
        OPTIONS.setProperty("compactHud", Boolean.toString(compactHud));
        OPTIONS.setProperty("compactTab", Boolean.toString(compactTab));
        try (var output = Files.newOutputStream(optionsFile)) { OPTIONS.store(output, "Sempai Visuals settings"); } catch (IOException ignored) { }
    }

    private static final class VisualMenu extends Screen {
        private final Screen parent;
        private VisualMenu(Screen parent) { super(Component.literal("Sempai Visuals")); this.parent = parent; }

        @Override protected void init() {
            int cx = width / 2;
            int top = height / 2 - 42;
            addRenderableWidget(toggle("Эффекты на HUD", () -> effectsHud, value -> effectsHud = value, cx, top));
            addRenderableWidget(toggle("Компактный список эффектов", () -> compactHud, value -> compactHud = value, cx, top + 24));
            addRenderableWidget(toggle("Компактный таб игроков", () -> compactTab, value -> compactTab = value, cx, top + 48));
            addRenderableWidget(Button.builder(Component.literal("Закрыть"), button -> onClose()).bounds(cx - 100, top + 72, 200, 20).build());
        }

        private Button toggle(String name, java.util.function.BooleanSupplier get, java.util.function.Consumer<Boolean> set, int x, int y) {
            return Button.builder(Component.literal(name + ": " + (get.getAsBoolean() ? "ВКЛ" : "ВЫКЛ")), button -> {
                set.accept(!get.getAsBoolean());
                button.setMessage(Component.literal(name + ": " + (get.getAsBoolean() ? "ВКЛ" : "ВЫКЛ")));
                saveOptions();
                clearWidgets();
                init();
            }).bounds(x - 100, y, 200, 20).build();
        }

        @Override public void extractBackground(net.minecraft.client.gui.GuiGraphicsExtractor graphics, int mouseX, int mouseY, float delta) {
            graphics.fill(0, 0, width, height, 0xFF090C13);
            int cx = width / 2;
            int accent = accentColor();
            graphics.fill(cx - 124, height / 2 - 86, cx + 124, height / 2 + 112, 0xF20C1118);
            graphics.outline(cx - 124, height / 2 - 86, 248, 198, accent);
            graphics.text(font, "SEMPAI VISUALS", cx - 57, height / 2 - 72, accent, false);
            graphics.text(font, "Тема синхронизируется с лаунчером", cx - 91, height / 2 - 56, 0xFFB7BBC7, false);
            graphics.text(font, "Right Shift — открыть меню", cx - 75, height / 2 + 70, 0xFF8C92A0, false);
        }

        @Override public void onClose() { saveOptions(); setCurrentScreen(minecraft, parent); }
    }
}
