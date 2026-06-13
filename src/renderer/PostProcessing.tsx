import {
  EffectComposer,
  Bloom,
  Vignette,
  ToneMapping,
  SSAO,
} from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'

export function PostProcessing() {
  return (
    <EffectComposer multisampling={4}>
      {/* SSAO first — grounds objects in the scene */}
      <SSAO
        radius={0.08}
        intensity={14}
        luminanceInfluence={0.6}
        color="black"
      />

      {/* Bloom — makes fire, markers, and solar glass glow */}
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
