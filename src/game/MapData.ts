import { MapConfig } from '../types';

export const MAPS: Record<string, MapConfig> = {
  easy: {
    id: "easy",
    name: "Easy Climb (Dễ)",
    width: 800,
    height: 3200,
    spawnX: 400,
    spawnY: 3100,
    backgroundColor: "#090d16",
    goal: { x: 400, y: 150, width: 250, height: 25 },
    platforms: [
      // Left and Right border walls
      { x: 10, y: 1600, width: 20, height: 3200, color: "#1e293b" },
      { x: 790, y: 1600, width: 20, height: 3200, color: "#1e293b" },

      // Bottom Ground
      { x: 400, y: 3180, width: 800, height: 40, color: "#475569" },

      // Level 1: Ground Zone (y: 2800 - 3100)
      { x: 250, y: 3000, width: 200, height: 20, color: "#10b981" }, // Green forest platform
      { x: 550, y: 2880, width: 220, height: 20, color: "#10b981" },
      { x: 300, y: 2750, width: 180, height: 20, color: "#10b981" },

      // Level 2: Sky Zone (y: 2000 - 2600)
      // Checkpoint 0 here
      { x: 150, y: 2600, width: 150, height: 20, color: "#38bdf8" }, // Light blue sky platform
      { x: 450, y: 2480, width: 160, height: 20, color: "#38bdf8" },
      { x: 680, y: 2360, width: 140, height: 20, color: "#38bdf8" },
      { x: 350, y: 2220, width: 150, height: 20, color: "#38bdf8" }, // Checkpoint platform

      // Level 3: Space Zone (y: 1100 - 2000)
      // Checkpoint 1 here
      { x: 120, y: 2050, width: 130, height: 20, color: "#818cf8" }, // Indigo space platform
      { x: 380, y: 1920, width: 140, height: 20, color: "#818cf8" },
      { x: 620, y: 1800, width: 150, height: 20, color: "#818cf8" },
      { x: 350, y: 1650, width: 140, height: 20, color: "#818cf8" },
      { x: 650, y: 1520, width: 150, height: 20, color: "#818cf8" }, // Checkpoint platform

      // Level 4: Cosmic Peak (y: 200 - 1100)
      // Checkpoint 2 here
      { x: 300, y: 1380, width: 130, height: 20, color: "#db2777" }, // Pink cosmic platform
      { x: 150, y: 1240, width: 140, height: 20, color: "#db2777" },
      { x: 450, y: 1100, width: 140, height: 20, color: "#db2777" },
      { x: 650, y: 950, width: 150, height: 20, color: "#db2777" },
      { x: 350, y: 800, width: 120, height: 20, color: "#db2777" },
      { x: 200, y: 650, width: 140, height: 20, color: "#db2777" }, // Checkpoint platform
      
      // Final Ascent
      { x: 500, y: 500, width: 120, height: 20, color: "#f59e0b" }, // Amber platform
      { x: 300, y: 350, width: 150, height: 20, color: "#f59e0b" },
      { x: 550, y: 250, width: 180, height: 20, color: "#f59e0b" },
    ],
    checkpoints: [
      { id: 0, x: 350, y: 2185, width: 80, height: 15 },
      { id: 1, x: 650, y: 1485, width: 80, height: 15 },
      { id: 2, x: 200, y: 615, width: 80, height: 15 },
    ]
  },
  hard: {
    id: "hard",
    name: "Apex Ascent (Khó - Jump King Style)",
    width: 800,
    height: 5200,
    spawnX: 400,
    spawnY: 5100,
    backgroundColor: "#030712",
    goal: { x: 400, y: 150, width: 160, height: 25 },
    platforms: [
      // Left and Right border walls
      { x: 10, y: 2600, width: 20, height: 5200, color: "#374151" },
      { x: 790, y: 2600, width: 20, height: 5200, color: "#374151" },

      // Bottom Ground
      { x: 400, y: 5180, width: 800, height: 40, color: "#1f2937" },

      // Zone 1: The Dungeon (y: 4200 - 5100)
      { x: 200, y: 5020, width: 120, height: 20, color: "#9a3412" }, // Rusty orange dungeon
      { x: 550, y: 4920, width: 100, height: 20, color: "#9a3412" },
      { x: 320, y: 4800, width: 90, height: 20, color: "#9a3412" },
      { x: 120, y: 4680, width: 100, height: 20, color: "#9a3412" },
      { x: 480, y: 4550, width: 100, height: 20, color: "#9a3412" },
      { x: 700, y: 4420, width: 80, height: 20, color: "#9a3412" },
      { x: 400, y: 4300, width: 120, height: 20, color: "#9a3412" }, // Checkpoint 0 Platform

      // Zone 2: The Forest Canopy (y: 3200 - 4200)
      { x: 150, y: 4160, width: 90, height: 20, color: "#065f46" }, // Dark forest green
      { x: 350, y: 4020, width: 80, height: 20, color: "#065f46" },
      { x: 600, y: 3900, width: 100, height: 20, color: "#065f46" },
      { x: 720, y: 3750, width: 60, height: 20, color: "#065f46" }, // Thin platform
      { x: 450, y: 3620, width: 80, height: 20, color: "#065f46" },
      { x: 200, y: 3500, width: 90, height: 20, color: "#065f46" },
      { x: 480, y: 3380, width: 70, height: 20, color: "#065f46" },
      { x: 650, y: 3250, width: 110, height: 20, color: "#065f46" }, // Checkpoint 1 Platform

      // Zone 3: Sky Temple (y: 2000 - 3200)
      { x: 350, y: 3120, width: 80, height: 20, color: "#075985" }, // Sky blue
      { x: 120, y: 3000, width: 70, height: 20, color: "#075985" },
      { x: 280, y: 2880, width: 60, height: 20, color: "#075985" },
      { x: 550, y: 2750, width: 80, height: 20, color: "#075985" },
      { x: 680, y: 2620, width: 70, height: 20, color: "#075985" },
      { x: 400, y: 2500, width: 90, height: 20, color: "#075985" },
      { x: 180, y: 2380, width: 80, height: 20, color: "#075985" },
      { x: 450, y: 2240, width: 80, height: 20, color: "#075985" },
      { x: 300, y: 2100, width: 100, height: 20, color: "#075985" }, // Checkpoint 2 Platform

      // Zone 4: The Void Peak (y: 200 - 2000)
      { x: 600, y: 1980, width: 60, height: 20, color: "#581c87" }, // Purple void
      { x: 720, y: 1850, width: 70, height: 20, color: "#581c87" },
      { x: 450, y: 1720, width: 60, height: 20, color: "#581c87" },
      { x: 220, y: 1600, width: 70, height: 20, color: "#581c87" },
      { x: 100, y: 1480, width: 60, height: 20, color: "#581c87" },
      { x: 320, y: 1350, width: 80, height: 20, color: "#581c87" },
      { x: 580, y: 1220, width: 70, height: 20, color: "#581c87" },
      { x: 400, y: 1100, width: 70, height: 20, color: "#581c87" },
      { x: 180, y: 980, width: 70, height: 20, color: "#581c87" },
      { x: 350, y: 850, width: 60, height: 20, color: "#581c87" },
      { x: 600, y: 720, width: 80, height: 20, color: "#581c87" }, // Checkpoint 3 Platform

      // Final Ascent (Super high precision required)
      { x: 350, y: 600, width: 50, height: 20, color: "#b45309" }, // Tiny platforms
      { x: 200, y: 480, width: 50, height: 20, color: "#b45309" },
      { x: 450, y: 360, width: 50, height: 20, color: "#b45309" },
      { x: 300, y: 250, width: 80, height: 20, color: "#b45309" },
    ],
    checkpoints: [
      { id: 0, x: 400, y: 4265, width: 80, height: 15 },
      { id: 1, x: 650, y: 3215, width: 80, height: 15 },
      { id: 2, x: 300, y: 2065, width: 80, height: 15 },
      { id: 3, x: 600, y: 685, width: 80, height: 15 },
    ]
  },
  nightmare: {
    id: "nightmare",
    name: "Nightmare Climb (Siêu Khó)",
    width: 800,
    height: 5200,
    spawnX: 400,
    spawnY: 5100,
    backgroundColor: "#110303",
    goal: { x: 400, y: 150, width: 160, height: 25 },
    platforms: [
      // Left and Right border walls
      { x: 10, y: 2600, width: 20, height: 5200, color: "#450a0a" },
      { x: 790, y: 2600, width: 20, height: 5200, color: "#450a0a" },

      // Bottom Ground
      { x: 400, y: 5180, width: 800, height: 40, color: "#2d0606" },

      // Zone 1: Ground/Dungeon (y: 4200 - 5100)
      { x: 200, y: 5020, width: 120, height: 20, color: "#7f1d1d" },
      { x: 550, y: 4920, width: 100, height: 20, color: "#7f1d1d" },
      { x: 320, y: 4800, width: 90, height: 20, color: "#7f1d1d" },
      { x: 480, y: 4550, width: 100, height: 20, color: "#7f1d1d" },
      { x: 700, y: 4420, width: 80, height: 20, color: "#7f1d1d" },
      { x: 400, y: 4300, width: 120, height: 20, color: "#7f1d1d" }, // Checkpoint 0 Platform

      // Zone 2: Crimson Forest (y: 3200 - 4200)
      { x: 150, y: 4160, width: 90, height: 20, color: "#991b1b" },
      { x: 350, y: 4020, width: 80, height: 20, color: "#991b1b" },
      { x: 450, y: 3620, width: 150, height: 20, color: "#991b1b" },
      { x: 200, y: 3760, width: 100, height: 20, color: "#991b1b" },
      { x: 200, y: 3500, width: 90, height: 20, color: "#991b1b" },
      { x: 200, y: 3310, width: 100, height: 20, color: "#991b1b" },
      { x: 650, y: 3250, width: 110, height: 20, color: "#991b1b" }, // Checkpoint 1 Platform

      // Zone 3: Obsidian Temple (y: 2000 - 3200)
      { x: 350, y: 3120, width: 80, height: 20, color: "#b91c1c" },
      { x: 280, y: 2880, width: 120, height: 20, color: "#b91c1c" },
      { x: 680, y: 2620, width: 80, height: 20, color: "#b91c1c" },
      { x: 180, y: 2380, width: 120, height: 20, color: "#b91c1c" },
      { x: 450, y: 2240, width: 80, height: 20, color: "#b91c1c" },
      { x: 300, y: 2100, width: 100, height: 20, color: "#b91c1c" }, // Checkpoint 2 Platform

      // Zone 4: Blood Void Peak (y: 200 - 2000)
      { x: 720, y: 1850, width: 80, height: 20, color: "#be123c" },
      { x: 220, y: 1600, width: 70, height: 20, color: "#be123c" },
      { x: 320, y: 1350, width: 100, height: 20, color: "#be123c" },
      { x: 400, y: 1100, width: 70, height: 20, color: "#be123c" },
      { x: 350, y: 850, width: 70, height: 20, color: "#be123c" },
      { x: 600, y: 720, width: 100, height: 20, color: "#be123c" }, // Checkpoint 3 Platform

      // Final Ascent (Super high precision required)
      { x: 200, y: 480, width: 50, height: 20, color: "#be123c" },
      { x: 300, y: 250, width: 80, height: 20, color: "#be123c" },
    ],
    movingPlatforms: [
      // Zone 1
      { x: 200, y: 4650, width: 100, height: 20, color: "#ef4444", startX: 100, endX: 300, speed: 60 },
      
      // Zone 2
      { x: 550, y: 3900, width: 90, height: 20, color: "#ef4444", startX: 450, endX: 650, speed: 100 },
      { x: 420, y: 3380, width: 100, height: 20, color: "#ef4444", startX: 280, endX: 550, speed: 90 },

      // Zone 3
      { x: 120, y: 3000, width: 90, height: 20, color: "#f43f5e", startX: 50, endX: 200, speed: 100 },
      { x: 550, y: 2750, width: 75, height: 20, color: "#f43f5e", startX: 450, endX: 650, speed: 150 },
      { x: 400, y: 2500, width: 70, height: 20, color: "#f43f5e", startX: 300, endX: 500, speed: 130 },

      // Zone 4
      { x: 600, y: 1980, width: 75, height: 20, color: "#be123c", startX: 500, endX: 700, speed: 150 },
      { x: 450, y: 1720, width: 70, height: 20, color: "#be123c", startX: 350, endX: 550, speed: 160 },
      { x: 100, y: 1480, width: 70, height: 20, color: "#be123c", startX: 50, endX: 250, speed: 150 },
      { x: 580, y: 1220, width: 70, height: 20, color: "#be123c", startX: 450, endX: 700, speed: 160 },
      { x: 180, y: 980, width: 70, height: 20, color: "#be123c", startX: 100, endX: 300, speed: 160 },

      // Final Ascent
      { x: 350, y: 600, width: 45, height: 20, color: "#ef4444", startX: 250, endX: 450, speed: 220 },
      { x: 450, y: 360, width: 40, height: 20, color: "#ef4444", startX: 350, endX: 550, speed: 250 },
    ],
    monsters: [
      // Zone 2
      { x: 450, y: 3600, width: 20, height: 20, color: "#f87171", startX: 390, endX: 510, speed: 80 },

      // Zone 3
      { x: 280, y: 2860, width: 20, height: 20, color: "#f43f5e", startX: 230, endX: 330, speed: 120 },
      { x: 180, y: 2360, width: 20, height: 20, color: "#f43f5e", startX: 130, endX: 230, speed: 110 },

      // Zone 4
      { x: 720, y: 1830, width: 20, height: 20, color: "#fda4af", startX: 690, endX: 750, speed: 180, knockbackForce: 420 },
      { x: 320, y: 1330, width: 20, height: 20, color: "#fda4af", startX: 280, endX: 360, speed: 200, knockbackForce: 450 },
    ],
    checkpoints: [
      { id: 0, x: 400, y: 4265, width: 80, height: 15 },
      { id: 1, x: 650, y: 3215, width: 80, height: 15 },
      { id: 2, x: 300, y: 2065, width: 80, height: 15 },
      { id: 3, x: 600, y: 685, width: 80, height: 15 },
    ]
  },
  goingup: {
    id: "goingup",
    name: "Going Up (Hành Trình Kinh Tế)",
    width: 800,
    height: 5200,
    spawnX: 400,
    spawnY: 5120,
    backgroundColor: "#0b0f19",
    goal: { x: 400, y: 150, width: 160, height: 25 },
    platforms: [
      // Border walls
      { x: 10, y: 2600, width: 20, height: 5200, color: "#1e293b" },
      { x: 790, y: 2600, width: 20, height: 5200, color: "#1e293b" },

      // Bottom Ground
      { x: 400, y: 5180, width: 800, height: 40, color: "#0f172a" },

      // --- TẦNG 1: SẢN XUẤT HÀNG HÓA GIẢN ĐƠN (y: 3500 - 5200) ---
      // Dễ thở, các bục gỗ/lá tĩnh và khoảng cách gần
      { x: 300, y: 5040, width: 150, height: 20, color: "#854d0e" },
      { x: 500, y: 4940, width: 150, height: 20, color: "#166534" },
      { x: 300, y: 4820, width: 140, height: 20, color: "#854d0e" },
      { x: 500, y: 4700, width: 140, height: 20, color: "#166534" },
      { x: 600, y: 4440, width: 140, height: 20, color: "#166534" },
      { x: 400, y: 4320, width: 130, height: 20, color: "#854d0e" },
      { x: 200, y: 4200, width: 150, height: 20, color: "#166534" }, // Checkpoint 0 Platform
      { x: 450, y: 4060, width: 140, height: 20, color: "#854d0e" },
      { x: 650, y: 3920, width: 130, height: 20, color: "#166534" },
      { x: 400, y: 3780, width: 130, height: 20, color: "#854d0e" },
      { x: 180, y: 3640, width: 130, height: 20, color: "#166534" },
      { x: 400, y: 3500, width: 150, height: 20, color: "#854d0e" }, // Checkpoint 1 Platform

      // --- TẦNG 2: CẠNH TRANH TƯ BẢN & ĐỘC QUYỀN (y: 1500 - 3500) ---
      // Kim loại, trơn trượt (isSlippery), sụp đổ (isCollapsing) và quái lớn (Tập đoàn độc quyền)
      { x: 520, y: 3350, width: 130, height: 20, color: "#475569" },
      { x: 250, y: 3200, width: 110, height: 20, color: "#475569", isSlippery: true },
      { x: 550, y: 3050, width: 110, height: 20, color: "#475569", isCollapsing: true },
      { x: 300, y: 2900, width: 120, height: 20, color: "#475569" },
      { x: 150, y: 2750, width: 100, height: 20, color: "#475569", isSlippery: true },
      { x: 500, y: 2600, width: 110, height: 20, color: "#475569", isCollapsing: true },
      { x: 680, y: 2450, width: 130, height: 20, color: "#475569" }, // Checkpoint 2 Platform
      { x: 350, y: 2300, width: 110, height: 20, color: "#475569", isSlippery: true },
      { x: 180, y: 2150, width: 100, height: 20, color: "#475569", isCollapsing: true },
      { x: 550, y: 2000, width: 110, height: 20, color: "#475569" },
      { x: 300, y: 1850, width: 110, height: 20, color: "#475569", isSlippery: true },
      { x: 600, y: 1700, width: 100, height: 20, color: "#475569", isCollapsing: true },
      { x: 250, y: 1550, width: 130, height: 20, color: "#475569" }, // Checkpoint 3 Platform

      // --- TẦNG 3: ĐỊNH HƯỚNG XÃ HỘI CHỦ NGHĨA (y: 200 - 1500) ---
      // Xanh dương (Bục đẩy màu vàng cũ được chuyển thành bục di chuyển lên xuống)
      { x: 450, y: 1400, width: 130, height: 20, color: "#0284c7" },
      { x: 550, y: 1100, width: 120, height: 20, color: "#0284c7" },
      { x: 600, y: 800, width: 130, height: 20, color: "#0284c7" },
      { x: 250, y: 650, width: 110, height: 20, color: "#0284c7" },
      { x: 300, y: 350, width: 110, height: 20, color: "#0284c7" },
      { x: 400, y: 220, width: 130, height: 20, color: "#10b981" }, // Cổng đích màu xanh ngọc
    ],
    movingPlatforms: [
      // Tầng 1
      { x: 300, y: 4560, width: 120, height: 20, color: "#854d0e", startX: 200, endX: 450, speed: 45 },

      // Tầng 2 (Khó, nhanh)
      { x: 400, y: 3100, width: 85, height: 20, color: "#ef4444", startX: 200, endX: 600, speed: 170 },
      { x: 300, y: 2800, width: 85, height: 20, color: "#ef4444", startX: 100, endX: 500, speed: 180 },
      { x: 500, y: 2500, width: 80, height: 20, color: "#ef4444", startX: 300, endX: 700, speed: 190 },
      { x: 350, y: 2070, width: 85, height: 20, color: "#ef4444", startX: 220, endX: 480, speed: 180 },
      { x: 450, y: 1900, width: 80, height: 20, color: "#ef4444", startX: 300, endX: 600, speed: 200 },
      { x: 350, y: 1620, width: 75, height: 20, color: "#ef4444", startX: 200, endX: 550, speed: 210 },

      // Tầng 3 (Chậm rãi, ổn định)
      { x: 350, y: 1320, width: 120, height: 20, color: "#0284c7", startX: 200, endX: 500, speed: 80 },
      { x: 200, y: 1250, width: 110, height: 20, color: "#eab308", startY: 1120, endY: 1380, speed: 90 },
      { x: 450, y: 1020, width: 120, height: 20, color: "#0284c7", startX: 300, endX: 600, speed: 85 },
      { x: 300, y: 950, width: 110, height: 20, color: "#eab308", startY: 820, endY: 1080, speed: 90 },
      { x: 300, y: 720, width: 110, height: 20, color: "#0284c7", startX: 150, endX: 450, speed: 80 },
      { x: 450, y: 500, width: 120, height: 20, color: "#eab308", startY: 380, endY: 620, speed: 90 },
      { x: 400, y: 420, width: 120, height: 20, color: "#0284c7", startX: 250, endX: 550, speed: 85 },
    ],
    monsters: [
      // Tầng 2: Tập đoàn độc quyền siêu lớn chèn ép
      { x: 300, y: 2880, width: 45, height: 45, color: "#7c3aed", startX: 200, endX: 400, speed: 140, knockbackForce: 600 },
      { x: 550, y: 1980, width: 45, height: 45, color: "#7c3aed", startX: 450, endX: 650, speed: 160, knockbackForce: 650 },
      { x: 300, y: 1830, width: 45, height: 45, color: "#7c3aed", startX: 200, endX: 400, speed: 160, knockbackForce: 650 }
    ],
    checkpoints: [
      { id: 0, x: 200, y: 4165, width: 80, height: 15 },
      { id: 1, x: 400, y: 3465, width: 80, height: 15 },
      { id: 2, x: 680, y: 2415, width: 80, height: 15 },
      { id: 3, x: 250, y: 1515, width: 80, height: 15 }
    ],
    flightItems: [
      { x: 500, y: 4800 },
      { x: 550, y: 4000 },
      { x: 350, y: 2980 },
      { x: 250, y: 2220 },
      { x: 600, y: 1320 },
      { x: 250, y: 580 }
    ]
  }
};
