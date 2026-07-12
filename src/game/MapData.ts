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
  }
};
