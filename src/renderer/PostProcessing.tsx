import {
  EffectComposer,
  Bloom,
  Vignette,
  ToneMapping,
  SSAO,
} from '@react-three/postprocessing'
import { ToneMappingMode, BlendFunction } from 'postprocessing'

export function PostProcessing() {
  return (
    // enableNormalPass is required for SSAO
    <EffectComposer multisampling={0} enableNormalPass>
      {/* SSAO — grounds objects, adds depth (cut first if FPS drops) */}
      <SSAO
        blendFunction={BlendFunction.MULTIPLY}
        samples={8}
        rings={2}
        resolutionScale={0.75}
        intensity={8}
        luminanceInfluence={0.6}
        radius={0.05}
        bias={0.04}
        worldDistanceThreshold={20}
        worldDistanceFalloff={0.05}
        worldProximityThreshold={0.5}
        worldProximityFalloff={0.1}
      />

      {/* Bloom — makes fire particles, markers, and solar glass glow */}
      <Bloom
        luminanceThreshold={0.55}
        luminanceSmoothing={0.2}
        intensity={0.9}
        mipmapBlur
      />

      {/* ACES filmic tone mapping — cinematic color grade */}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />

      {/* Vignette — focuses the eye on center */}
      <Vignette eskil={false} offset={0.3} darkness={0.55} />
    </EffectComposer>
  )
}
