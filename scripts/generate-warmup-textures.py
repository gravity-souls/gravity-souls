"""Generate eight seamless-ish equirectangular surface maps for launch planets.

Optional authoring tool; requires Pillow and NumPy. The generated PNG assets
are committed, so the application does not need Python at runtime.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "public" / "textures" / "warmup"
DEST.mkdir(parents=True, exist_ok=True)
WIDTH, HEIGHT = 1024, 512
y, x = np.mgrid[0:HEIGHT, 0:WIDTH].astype(np.float32)
u, v = x / WIDTH, y / HEIGHT


def smooth_noise(seed: int, grid: tuple[int, int]) -> np.ndarray:
    rng = np.random.default_rng(seed)
    values = (rng.random((grid[1], grid[0])) * 255).astype(np.uint8)
    tile = Image.fromarray(values, "L").resize((WIDTH, HEIGHT), Image.Resampling.BICUBIC)
    return np.asarray(tile, dtype=np.float32) / 255 - 0.5


def render(key: str, seed: int, low: tuple[int, int, int], high: tuple[int, int, int], motif: str) -> None:
    broad = smooth_noise(seed, (17, 9))
    fine = smooth_noise(seed + 121, (77, 37))
    latitude = np.cos((v - 0.5) * np.pi)
    if motif == "quiet_ribbons":
        field = np.sin(14 * np.pi * v + 2.4 * np.sin(4 * np.pi * u) + 3 * broad)
    elif motif == "warm_marble":
        field = np.sin(7 * np.pi * (u + v) + 5 * broad) + np.cos(21 * np.pi * v + 3 * fine)
    elif motif == "contours":
        field = np.sin(19 * np.pi * v + 7 * np.sin(3 * np.pi * u) + 5 * broad)
    elif motif == "circuits":
        field = np.cos(16 * np.pi * u + 5 * broad) * np.sin(10 * np.pi * v + 3 * fine)
    elif motif == "ink_veins":
        field = np.sin(10 * np.pi * u + 8 * broad) * np.cos(6 * np.pi * v + 3 * fine)
    elif motif == "tides":
        field = np.sin(7 * np.pi * v + 4 * broad) + np.sin(13 * np.pi * u + 2 * fine)
    elif motif == "prisms":
        field = np.cos(13 * np.pi * (u - v) + 6 * broad) + np.sin(9 * np.pi * (u + v))
    else:  # copper strata
        field = np.sin(24 * np.pi * v + 2.5 * broad) + 0.6 * np.cos(5 * np.pi * u + 4 * fine)
    value = np.clip(0.5 + 0.23 * field + 0.35 * broad + 0.15 * fine + 0.08 * latitude, 0, 1)
    base = np.array(low, dtype=np.float32)
    accent = np.array(high, dtype=np.float32)
    pixels = np.clip(base + value[..., None] * (accent - base), 0, 255).astype(np.uint8)
    image = Image.fromarray(pixels, "RGB")
    if motif in {"quiet_ribbons", "prisms"}:
        rng = np.random.default_rng(seed + 31)
        draw = ImageDraw.Draw(image, "RGBA")
        for _ in range(85):
            px = int(rng.integers(0, WIDTH))
            py = int(rng.integers(0, HEIGHT))
            radius = int(rng.integers(1, 3))
            draw.ellipse((px-radius, py-radius, px+radius, py+radius), fill=(225, 225, 255, 65))
    target = DEST / f"{key}.png"
    temporary = DEST / f".{key}.tmp.png"
    image.save(temporary, optimize=True)
    temporary.replace(target)


PLANETS = [
    ("mira-27", 27, (11, 15, 47), (107, 105, 191), "quiet_ribbons"),
    ("iora-42", 42, (83, 30, 47), (248, 169, 95), "warm_marble"),
    ("veyr-31", 31, (24, 35, 58), (126, 164, 188), "contours"),
    ("celyn-58", 58, (9, 38, 70), (66, 205, 221), "circuits"),
    ("sora-46", 46, (39, 12, 36), (180, 90, 97), "ink_veins"),
    ("nalo-19", 19, (10, 57, 54), (123, 191, 130), "tides"),
    ("elyn-73", 73, (42, 29, 88), (224, 143, 190), "prisms"),
    ("oren-24", 24, (16, 28, 52), (182, 111, 67), "copper_strata"),
]


if __name__ == "__main__":
    for args in PLANETS:
        render(*args)
    print(f"Generated {len(PLANETS)} planet textures in {DEST}")
