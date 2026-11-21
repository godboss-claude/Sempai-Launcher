package ru.sempai.visuals.mixin;
import net.minecraft.client.MinecraftClient;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import ru.sempai.visuals.LegacyVisualsClient;
@Mixin(MinecraftClient.class)
public abstract class MinecraftClientMixin {
 @Inject(method="tick", at=@At("TAIL"))
 private void sempai$tickMenu(CallbackInfo ci) { LegacyVisualsClient.tick((MinecraftClient)(Object)this); }
}
