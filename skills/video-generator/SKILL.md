---
name: video-generator
description: >
  Generate video files on any topic using AI video generation, programmatic rendering, or hybrid approach.
  Use this skill whenever the user wants to: create a video, generate a video clip, make an animation,
  produce a video from a description, render a video effect, or anything involving video output (.mp4).
  Also trigger when the user mentions: "video", "clip", "animation", "animate", "motion graphics",
  "render video", "make video", "сгенерировать видео", "создать видео", "анимация", "клип",
  even if they don't explicitly say "video generator". Do NOT trigger for image-only requests.
---

# Video Generator Skill

Generate video files (.mp4) on any topic using the best available method for the user's request.

## How It Works

Three generation methods are available. Choose the best one based on the user's request:

### Method Selection Guide

| Method | When to Use | Speed | Quality | Control |
|--------|------------|-------|---------|---------|
| **AI Video** | Realistic scenes, nature, people, abstract art, cinematic content | ~2 min | Highest | Low |
| **Programmatic** | Geometric animations, data visualization, abstract patterns, particle effects, diagrams | ~10 sec | Medium | Full |
| **Hybrid** | Realistic base + animated effects (glow, particles, overlays), product demos | ~30 sec | High | Medium |

**Decision rules:**
- If the user wants realism (nature, people, 3D renders, cinematic) → **AI Video**
- If the user wants precise animation (charts, geometric, data, abstract patterns) → **Programmatic**
- If the user wants realistic imagery + controllable animation effects → **Hybrid**
- If unsure, ask the user which matters more: visual realism or animation precision.

## Method 1: AI Video (z-ai video)

Best for: realistic scenes, cinematic content, nature, people, abstract AI art.

```bash
z-ai video \
  --prompt "<detailed description of the video, including visual style, camera motion, lighting>" \
  --size "<WIDTH>x<HEIGHT>" \
  --fps 30 \
  --duration <5 or 10> \
  --quality quality \
  --poll \
  --poll-interval 5 \
  --max-polls 60 \
  --output /home/z/my-project/download/video_result.json
```

**Supported sizes:** 720x1280 (vertical), 1280x720 (horizontal), 1920x1080 (horizontal HD), 1080x1920 (vertical HD)
**Durations:** 5 or 10 seconds
**Quality modes:** `speed` (faster) or `quality` (better)

After generation, download the video from the URL in the JSON result:
```bash
curl -sL "<VIDEO_URL>" -o /home/z/my-project/download/output_video.mp4
```

**Prompt tips:**
- Be specific about visual style: "cinematic", "cyberpunk", "watercolor", "photorealistic"
- Describe camera: "static camera", "slow zoom in", "panoramic shot"
- Describe motion: "gentle waves", "spinning object", "walking person"
- Include lighting: "golden hour", "neon lit", "dramatic shadows"

## Method 2: Programmatic (Python + NumPy + OpenCV + ffmpeg)

Best for: geometric animations, data viz, particle effects, abstract patterns, diagrams.

Use the bundled script `scripts/programmatic_video.py` as a starting point. It provides a framework for:
- Frame-by-frame rendering using NumPy arrays
- OpenCV VideoWriter for fast output
- Gaussian blur for glow effects
- ffmpeg re-encoding for H.264 compatibility

**Basic pattern:**
```python
import numpy as np
import cv2

W, H = 720, 1280  # or 1280, 720 for horizontal
FPS = 24
DURATION = 5
NFRAMES = FPS * DURATION

# Pre-compute masks and effects (do ONCE before the loop)
# ... set up glow masks, distance maps, etc.

fourcc = cv2.VideoWriter_fourcc(*'mp4v')
writer = cv2.VideoWriter(output_path, fourcc, FPS, (W, H))

for fi in range(NFRAMES):
    progress = fi / NFRAMES  # 0..1

    # Render frame as numpy array (H, W, 3) uint8
    frame = render_frame(progress, ...)

    # OpenCV expects BGR
    writer.write(cv2.cvtColor(frame, cv2.COLOR_RGB2BGR))

writer.release()

# Re-encode to H.264 for compatibility
# ffmpeg -y -i input.mp4 -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p output.mp4
```

**Performance tips:**
- Render at half resolution (e.g., 360x640), upscale with `cv2.resize(..., interpolation=cv2.INTER_LANCZOS4)`
- Pre-compute all Gaussian blurs and distance maps BEFORE the frame loop
- Use `cv2.GaussianBlur` instead of `scipy.ndimage.gaussian_filter` (2-5x faster)
- Use `cv2.VideoWriter` instead of saving individual PNG frames (3-4x faster)
- Keep frame logic simple: additive blending of pre-computed masks

**Common effects:**
- Glow: `mask * color * intensity` → `cv2.GaussianBlur(mask, (ksize, ksize), sigma)`
- Easing: `t * t * (3 - 2 * t)` for smooth in/out
- Wavefront: `np.clip(1.0 - (distance - radius) / width, 0, 1)` for spreading effects
- Pulse: `0.7 + 0.3 * math.sin(frame * frequency)`

## Method 3: Hybrid (AI Image + Programmatic Animation)

Best for: realistic imagery with controllable animation effects (glow, particles, color shifts).

**Step 1:** Generate base image with z-ai:
```bash
z-ai image \
  --prompt "<description of the static scene, no animation>" \
  --output /home/z/my-project/download/base_image.png \
  --size <size>
```

Valid sizes: 1024x1024, 768x1344, 864x1152, 1344x768, 1152x864, 1440x720, 720x1440
IMPORTANT: Both dimensions must be 512-2880, multiples of 32, max pixels <= 2^22 (4,194,304).

**Step 2:** Load image in Python, add programmatic animation:
```python
from PIL import Image
import numpy as np
import cv2

# Load at reduced resolution for speed
base = Image.open("base_image.png").convert("RGB").resize((180, 320), Image.LANCZOS)
base_np = np.array(base, dtype=np.float32)

# Detect edges for trace-aware effects
gray = cv2.cvtColor(np.array(base), cv2.COLOR_RGB2GRAY)
edges = cv2.Canny(gray, 30, 80)

# Pre-compute glow masks from edges...
# Render frames with animated overlays...
# Save with cv2.VideoWriter...
```

**Step 3:** Re-encode with ffmpeg:
```bash
ffmpeg -y -i raw.mp4 -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -movflags +faststart output.mp4
```

## Output Rules

1. All output videos MUST be saved to `/home/z/my-project/download/`
2. Use descriptive filenames: `<topic>_<method>.mp4`
3. Always re-encode with H.264 for browser compatibility:
   ```bash
   ffmpeg -y -i input.mp4 -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -movflags +faststart output.mp4
   ```
4. Report file size and properties to the user after generation
5. For web delivery, also copy to the Next.js public folder if a web page is needed

## Prompt Enhancement

When the user gives a brief description, enhance it for better video generation:

**For AI Video prompts**, expand with:
- Visual style (cinematic, cyberpunk, watercolor, photorealistic, etc.)
- Camera behavior (static, slow zoom, tracking shot, aerial)
- Lighting description (golden hour, neon, moody, studio)
- Motion description (smooth, dynamic, subtle, dramatic)
- Atmosphere (serene, intense, mysterious, playful)

**For Programmatic/Hybrid**, clarify:
- Color palette (specific hex values or named colors)
- Animation timing (when effects start, peak, fade)
- Geometric shapes and patterns
- Effect types (glow, particles, waves, ripples)

## Common Video Topics

Here are prompt templates for popular video categories:

**Nature:** "A serene mountain lake at sunrise, gentle ripples on the water, mist slowly rising, golden sunlight filtering through pine trees, static camera, cinematic"
**City:** "Nighttime cityscape with neon signs reflecting on wet streets, cars passing with light trails, cyberpunk atmosphere, slow pan right"
**Abstract:** "Flowing colorful liquid metal morphing between organic shapes, iridescent reflections, dark background, smooth slow motion"
**Product:** "A sleek smartphone rotating slowly on a reflective surface, studio lighting, subtle particle effects around the device"
**Data:** "Animated bar chart showing quarterly revenue growth, numbers counting up, bars growing with easing animation, dark theme with cyan accents"
**Particle:** "Thousands of glowing particles forming a sphere, slowly rotating, particles trail light as they move, dark background, volumetric glow"

## Troubleshooting

- **AI Video fails with size error:** Both dimensions must be 512-2880, multiples of 32, max total pixels 4,194,304. Use valid sizes listed above.
- **AI Video timeout:** Increase `--max-polls` to 120 or `--poll-interval` to 10.
- **Programmatic too slow:** Reduce resolution to 180x320, pre-compute all blur masks, use cv2.VideoWriter instead of PNG saving.
- **Video won't play in browser:** Re-encode with H.264: `ffmpeg -y -i input.mp4 -c:v libx264 -crf 20 -pix_fmt yuv420p output.mp4`
- **Gaussian blur too slow:** Use `cv2.GaussianBlur` (OpenCV) instead of `scipy.ndimage.gaussian_filter` — it's 2-5x faster.
- **Frame saving too slow:** Use `cv2.VideoWriter` directly instead of saving individual PNGs then encoding with ffmpeg.
