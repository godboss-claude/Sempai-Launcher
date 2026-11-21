package ru.sempai.visuals;

import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keybinding.v1.KeyBindingHelper;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.client.option.KeyBinding;
import net.minecraft.text.Text;
import net.minecraft.util.Identifier;
import org.lwjgl.glfw.GLFW;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;

public final class SempaiVisualsClient implements ClientModInitializer {
    private static final Properties OPTIONS = new Properties();
    private static Path optionsFile;
    private static KeyBinding openMenu;
    private static final KeyBinding.Category KEY_CATEGORY =
            KeyBinding.Category.create(Identifier.of("sempai_visuals", "main"));
    private static String theme = "emerald";
    private static long nextThemeCheckAt;
    private static boolean effectsHud = true;
    private static boolean compactHud = true;
    private static boolean compactTab = true;

    @Override
    public void onInitializeClient() {
        optionsFile = FabricLoader.getInstance().getConfigDir().resolve("sempai-visuals-client.properties");
        loadOptions();
        openMenu = KeyBindingHelper.registerKeyBinding(new KeyBinding(
                "key.sempai_visuals.open_menu", GLFW.GLFW_KEY_RIGHT_SHIFT, KEY_CATEGORY));
        ClientTickEvents.END_CLIENT_TICK.register(client -> {
            refreshTheme();
            while (openMenu.wasPressed()) {
                if (client.currentScreen instanceof VisualMenu) {
                    client.currentScreen.close();
                } else {
                    client.setScreen(new VisualMenu(client.currentScreen));
                }
            }
        });
    }

    private static void refreshTheme() {
        long now = System.currentTimeMillis();
        if (now < nextThemeCheckAt) return;
        nextThemeCheckAt = now + 1000;
        Path file = FabricLoader.getInstance().getConfigDir().resolve("sempai-visuals.json");
        if (!Files.isRegularFile(file)) return;
        try {
            String json = Files.readString(file);
            theme = json.matches("(?s).*\\\"theme\\\"\\s*:\\s*\\\"pink\\\".*") ? "pink" : "emerald";
        } catch (IOException ignored) { }
    }

    private static int accent() { return "pink".equals(theme) ? 0xFFFF6AAE : 0xFF54E6B1; }

    private static void loadOptions() {
        if (Files.isRegularFile(optionsFile)) {
            try (var input = Files.newInputStream(optionsFile)) { OPTIONS.load(input); }
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
            try (var output = Files.newOutputStream(optionsFile)) { OPTIONS.store(output, "Sempai Visuals settings"); }
        } catch (IOException ignored) { }
    }

    private static final class VisualMenu extends Screen {
        private final Screen parent;
        private VisualMenu(Screen parent) {
            super(Text.literal("Sempai Visuals"));
            this.parent = parent;
        }

        @Override protected void init() {
            int x = width / 2 - 105;
            int y = height / 2 - 34;
            addDrawableChild(toggle("Эффекты на HUD", () -> effectsHud, value -> effectsHud = value, x, y));
            addDrawableChild(toggle("Компактный HUD", () -> compactHud, value -> compactHud = value, x, y + 24));
            addDrawableChild(toggle("Компактный таб", () -> compactTab, value -> compactTab = value, x, y + 48));
            addDrawableChild(ButtonWidget.builder(Text.literal("Закрыть"), button -> close())
                    .dimensions(x, y + 72, 210, 20).build());
        }

        private ButtonWidget toggle(String label, java.util.function.BooleanSupplier get,
                                    java.util.function.Consumer<Boolean> set, int x, int y) {
            return ButtonWidget.builder(message(label, get.getAsBoolean()), button -> {
                set.accept(!get.getAsBoolean());
                button.setMessage(message(label, get.getAsBoolean()));
                saveOptions();
            }).dimensions(x, y, 210, 20).build();
        }

        private Text message(String label, boolean enabled) {
            return Text.literal(label + ": " + (enabled ? "ВКЛ" : "ВЫКЛ"));
        }

        @Override public void render(DrawContext context, int mouseX, int mouseY, float delta) {
            context.fill(0, 0, width, height, 0xE6090C13);
            int cx = width / 2;
            context.fill(cx - 124, height / 2 - 72, cx + 124, height / 2 + 108, 0xF20C1118);
            context.fill(cx - 124, height / 2 - 72, cx + 124, height / 2 - 71, accent());
            context.fill(cx - 124, height / 2 + 107, cx + 124, height / 2 + 108, accent());
            context.fill(cx - 124, height / 2 - 72, cx - 123, height / 2 + 108, accent());
            context.fill(cx + 123, height / 2 - 72, cx + 124, height / 2 + 108, accent());
            context.drawCenteredTextWithShadow(textRenderer, "SEMPAI VISUALS", cx, height / 2 - 57, accent());
            context.drawCenteredTextWithShadow(textRenderer, "Тема синхронизируется с лаунчером", cx, height / 2 - 41, 0xFFB7BBC7);
            context.drawCenteredTextWithShadow(textRenderer, "Right Shift — открыть или закрыть меню", cx, height / 2 + 88, 0xFF8C92A0);
            super.render(context, mouseX, mouseY, delta);
        }

        @Override public void close() {
            saveOptions();
            client.setScreen(parent);
        }
    }
}
