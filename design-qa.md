# Design QA

## Comparison target

- Source visual truth: `image/ChatGPT Image Jun 11, 2026, 10_37_43 AM.png`
- In-app Browser implementation: `design-qa-implementation.png`
- Chrome implementation: `design-qa-chrome.png`
- Side-by-side evidence: `design-qa-comparison.png` (source left, implementation right)
- Viewport: 1448 × 1086 (matched to the source image)
- State: sunrise scene, `qa=1` deterministic first frame for visual comparison
- Responsive check: 390 × 844, no horizontal or vertical overflow

## Full-view comparison evidence

The requested shared composition is present: a low grassy ridge in the foreground, a broad cloud sea filling the middle distance, and a right-side golden sunrise. The implementation intentionally does not reproduce the person or mountain silhouettes because the task explicitly limited changes to the camera and volumetric-cloud module.

The cloud sea now has perspective depth, rounded cotton-like bodies, softly self-occluding blue-violet undersides, warm forward scattering around the sun, distance fade, and layered motion. A slow horizontal weather flow moves the broad cloud field while counter-moving detail noise and a vertical rolling wave make individual lobes billow, swell, and contract. The camera remains slightly raised and pulled back so more of the cloud field is visible above the existing grass slope.

Focused-region evidence: `/tmp/mywebsite-bg-cloud-focus.png` crops the cloud and horizon band from the 2896 × 1086 side-by-side comparison. It confirms that the prior repeated horizontal ridges are gone and the visible shadow transitions now follow broad rounded cloud masses.

## Required fidelity surfaces

- Fonts and typography: not applicable; the visual target and implementation contain no visible UI text.
- Spacing and layout rhythm: passed for requested scope. Foreground, cloud field, horizon, and sun retain the reference's low-ridge / wide-vista hierarchy.
- Colors and visual tokens: passed. The implementation preserves cool blue-violet cloud shadows and warm gold illumination on the right, while retaining the project's existing watercolor palette.
- Image quality and asset fidelity: passed. No source-image asset was replaced by CSS, SVG, or placeholder art; the requested cloud field is rendered procedurally as a ray-marched density volume.
- Copy and content: not applicable; there is no app-specific visible copy.
- Responsiveness: passed at 1448 × 1086 and 390 × 844 with no viewport overflow.
- Accessibility and motion: reduced-motion scaling remains supported; the canvas keeps its existing accessible label.

## Interaction and browser verification

- In-app Browser: deterministic source-sized frame and the 390 × 844 responsive view captured; no console errors or warnings. Two animated-route frames captured 2.6 seconds apart show a stable camera and sun while cloud boundaries and underside shadows change; the cloud-region SSIM is 0.924218.
- Chrome: deterministic frame captured at the same 1448 × 1086 viewport; pointer parallax, grass ripple click, and wheel-controlled sun progression exercised on the animated route; no console errors or warnings. A second 2.6-second frame pair independently confirms cloud motion at the matched viewport (cloud-band SSIM 0.971763).
- Mobile viewport: canvas fills 390 × 844 with `scrollWidth === 390` and `scrollHeight === 844`.

## Comparison history

1. P2: the original cloud field was a set of flat screen-space noise bands with no view-ray depth.
   Fix: added a dedicated ray-marched volumetric cloud material with optical-depth accumulation and height-profiled density.
   Post-fix evidence: cloud masses now show near/far scale change, internal blue shadow, and warm sun-facing edges.
2. P1: the first volume pass showed repeated horizontal sampling bands, especially in the blue-violet shadow areas.
   Fix: replaced the ridged two-octave field with rotated three-octave FBM, raised the ray march to 32 evenly spaced samples, switched to stable interleaved per-pixel jitter, and added a grazing-angle fade at the horizon.
   Post-fix evidence: the source-sized full comparison and focused cloud crop no longer show a repeated horizontal stripe structure.
3. P2: the first anti-banding pass read as diffuse fog instead of soft cloud bodies.
   Fix: tightened the soft density threshold, increased low-frequency X/Z variation and cloud-top variation, strengthened front-volume extinction, and softened rather than removed the underside contrast.
   Post-fix evidence: the saved Browser and Chrome frames show separated, rounded cloud lobes with gradual edges and broad internal shadow transitions.
4. P2: the higher-quality march exceeded the stable capture budget at the source-sized viewport.
   Fix: capped the sunrise render pixel ratio at 0.66 while keeping the 32-step volume integration and full CSS-pixel viewport.
   Post-fix evidence: both browsers render the complete 1448 × 1086 frame without console warnings or capture timeouts.
5. P2: the first animated volume moved primarily as one translated field and lacked obvious internal rolling motion.
   Fix: separated the broad weather drift from a faster counter-flowing detail field, then added a vertically displaced rolling wave to the height profile, density threshold, and sun-facing response.
   Post-fix evidence: same-viewport frames captured 2.6 seconds apart retain the camera and sun position while cloud-lobe contours, density pockets, and broad underside shadows visibly evolve.

## Findings

No actionable P0, P1, or P2 findings remain within the requested camera-and-cloud scope.

P3 follow-up: the reference has denser painterly high-altitude clouds in the upper-left corner. The implementation keeps that area quieter so the real-time volume remains stable and the scene stays unchanged outside the requested camera-and-cloud scope.

## Implementation checklist

- [x] Preserve existing scene elements.
- [x] Adjust the sunrise camera framing.
- [x] Replace the sunrise low-cloud stack with a volumetric density renderer.
- [x] Add independent weather flow, counter-flowing detail, and vertical billowing motion.
- [x] Preserve reduced-motion behavior and responsive canvas fill.
- [x] Verify the result in the in-app Browser and Chrome.
- [x] Run focused regression tests and a production build.

final result: passed
