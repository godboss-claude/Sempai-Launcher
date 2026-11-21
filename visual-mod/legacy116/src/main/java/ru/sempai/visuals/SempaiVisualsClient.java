package ru.sempai.visuals;

import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keybinding.v1.KeyBindingHelper;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.client.option.KeyBinding;
import net.minecraft.client.util.InputUtil;
import net.minecraft.client.util.math.MatrixStack;
import net.minecraft.text.Text;
import org.lwjgl.glfw.GLFW;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Properties;

public final class SempaiVisualsClient implements ClientModInitializer {
    private static final Properties OPTIONS = new Properties();
    private static Path optionsFile;
    private static KeyBinding openMenu;
    private static String theme = "emerald";
    private static long nextThemeCheckAt;
    private static boolean effectsHud = true;
    private static boolean compactHud = true;
    private static boolean compactTab = true;

    @Override
    public void onInitializeClient() {
        optionsFile = Paths.get(FabricLoader.getInstance().getConfigDirectory().getPath(), "sempai-visuals-client.properties");
        loadOptions();
        openMenu = KeyBindingHelper.registerKeyBinding(new KeyBinding(
                "key.sempai_visuals.open_menu", InputUtil.Type.KEYSYM, GLFW.GLFW_KEY_RIGHT_SHIFT,
                "category.sempai_visuals"));
        ClientTickEvents.END_CLIENT_TICK.register(client -> {
            refreshTheme();
            while (openMenu.wasPressed()) {
                if (client.currentScreen instanceof VisualMenu) client.openScreen(null);
                else client.openScreen(new VisualMenu(client.currentScreen));
            }
        });
    }

    private static void refreshTheme() {
        long now = System.currentTimeMillis();
        if (now < nextThemeCheckAt) return;
        nextThemeCheckAt = now + 1000;
        Path file = Paths.get(FabricLoader.getInstance().getConfigDirectory().getPath(), "sempai-visuals.json");
        if (!Files.isRegularFile(file)) return;
        try {
            String json = new String(Files.readAllBytes(file), StandardCharsets.UTF_8);
            theme = json.matches("(?s).*\\\"theme\\\"\\s*:\\s*\\\"pink\\\".*") ? "pink" : "emerald";
        } catch (IOException ignored) { }
    }

    private static int accent() { return "pink".equals(theme) ? 0xFFFF6AAE : 0xFF54E6B1; }

    private static void loadOptions() {
        if (Files.isRegularFile(optionsFile)) {
            try (InputStream input = Files.newInputStream(optionsFile)) { OPTIONS.load(input); }
            catch (IOException ignored) { }
        }
        effectsHud = Boolean.parseBoolean(OPTIONS.getProperty("effectsHud", "true"));
        compactHud = Boolean.parseBoolean(OPTIONS.getProperty("compactHud", "true"));
        compactTab = Boolean.parseBoolean(OPTIONS.getProperty("compactTab", "true"));
    }

    private static void saveOptions() {
        OPTIONS.setProperty("effectsHud", Boolean.toString(effectsHud));
        OPTIONS.setProperty("compactHud", Boolean.toString(compactHud));
        OPTIONS.setProperty("compactTab", Boolean.toString(compactTab));
        try {
            Files.createDirectories(optionsFile.getParent());
            try (OutputStream output = Files.newOutputStream(optionsFile)) {
                OPTIONS.store(output, "Sempai Visuals settings");
            }
        } catch (IOException ignored) { }
    }

    private static final class VisualMenu extends Screen {
        private final Screen parent;

        private VisualMenu(Screen parent) {
            super(Text.of("Sempai Visuals"));
            this.parent = parent;
        }

        @Override protected void init() {
            int x = width / 2 - 105;
            int y = height / 2 - 34;
            addButton(toggle("Эффекты на HUD", 0, x, y));
            addButton(toggle("Компактный HUD", 1, x, y + 24));
            addButton(toggle("Компактный таб", 2, x, y + 48));
            addButton(new ButtonWidget(x, y + 72, 210, 20, Text.of("Закрыть"), button -> onClose()));
        }

        private ButtonWidget toggle(String label, int id, int x, int y) {
            return new ButtonWidget(x, y, 210, 20, message(label, enabled(id)), button -> {
                setEnabled(id, !enabled(id));
                button.setMessage(message(label, enabled(id)));
                saveOptions();
            });
        }

        private boolean enabled(int id) {
            if (id == 0) return effectsHud;
            if (id == 1) return compactHud;
            return compactTab;
        }

        private void setEnabled(int id, boolean value) {
            if (id == 0) effectsHud = value;
            else if (id == 1) compactHud = value;
            else compactTab = value;
        }

        private Text message(String label, boolean enabled) {
            return Text.of(label + ": " + (enabled ? "ВКЛ" : "ВЫКЛ"));
        }

        @Override public void render(MatrixStack matrices, int mouseX, int mouseY, float delta) {
            fill(matrices, 0, 0, width, height, 0xE6090C13);
            int cx = width / 2;
            fill(matrices, cx - 124, height / 2 - 72, cx + 124, height / 2 + 108, 0xF20C1118);
            fill(matrices, cx - 124, height / 2 - 72, cx + 124, height / 2 - 71, accent());
            fill(matrices, cx - 124, height / 2 + 107, cx + 124, height / 2 + 108, accent());
            fill(matrices, cx - 124, height / 2 - 72, cx - 123, height / 2 + 108, accent());
            fill(matrices, cx + 123, height / 2 - 72, cx + 124, height / 2 + 108, accent());
            drawCenteredText(matrices, textRenderer, "SEMPAI VISUALS", cx, height / 2 - 57, accent());
            drawCenteredText(matrices, textRenderer, "Тема синхронизируется с лаунчером", cx, height / 2 - 41, 0xFFB7BBC7);
            drawCenteredText(matrices, textRenderer, "Right Shift — открыть или закрыть меню", cx, height / 2 + 88, 0xFF8C92A0);
            super.render(matrices, mouseX, mouseY, delta);
        }

        @Override public void onClose() {
            saveOptions();
            client.openScreen(parent);
        }
    }
}
