package ru.sempai.visuals.mixin;

import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.components.PlayerTabOverlay;
import net.minecraft.world.scores.Objective;
import net.minecraft.world.scores.Scoreboard;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import ru.sempai.visuals.SempaiVisualsClient;

@Mixin(PlayerTabOverlay.class)
public abstract class PlayerTabOverlayMixin {
    @Shadow private boolean visible;

    @Inject(method = "extractRenderState", at = @At("HEAD"), cancellable = true)
    private void sempai$compactPlayerTab(GuiGraphicsExtractor graphics, int mouseX, Scoreboard scoreboard,
                                          Objective objective, CallbackInfo ci) {
        if (!visible || !SempaiVisualsClient.compactTabEnabled()) return;
        SempaiVisualsClient.drawCompactTab(graphics);
        ci.cancel();
    }
}
