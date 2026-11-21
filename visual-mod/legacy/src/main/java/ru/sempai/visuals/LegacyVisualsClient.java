package ru.sempai.visuals;

import net.fabricmc.api.ClientModInitializer;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.widget.ButtonWidget;
import org.lwjgl.input.Keyboard;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Properties;

public final class LegacyVisualsClient implements ClientModInitializer {
    private static final Properties OPTIONS = new Properties();
    private static boolean hudEnabled = true;
    private static boolean wasDown;
    private static String theme = "emerald";
    @Override public void onInitializeClient() {
        Path file = Paths.get("config", "sempai-visuals-client.properties");
        if (Files.isRegularFile(file)) try (java.io.InputStream input = Files.newInputStream(file)) { OPTIONS.load(input); } catch (IOException ignored) { }
        hudEnabled = Boolean.parseBoolean(OPTIONS.getProperty("effectsHud", "true"));
        refreshTheme();
    }
    public static void tick(MinecraftClient client) {
        refreshTheme();
        boolean down = Keyboard.isKeyDown(Keyboard.KEY_RSHIFT);
        if (down && !wasDown) client.setScreen(new VisualMenu(client.currentScreen));
        wasDown = down;
    }
    private static void refreshTheme() {
        Path file = Paths.get("config", "sempai-visuals.json");
        if (!Files.isRegularFile(file)) return;
        try { theme = new String(Files.readAllBytes(file), "UTF-8").contains("\"pink\"") ? "pink" : "emerald"; }
        catch (IOException ignored) { }
    }
    private static void save() {
        OPTIONS.setProperty("effectsHud", Boolean.toString(hudEnabled));
        Path file = Paths.get("config", "sempai-visuals-client.properties");
        try { Files.createDirectories(file.getParent()); try (java.io.OutputStream output = Files.newOutputStream(file)) { OPTIONS.store(output, "Sempai Visuals settings"); } }
        catch (IOException ignored) { }
    }
    public static boolean isHudEnabled() { return hudEnabled; }
    public static int accent() { return "pink".equals(theme) ? 0xFFFF6AAE : 0xFF54E6B1; }
    private static final class VisualMenu extends Screen {
        private final Screen parent;
        VisualMenu(Screen parent) { super(); this.parent = parent; }
        @Override public void init() {
            int cx = width / 2, y = height / 2 - 30;
            buttons.clear();
            buttons.add(new ButtonWidget(0, cx - 100, y, 200, 20, "Эффекты HUD: " + (hudEnabled ? "ВКЛ" : "ВЫКЛ")));
            buttons.add(new ButtonWidget(1, cx - 100, y + 26, 200, 20, "Закрыть"));
        }
        @Override protected void buttonClicked(ButtonWidget button) {
            if (button.id == 0) { hudEnabled = !hudEnabled; save(); init(); }
            else if (button.id == 1) closeMenu();
        }
        @Override protected void keyPressed(char character, int keyCode) {
            if (keyCode == 1) { closeMenu(); return; }
            super.keyPressed(character, keyCode);
        }
        @Override public void render(int mouseX, int mouseY, float delta) {
            fill(0, 0, width, height, 0xE6090C13);
            int cx = width / 2;
            fill(cx - 126, height / 2 - 74, cx + 126, height / 2 + 63, 0xF20C1118);
            drawCenteredString(textRenderer, "SEMPAI VISUALS", cx, height / 2 - 57, accent());
            drawCenteredString(textRenderer, "Тема синхронизируется с лаунчером", cx, height / 2 - 40, 0xFFB7BBC7);
            drawCenteredString(textRenderer, "Right Shift — открыть меню", cx, height / 2 + 45, 0xFF8C92A0);
            super.render(mouseX, mouseY, delta);
        }
        private void closeMenu() { save(); client.setScreen(parent); }
    }
}
