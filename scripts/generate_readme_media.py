from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "assets"
OUT.mkdir(parents=True, exist_ok=True)

W, H = 720, 405
INK = (16, 44, 47)
TEAL = (39, 208, 202)
ORANGE = (255, 91, 52)
GREEN = (61, 183, 121)
PAPER = (245, 242, 233)


def font(size: int, bold: bool = False):
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            pass
    return ImageFont.load_default()


F8, F10, F13, F18, F26 = font(8, True), font(10, True), font(13), font(18, True), font(26, True)


def base_scene(title: str, kicker: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    im = Image.new("RGB", (W, H), (134, 166, 176))
    px = im.load()
    for y in range(H):
        if y < 205:
            t = y / 205
            color = tuple(int(a * (1 - t) + b * t) for a, b in zip((120, 157, 173), (222, 225, 211)))
        else:
            t = (y - 205) / 200
            color = tuple(int(a * (1 - t) + b * t) for a, b in zip((137, 153, 132), (74, 102, 83)))
        for x in range(W):
            px[x, y] = color
    d = ImageDraw.Draw(im, "RGBA")
    mountains = [(0, 204), (55, 142), (115, 195), (205, 112), (290, 194), (380, 139), (465, 200), (560, 120), (645, 187), (720, 148), (720, 225), (0, 225)]
    d.polygon(mountains, fill=(49, 83, 78, 95))
    d.polygon([(135, H), (298, 210), (486, 210), (612, H)], fill=(71, 80, 78, 255))
    for n in range(10):
        y = 220 + n * n * 2.1
        d.line([(270 - n * 13, y), (500 + n * 13, y)], fill=(220, 220, 200, 90), width=1)
    for n in range(-6, 7):
        d.line([(385 + n * 40, H), (385 + n * 4, 210)], fill=(220, 220, 200, 75), width=1)
    d.rectangle((0, 0, W, 53), fill=(245, 242, 233, 232))
    d.text((22, 10), kicker, font=F8, fill=ORANGE)
    d.text((22, 24), title, font=F18, fill=INK)
    return im, d


def iso(p):
    x, y, z = p
    return 385 + (x - y) * 42, 265 + (x + y) * 20 - z * 48


def drone(draw: ImageDraw.ImageDraw, center, yaw=0.0, scale=1.0, rotor_phase=0.0):
    cx, cy = center
    c, s = math.cos(yaw), math.sin(yaw)

    def pt(x, y):
        return cx + (x * c - y * s) * scale, cy + (x * s + y * c) * scale

    motors = [(-52, -31), (52, 31), (-52, 31), (52, -31)]
    for a, b in [(motors[0], motors[1]), (motors[2], motors[3])]:
        draw.line([pt(*a), pt(*b)], fill=(14, 43, 45, 255), width=max(4, int(9 * scale)))
        draw.line([pt(a[0], a[1] - 2), pt(b[0], b[1] - 2)], fill=(97, 133, 130, 220), width=max(1, int(2 * scale)))
    for i, (mx, my) in enumerate(motors):
        x, y = pt(mx, my)
        draw.ellipse((x - 29 * scale, y - 10 * scale, x + 29 * scale, y + 10 * scale), fill=(39, 208, 202, 34), outline=(31, 71, 71, 210), width=2)
        a = rotor_phase * (-1 if i % 2 else 1)
        dx, dy = math.cos(a) * 27 * scale, math.sin(a) * 8 * scale
        draw.line([(x - dx, y - dy), (x + dx, y + dy)], fill=(15, 42, 44, 255), width=max(2, int(4 * scale)))
        draw.ellipse((x - 6 * scale, y - 5 * scale, x + 6 * scale, y + 5 * scale), fill=(29, 58, 60, 255), outline=ORANGE, width=2)
    body = [pt(31, 0), pt(18, -18), pt(-20, -18), pt(-33, -5), pt(-29, 15), pt(-13, 20), pt(21, 16)]
    draw.polygon(body, fill=(23, 63, 65, 255), outline=(134, 170, 164, 255))
    canopy = [pt(23, -3), pt(10, -13), pt(-18, -11), pt(-25, -2), pt(-8, 6), pt(14, 6)]
    draw.polygon(canopy, fill=(50, 95, 96, 255))
    cam = pt(32, 3)
    draw.ellipse((cam[0] - 5, cam[1] - 5, cam[0] + 5, cam[1] + 5), fill=(8, 24, 26), outline=TEAL, width=1)
    port, star = pt(-4, -20), pt(-4, 20)
    draw.ellipse((port[0] - 2, port[1] - 2, port[0] + 2, port[1] + 2), fill=(239, 73, 73))
    draw.ellipse((star[0] - 2, star[1] - 2, star[0] + 2, star[1] + 2), fill=(84, 215, 139))


WAYPOINTS = [(0, 0, 2), (3, 0, 3), (3, 3, 3), (0, 0, 1.5)]


def mission_position(t: float):
    segments = len(WAYPOINTS) - 1
    u = min(t, 0.9999) * segments
    i = int(u)
    q = u - i
    q = q * q * (3 - 2 * q)
    a, b = WAYPOINTS[i], WAYPOINTS[i + 1]
    return tuple(a[k] * (1 - q) + b[k] * q for k in range(3)), i + 1


def waypoint_frame(frame: int, total: int):
    im, d = base_scene("PID waypoint navigation", "AEROFORGE QUAD · 6-DOF DYNAMICS")
    for i in range(len(WAYPOINTS) - 1):
        d.line([iso(WAYPOINTS[i]), iso(WAYPOINTS[i + 1])], fill=(121, 224, 169, 180), width=2)
    for i, wp in enumerate(WAYPOINTS):
        x, y = iso(wp)
        gx, gy = iso((wp[0], wp[1], 0))
        d.line([(gx, gy), (x, y)], fill=(200, 229, 211, 110), width=1)
        d.ellipse((x - 7, y - 7, x + 7, y + 7), fill=GREEN, outline=PAPER, width=2)
        d.text((x + 10, y - 12), f"WP{i + 1}", font=F8, fill=INK)
    trail = []
    for j in range(frame + 1):
        p, _ = mission_position(j / max(1, total - 1))
        trail.append(iso(p))
    if len(trail) > 1:
        d.line(trail, fill=TEAL, width=4)
    pos, active = mission_position(frame / max(1, total - 1))
    x, y = iso(pos)
    sx, sy = iso((pos[0], pos[1], 0))
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.ellipse((sx - 32, sy - 10, sx + 32, sy + 10), fill=(12, 40, 35, 85))
    shadow = shadow.filter(ImageFilter.GaussianBlur(5))
    im.paste(shadow, (0, 0), shadow)
    d = ImageDraw.Draw(im, "RGBA")
    d.line([(sx, sy), (x, y)], fill=ORANGE + (130,), width=1)
    yaw = math.atan2(pos[1], max(0.01, pos[0])) * 0.2
    drone(d, (x, y), yaw=yaw, scale=0.9, rotor_phase=frame * 0.7)
    target = WAYPOINTS[active]
    err = math.dist(pos, target)
    d.rounded_rectangle((538, 13, 698, 43), radius=4, fill=(16, 44, 47, 225))
    d.text((550, 21), f"WP {active + 1}  ·  {err:0.2f} m", font=F10, fill=(231, 241, 235))
    d.text((20, H - 29), "PID POSITION → ATTITUDE → MOTOR MIXER", font=F8, fill=(229, 237, 228))
    return im


def flowfield_image():
    im, d = base_scene("Aerodynamic flowfield", "AEROFORGE QUAD · STREAMLINES / WAKE / DOWNWASH")
    cx, cy = 390, 205
    for i in range(15):
        base = 92 + i * 15
        pts = []
        for x in range(-20, W + 20, 8):
            dx, off = x - cx, base - cy
            bend = (1 if off >= 0 else -1) * 43 * math.exp(-(dx * dx) / 17000) * math.exp(-abs(off) / 110)
            wake = math.sin(dx * .06 + i) * 10 * math.exp(-max(0, dx - 60) / 310) if dx > 60 else 0
            pts.append((x, base + bend + wake))
        d.line(pts, fill=(71, 230, 220, 130 if i % 3 else 210), width=2 if i % 3 == 0 else 1)
    for x, y in [(278, 174), (502, 236), (278, 236), (502, 174)]:
        d.polygon([(x - 22, y + 5), (x - 58, y + 128), (x + 58, y + 128), (x + 22, y + 5)], fill=(39, 208, 202, 28))
        for k in range(3):
            d.ellipse((x - 26 - k * 12, y + 30 + k * 36, x + 26 + k * 12, y + 41 + k * 42), outline=(39, 208, 202, 90), width=1)
    drone(d, (cx, cy), yaw=-0.08, scale=1.05, rotor_phase=.8)
    d.line([(cx, cy - 12), (cx, 76)], fill=ORANGE, width=3)
    d.polygon([(cx, 67), (cx - 6, 80), (cx + 6, 80)], fill=ORANGE)
    d.text((cx + 10, 71), "THRUST", font=F8, fill=ORANGE)
    d.line([(cx - 20, cy + 16), (225, cy + 16)], fill=ORANGE, width=3)
    d.polygon([(216, cy + 16), (229, cy + 10), (229, cy + 22)], fill=ORANGE)
    d.text((171, cy + 29), "DRAG", font=F8, fill=ORANGE)
    d.text((20, H - 29), "V∞ 12.0 m/s   ·   6,400 rpm   ·   pressure + wake + induced flow", font=F8, fill=(229, 237, 228))
    im.save(OUT / "flowfield-overview.png", optimize=True)


def main():
    total = 72
    frames = [waypoint_frame(i, total) for i in range(total)]
    frames[0].save(OUT / "waypoint-navigation.gif", save_all=True, append_images=frames[1:], duration=75, loop=0, optimize=True, disposal=2)
    frames[34].save(OUT / "dynamics-3d.png", optimize=True)
    flowfield_image()
    print(f"Generated README media in {OUT}")


if __name__ == "__main__":
    main()
