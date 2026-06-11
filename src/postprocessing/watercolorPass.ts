export const watercolorPass = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uStrength: { value: 1 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uStrength;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
      );
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p *= 2.0;
        a *= 0.5;
      }
      return v;
    }

    void main() {
      vec2 uv = vUv;
      float paper = fbm(uv * vec2(115.0, 86.0));
      float bleedNoise = fbm(uv * 6.0 + vec2(uTime * 0.018, -uTime * 0.011));
      vec2 wobble = vec2(bleedNoise - 0.5, paper - 0.5) * 0.0028 * uStrength;

      vec4 cleanBase = texture2D(tDiffuse, uv);
      vec4 base = texture2D(tDiffuse, uv + wobble);
      vec4 softA = texture2D(tDiffuse, uv + wobble + vec2(0.0022, 0.0));
      vec4 softB = texture2D(tDiffuse, uv + wobble + vec2(-0.0022, 0.0));
      vec4 softC = texture2D(tDiffuse, uv + wobble + vec2(0.0, 0.0018));
      vec3 color = mix(base.rgb, (base.rgb + softA.rgb + softB.rgb + softC.rgb) * 0.25, 0.21);

      float grain = noise(uv * vec2(430.0, 330.0));
      color *= mix(0.96, 1.06, paper);
      color += (grain - 0.5) * 0.024;
      color = min(color * 1.055 + vec3(0.012, 0.009, 0.002), vec3(1.0));
      color = pow(max(color, vec3(0.0)), vec3(0.96));

      float cleanSky = smoothstep(0.28, 0.48, uv.y);
      color = mix(color, cleanBase.rgb, cleanSky);
      gl_FragColor = vec4(color, mix(base.a, cleanBase.a, cleanSky));
    }
  `
}
