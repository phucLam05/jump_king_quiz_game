import Phaser from 'phaser';
import { MAPS } from './MapData';
import { PlayerState } from '../types';

export class GameScene extends Phaser.Scene {
  // Local Player
  private localPlayer!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private isHost: boolean = false;
  private playerId!: string;
  private playerName!: string;
  private playerColor!: string;
  private mapId!: string;

  // Remote Players
  private remotePlayers: Map<string, {
    sprite: Phaser.GameObjects.Sprite;
    nameTag: Phaser.GameObjects.Text;
    targetX: number;
    targetY: number;
  }> = new Map();

  // Map elements
  private platformsGroup!: Phaser.Physics.Arcade.StaticGroup;
  private collapsingPlatformsGroup!: Phaser.Physics.Arcade.StaticGroup;
  private slipperyPlatformsGroup!: Phaser.Physics.Arcade.StaticGroup;
  private boosterPlatformsGroup!: Phaser.Physics.Arcade.StaticGroup;
  private checkpointsGroup!: Phaser.Physics.Arcade.StaticGroup;
  private goalZone!: Phaser.GameObjects.Rectangle;

  // Jump King Physics Variables
  private isCharging: boolean = false;
  private chargeTime: number = 0;
  private chargeRatio: number = 0;
  private jumpDirection: number = 0; // -1 = left, 0 = up, 1 = right
  private lastOnGround: boolean = true;

  // Shoe Level Variable
  private shoeLevel: number = 1;
  private highestYInAir: number = 0;

  // Charge Bar Graphic
  private chargeBar!: Phaser.GameObjects.Graphics;

  // Keys
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  // Host Cam Variables
  private hostCamSpeed: number = 12;
  private spectateTargetId: string | null = null;
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;

  // Pause UI elements
  private pauseText: Phaser.GameObjects.Text | null = null;
  private isInitiallyPaused: boolean = false;

  // Checkpoint Interaction State
  private overlappingCheckpointId: number = -1;
  private lastOverlappingCheckpointId: number = -1;
  private lastTeleportTime: number = 0;

  // Obstacles & Monsters Groups
  private movingPlatformsGroup!: Phaser.Physics.Arcade.Group;
  private monstersGroup!: Phaser.Physics.Arcade.Group;
  private coinsGroup!: Phaser.Physics.Arcade.StaticGroup;
  private isInvincible: boolean = false;

  // Flight-related elements
  private flightItemsGroup!: Phaser.Physics.Arcade.StaticGroup;
  private isLocalFlying: boolean = false;
  private isLocalFrozen: boolean = false;

  // Callbacks to React
  private onReachCheckpoint!: (id: number) => void;
  private onReachGoal!: () => void;
  private onPositionUpdate!: (state: { x: number; y: number; vx: number; vy: number; height: number; isFlying?: boolean }) => void;
  private onHostCameraUpdate!: (x: number, y: number) => void;
  private onOverlapFlightItem!: () => void;

  // State throttle
  private lastUpdateTime: number = 0;

  constructor() {
    super('GameScene');
  }

  public init(data: {
    roomId: string;
    playerId: string;
    playerName: string;
    playerColor: string;
    isHost: boolean;
    mapId: string;
    isInitiallyPaused?: boolean;
    onReachCheckpoint: (id: number) => void;
    onReachGoal: () => void;
    onPositionUpdate: (state: { x: number; y: number; vx: number; vy: number; height: number; isFlying?: boolean }) => void;
    onHostCameraUpdate: (x: number, y: number) => void;
    onOverlapFlightItem?: () => void;
  }) {
    this.playerId = data.playerId;
    this.playerName = data.playerName;
    this.playerColor = data.playerColor;
    this.isHost = data.isHost;
    this.mapId = data.mapId;
    this.isInitiallyPaused = data.isInitiallyPaused || false;
    this.onReachCheckpoint = data.onReachCheckpoint;
    this.onReachGoal = data.onReachGoal;
    this.onPositionUpdate = data.onPositionUpdate;
    this.onHostCameraUpdate = data.onHostCameraUpdate;
    this.onOverlapFlightItem = data.onOverlapFlightItem || (() => {});

    this.remotePlayers.clear();
    this.isCharging = false;
    this.chargeTime = 0;
    this.chargeRatio = 0;
    this.jumpDirection = 0;
    this.spectateTargetId = null;
    this.isInvincible = false;
    this.shoeLevel = 1;
    this.highestYInAir = 0;
    this.isLocalFlying = false;
    this.isLocalFrozen = false;
  }

  public preload() {
    // We generate textures dynamically instead of loading files
    this.createDynamicTextures();
  }

  public create() {
    const mapConfig = MAPS[this.mapId] || MAPS.easy;

    // Set world bounds
    this.physics.world.setBounds(0, 0, mapConfig.width, mapConfig.height);
    this.cameras.main.setBounds(0, 0, mapConfig.width, mapConfig.height);
    this.cameras.main.setBackgroundColor(mapConfig.backgroundColor);

    // Create static platforms groups
    this.platformsGroup = this.physics.add.staticGroup();
    this.collapsingPlatformsGroup = this.physics.add.staticGroup();
    this.slipperyPlatformsGroup = this.physics.add.staticGroup();
    this.boosterPlatformsGroup = this.physics.add.staticGroup();
    this.coinsGroup = this.physics.add.staticGroup();

    mapConfig.platforms.forEach((plat) => {
      let width = plat.width;
      
      // Check if any monster is directly above this platform
      const hasMonster = mapConfig.monsters && mapConfig.monsters.some((mon) => {
        const yMatch = mon.y < plat.y && (plat.y - mon.y) <= 50;
        const xMatch = mon.x >= (plat.x - plat.width / 2) && mon.x <= (plat.x + plat.width / 2);
        return yMatch && xMatch;
      });
      
      if (hasMonster) {
        width = plat.width + 100; // Extend platform by 100px
      }
      
      const colorHex = parseInt(plat.color?.replace('#', '0x') || '0x475569', 16);
      const rect = this.add.rectangle(plat.x, plat.y, width, plat.height, colorHex);
      
      // Store custom flags on the GameObject for physics/rendering checks
      if (plat.isCollapsing) {
        rect.setData('isCollapsing', true);
        this.collapsingPlatformsGroup.add(rect);
        // Red outline for collapsing platforms
        rect.setStrokeStyle(2, 0xef4444);
      } else if (plat.isSlippery) {
        rect.setData('isSlippery', true);
        this.slipperyPlatformsGroup.add(rect);
        // Blue outline for slippery platforms
        rect.setStrokeStyle(2, 0x3b82f6);
      } else if (plat.isBooster) {
        rect.setData('isBooster', true);
        this.boosterPlatformsGroup.add(rect);
        // Add a yellow stroke/border to indicate Booster support
        rect.setStrokeStyle(2, 0xffd700);
      } else {
        this.platformsGroup.add(rect);
      }

      // Give physics properties
      const body = rect.body as Phaser.Physics.Arcade.StaticBody;
      body.updateFromGameObject();
    });

    // Create moving platforms group
    this.movingPlatformsGroup = this.physics.add.group({ allowGravity: false, immovable: true });
    if (mapConfig.movingPlatforms) {
      mapConfig.movingPlatforms.forEach((plat) => {
        const rect = this.add.rectangle(plat.x, plat.y, plat.width, plat.height, parseInt(plat.color?.replace('#', '0x') || '0xef4444', 16));
        this.movingPlatformsGroup.add(rect);
        
        const body = rect.body as Phaser.Physics.Arcade.Body;
        body.setImmovable(true);
        body.setAllowGravity(false);
        
        // One-way platform configuration to prevent horizontal separation issues
        body.checkCollision.left = false;
        body.checkCollision.right = false;
        body.checkCollision.down = false;
        body.checkCollision.up = true;
        body.friction.x = 1; // Handled natively by Phaser Arcade Physics

        // Store movement bounds
        const isVertical = (plat.startY !== undefined && plat.endY !== undefined);
        rect.setData('startX', plat.startX ?? plat.x);
        rect.setData('endX', plat.endX ?? plat.x);
        rect.setData('startY', plat.startY);
        rect.setData('endY', plat.endY);
        rect.setData('isVertical', isVertical);
        rect.setData('speed', plat.speed);
        
        // Start moving
        if (isVertical) {
          body.setVelocityY(plat.speed);
        } else {
          body.setVelocityX(plat.speed);
        }
      });
    }

    // Create monsters group
    this.monstersGroup = this.physics.add.group({ allowGravity: false, immovable: true });
    if (mapConfig.monsters) {
      mapConfig.monsters.forEach((mon) => {
        const sprite = this.add.sprite(mon.x, mon.y, 'monster_body');
        sprite.setTint(parseInt(mon.color?.replace('#', '0x') || '0xf87171', 16));
        this.monstersGroup.add(sprite);

        const body = sprite.body as Phaser.Physics.Arcade.Body;
        body.setImmovable(true);
        body.setAllowGravity(false);
        body.setSize(mon.width, mon.height);
        
        // Store patrol range and properties
        sprite.setData('startX', mon.startX);
        sprite.setData('endX', mon.endX);
        sprite.setData('speed', mon.speed);
        sprite.setData('knockbackForce', mon.knockbackForce || 350);

        // Start moving right
        body.setVelocityX(mon.speed);
      });
    }

    // Create checkpoints
    this.checkpointsGroup = this.physics.add.staticGroup();
    mapConfig.checkpoints.forEach((cp) => {
      // Draw checkpoint as a nice blue glowing platform segment
      const rect = this.add.rectangle(cp.x, cp.y, cp.width, cp.height, 0x38bdf8);
      // Add pulsing glow effect
      this.tweens.add({
        targets: rect,
        alpha: 0.4,
        duration: 1000,
        yoyo: true,
        repeat: -1
      });
      this.checkpointsGroup.add(rect);
      // Set sensor/overlap-only body
      const body = rect.body as Phaser.Physics.Arcade.StaticBody;
      body.updateFromGameObject();
      // Store checkpoint ID on the object
      rect.setData('checkpointId', cp.id);
    });

    // Create Goal Zone (Top Platform)
    this.goalZone = this.add.rectangle(
      mapConfig.goal.x,
      mapConfig.goal.y,
      mapConfig.goal.width,
      mapConfig.goal.height,
      0xf59e0b
    );
    this.physics.add.existing(this.goalZone, true);
    
    // Pulse gold color
    this.tweens.add({
      targets: this.goalZone,
      scaleY: 1.2,
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    // Generate coin texture dynamically
    if (!this.textures.exists('coin')) {
      const graphics = this.add.graphics();
      graphics.fillStyle(0xfacc15, 1); // Shiny Gold
      graphics.fillCircle(8, 8, 7);
      graphics.lineStyle(1.5, 0xca8a04, 1); // Dark Gold border
      graphics.strokeCircle(8, 8, 7);
      
      // Draw a tiny white highlight
      graphics.fillStyle(0xffffff, 0.8);
      graphics.fillCircle(5, 5, 1.5);
      
      graphics.generateTexture('coin', 16, 16);
      graphics.destroy();
    }

    // Spawn 7 coins on the bottom ground floor (distributed evenly)
    const groundY = mapConfig.height - 40;
    const spacing = mapConfig.width / 8; // 8 parts for 7 coins
    for (let i = 1; i <= 7; i++) {
      const coinX = spacing * i;
      const coinY = groundY - 20; // 20 pixels above the ground
      const coin = this.physics.add.staticImage(coinX, coinY, 'coin');
      this.coinsGroup.add(coin);
    }

    // Spawn other coins above upper platforms
    mapConfig.platforms.forEach((plat) => {
      // Don't spawn on bottom floor spawn platform, or on walls, or booster platforms
      if (plat.y < mapConfig.height - 200 && plat.width > 20 && !plat.isBooster) {
        // Spawn at center of platform, 35 pixels above it
        const coin = this.physics.add.staticImage(plat.x, plat.y - 35, 'coin');
        this.coinsGroup.add(coin);
      }
    });

    // For moving platforms: spawn static coins at the middle of their paths so players can jump to collect them!
    if (mapConfig.movingPlatforms) {
      mapConfig.movingPlatforms.forEach((plat) => {
        let coinX = plat.x;
        let coinY = plat.y - 35;
        
        if (plat.startX !== undefined && plat.endX !== undefined) {
          coinX = (plat.startX + plat.endX) / 2;
        }
        if (plat.startY !== undefined && plat.endY !== undefined) {
          coinY = (plat.startY + plat.endY) / 2 - 35;
        }
        
        const coin = this.physics.add.staticImage(coinX, coinY, 'coin');
        this.coinsGroup.add(coin);
      });
    }

    // Create static group for flight items
    this.flightItemsGroup = this.physics.add.staticGroup();

    // Spawn flight items if defined for this map
    if (mapConfig.flightItems) {
      if (!this.textures.exists('flight_item')) {
        const graphics = this.add.graphics();
        graphics.fillStyle(0x38bdf8, 1); // Sky blue
        graphics.fillCircle(8, 8, 7);
        graphics.lineStyle(1.5, 0xffffff, 1); // White border
        graphics.strokeCircle(8, 8, 7);
        graphics.fillStyle(0xffffff, 0.8);
        // Draw a tiny wing shape
        graphics.fillRect(4, 7, 8, 2);
        graphics.fillRect(5, 5, 6, 2);
        graphics.generateTexture('flight_item', 16, 16);
        graphics.destroy();
      }

      mapConfig.flightItems.forEach((pos) => {
        const item = this.physics.add.staticImage(pos.x, pos.y, 'flight_item');
        this.flightItemsGroup.add(item);
        
        // Add a gentle floating/breathing animation using tweens
        this.tweens.add({
          targets: item,
          y: pos.y - 6,
          duration: 1000 + Math.random() * 500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      });
    }

    // Create controls
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys({
      A: Phaser.Input.Keyboard.KeyCodes.A,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      W: Phaser.Input.Keyboard.KeyCodes.W,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      R: Phaser.Input.Keyboard.KeyCodes.R
    }) as Record<string, Phaser.Input.Keyboard.Key>;

    // Setup local player if not Host
    if (!this.isHost) {
      this.createLocalPlayer(mapConfig.spawnX, mapConfig.spawnY);
      
      const handleShoesUpgraded = (e: any) => {
        if (this.localPlayer && this.localPlayer.active) {
          const level = e?.detail?.level ?? 1;
          const flashColor = level === 2 ? { r: 6, g: 182, b: 212 } : { r: 16, g: 185, b: 129 };
          const particleColor = level === 2 ? 0x06b6d4 : 0x10b981;
          
          this.cameras.main.flash(200, flashColor.r, flashColor.g, flashColor.b);
          for (let i = 0; i < 12; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 15 + Math.random() * 20;
            const sx = this.localPlayer.x + Math.cos(angle) * dist;
            const sy = this.localPlayer.y + Math.sin(angle) * dist;
            const spark = this.add.circle(sx, sy, 3, particleColor);
            this.tweens.add({
              targets: spark,
              x: this.localPlayer.x,
              y: this.localPlayer.y,
              alpha: 0,
              scale: 0.1,
              duration: 400,
              onComplete: () => spark.destroy()
            });
          }
        }
      };
      window.addEventListener('shoes_upgraded', handleShoesUpgraded);
      this.events.once('shutdown', () => {
        window.removeEventListener('shoes_upgraded', handleShoesUpgraded);
      });
    } else {
      // Setup host free camera dragging controls
      this.setupHostDragControls();
      // Initially focus camera near spawn point or mid map
      this.cameras.main.setScroll(mapConfig.width / 2 - this.cameras.main.width / 2, mapConfig.height - 400);
    }

    // Set up collisions & overlaps
    if (!this.isHost) {
      this.physics.add.collider(this.localPlayer, this.platformsGroup, this.handlePlatformCollision, undefined, this);
      this.physics.add.collider(this.localPlayer, this.slipperyPlatformsGroup, this.handlePlatformCollision, undefined, this);
      this.physics.add.collider(this.localPlayer, this.collapsingPlatformsGroup, this.handleCollapsingPlatformCollision, undefined, this);
      this.physics.add.collider(this.localPlayer, this.boosterPlatformsGroup, this.handleBoosterCollision, undefined, this);
      this.physics.add.collider(this.localPlayer, this.movingPlatformsGroup, undefined, undefined, this);
      this.physics.add.overlap(this.localPlayer, this.monstersGroup, this.handleMonsterOverlap, undefined, this);
      this.physics.add.overlap(this.localPlayer, this.goalZone, this.handleGoalOverlap, undefined, this);
      this.physics.add.overlap(this.localPlayer, this.coinsGroup, this.handleCoinOverlap, undefined, this);
      if (this.flightItemsGroup) {
        this.physics.add.overlap(this.localPlayer, this.flightItemsGroup, this.handleFlightItemOverlap, undefined, this);
      }
    }

    if (this.isInitiallyPaused) {
      this.setGamePaused(true);
    }
  }

  public update(time: number, delta: number) {
    // Checkpoint Enter/Leave Triggers
    if (!this.isHost && this.localPlayer && this.localPlayer.active && this.checkpointsGroup) {
      let currentCPId = -1;
      this.checkpointsGroup.getChildren().forEach((cpObj: any) => {
        if (Phaser.Geom.Intersects.RectangleToRectangle(this.localPlayer.getBounds(), cpObj.getBounds())) {
          currentCPId = cpObj.getData('checkpointId');
        }
      });

      if (currentCPId !== this.lastOverlappingCheckpointId) {
        if (currentCPId !== -1) {
          const event = new CustomEvent('enter_checkpoint', { detail: { id: currentCPId } });
          window.dispatchEvent(event);
        } else {
          const event = new CustomEvent('leave_checkpoint', { detail: { id: this.lastOverlappingCheckpointId } });
          window.dispatchEvent(event);
        }
        this.lastOverlappingCheckpointId = currentCPId;
      }
    }

    // Update moving platforms horizontal & vertical patrol
    if (this.movingPlatformsGroup && this.movingPlatformsGroup.active) {
      this.movingPlatformsGroup.getChildren().forEach((plat: any) => {
        const body = plat.body as Phaser.Physics.Arcade.Body;
        const isVertical = plat.getData('isVertical');
        const speed = plat.getData('speed');
        
        if (isVertical) {
          const startY = plat.getData('startY');
          const endY = plat.getData('endY');
          if (body.velocity.y > 0 && plat.y >= endY) {
            body.setVelocityY(-speed);
          } else if (body.velocity.y < 0 && plat.y <= startY) {
            body.setVelocityY(speed);
          }
        } else {
          if (body.velocity.x > 0 && plat.x >= plat.getData('endX')) {
            body.setVelocityX(-speed);
          } else if (body.velocity.x < 0 && plat.x <= plat.getData('startX')) {
            body.setVelocityX(speed);
          }
        }
      });
    }

    // Update monsters horizontal patrol
    if (this.monstersGroup && this.monstersGroup.active) {
      this.monstersGroup.getChildren().forEach((mon: any) => {
        const body = mon.body as Phaser.Physics.Arcade.Body;
        if (body.velocity.x > 0 && mon.x >= mon.getData('endX')) {
          body.setVelocityX(-mon.getData('speed'));
          mon.setFlipX(true);
        } else if (body.velocity.x < 0 && mon.x <= mon.getData('startX')) {
          body.setVelocityX(mon.getData('speed'));
          mon.setFlipX(false);
        }
      });
    }



    if (this.isHost) {
      this.handleHostCameraControls();
    } else {
      if (this.localPlayer && this.localPlayer.active) {
        if (this.shoeLevel === 0) {
          this.localPlayer.setTint(0x707f94);
        } else if (this.shoeLevel === 2) {
          this.localPlayer.setTint(0x22d3ee);
        } else {
          this.localPlayer.setTint(parseInt(this.playerColor.replace('#', '0x'), 16));
        }
      }
      this.handlePlayerControls(time, delta);
      this.updateChargeBar();
      this.syncPositionWithThrottle(time);
    }

    // Smoothly interpolate other players
    this.interpolateRemotePlayers();
  }

  // Set the spectate target for the host
  public spectatePlayer(playerId: string | null) {
    this.spectateTargetId = playerId;
    if (playerId) {
      const remote = this.remotePlayers.get(playerId);
      if (remote) {
        this.cameras.main.startFollow(remote.sprite, true, 0.1, 0.1);
      }
    } else {
      this.cameras.main.stopFollow();
    }
  }

  // Teleport player back to a specific checkpoint coordinate
  public respawnTo(x: number, y: number) {
    if (this.isHost || !this.localPlayer) return;
    this.localPlayer.setVelocity(0, 0);
    this.localPlayer.setPosition(x, y - 20); // spawn slightly above platform to avoid clipping
    this.localPlayer.body.reset(x, y - 20);
    this.cameras.main.pan(x, y - 100, 500, 'Power2');
    
    // Reset highest Y in air to prevent long fall quote trigger on teleportation
    this.highestYInAir = y - 20;
  }

  // Update list of remote players
  public updatePlayers(players: Record<string, PlayerState>) {
    // If not host, check if local player needs to be teleported by host
    if (!this.isHost && this.playerId) {
      const myState = players[this.playerId];
      if (myState) {
        this.shoeLevel = myState.shoeLevel !== undefined ? myState.shoeLevel : 1;
        
        if (myState.teleportTarget) {
          const target = myState.teleportTarget;
          if (target.time !== this.lastTeleportTime) {
            this.lastTeleportTime = target.time;
            this.respawnTo(target.x, target.y);
            
            const event = new CustomEvent('local_player_teleported', {
              detail: {
                x: target.x,
                y: target.y
              }
            });
            window.dispatchEvent(event);
          }
        }
      }
    }

    // Add or update remote players
    Object.keys(players).forEach((id) => {
      if (id === this.playerId) return; // Skip local player
      
      const p = players[id];
      if (p.isHost) return; // Skip hosts

      if (this.remotePlayers.has(id)) {
        // Update target position for interpolation
        const remote = this.remotePlayers.get(id)!;
        remote.targetX = p.x;
        remote.targetY = p.y;
        
        // Hide if player is offline, otherwise show
        const isVisible = !p.offline;
        remote.sprite.setVisible(isVisible);
        remote.nameTag.setVisible(isVisible);
        
        // Update name tag and check if finished
        const lvSuffix = p.shoeLevel !== undefined ? ` [LV${p.shoeLevel}]` : ' [LV1]';
        if (p.isFinished) {
          remote.nameTag.setText(`🏁 ${p.name}`);
          remote.nameTag.setColor('#f59e0b');
        } else {
          remote.nameTag.setText(`${p.name}${lvSuffix} (${Math.round(p.height)}m)`);
        }

        // Sync visual tint for remote players based on shoeLevel and flying status
        if (p.isFlying) {
          remote.sprite.setTint(0x38bdf8);
          remote.sprite.setAlpha(0.85);
          // Spawn flight sparks
          if (this.time.now % 10 < 3) {
            const sparkles = this.add.rectangle(remote.sprite.x + Phaser.Math.Between(-8, 8), remote.sprite.y + 12, 3, 3, 0x38bdf8);
            this.tweens.add({
              targets: sparkles,
              alpha: 0,
              y: sparkles.y + 10,
              duration: 300,
              onComplete: () => sparkles.destroy()
            });
          }
        } else if (p.shoeLevel === 0) {
          remote.sprite.setTint(0x707f94);
          remote.sprite.setAlpha(0.4);
        } else if (p.shoeLevel === 2) {
          remote.sprite.setTint(0x22d3ee);
          remote.sprite.setAlpha(0.65);
        } else {
          remote.sprite.setTint(parseInt(p.color.replace('#', '0x'), 16));
          remote.sprite.setAlpha(0.5);
        }
      } else {
        // Create new remote player sprite
        const sprite = this.add.sprite(p.x, p.y, 'player_body');
        if (p.isFlying) {
          sprite.setTint(0x38bdf8);
          sprite.setAlpha(0.85);
        } else if (p.shoeLevel === 0) {
          sprite.setTint(0x707f94);
          sprite.setAlpha(0.4);
        } else if (p.shoeLevel === 2) {
          sprite.setTint(0x22d3ee);
          sprite.setAlpha(0.65);
        } else {
          sprite.setTint(parseInt(p.color.replace('#', '0x'), 16));
          sprite.setAlpha(0.5); // Ghost effect
        }
        sprite.setVisible(!p.offline);

        // Host (Admin) Ctrl + Click teleport control
        if (this.isHost) {
          sprite.setInteractive({ useHandCursor: true });
          sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (pointer.event.ctrlKey) {
              const event = new CustomEvent('admin_teleport_request', {
                detail: {
                  playerId: id,
                  playerName: p.name
                }
              });
              window.dispatchEvent(event);
            }
          });
        }
        
        // Add name tag
        const nameTag = this.add.text(p.x, p.y - 25, p.name, {
          fontSize: '11px',
          color: '#ffffff',
          backgroundColor: 'rgba(0,0,0,0.4)',
          padding: { x: 4, y: 2 }
        }).setOrigin(0.5);
        nameTag.setVisible(!p.offline);

        this.remotePlayers.set(id, {
          sprite,
          nameTag,
          targetX: p.x,
          targetY: p.y
        });
      }
    });

    // Remove players who left
    this.remotePlayers.forEach((value, key) => {
      if (!players[key]) {
        value.sprite.destroy();
        value.nameTag.destroy();
        this.remotePlayers.delete(key);

        // If host was spectating this player, stop spectating
        if (this.isHost && this.spectateTargetId === key) {
          this.spectatePlayer(null);
        }
      }
    });

    // If host is spectating, make sure camera follow target is still set
    if (this.isHost && this.spectateTargetId) {
      const remote = this.remotePlayers.get(this.spectateTargetId);
      if (remote) {
        // Re-align camera follow just in case
        this.cameras.main.startFollow(remote.sprite, true, 0.1, 0.1);
      }
    }
  }

  // --- HELPERS & PHYSICS LOGIC ---

  private createDynamicTextures() {
    // Generate a capsule player texture
    if (!this.textures.exists('player_body')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xffffff, 1);
      // Create rounded rectangle
      g.fillRoundedRect(0, 0, 24, 30, 8);
      
      // Eyes
      g.fillStyle(0x000000, 1);
      g.fillCircle(6, 10, 2.5);
      g.fillCircle(18, 10, 2.5);
      
      g.fillStyle(0xffffff, 1);
      g.fillCircle(5.5, 9.5, 1);
      g.fillCircle(17.5, 9.5, 1);

      g.generateTexture('player_body', 24, 30);
    }

    // Generate a monster texture
    if (!this.textures.exists('monster_body')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(0, 0, 22, 22, 6);
      
      // Angry glowing eyes
      g.fillStyle(0xff0000, 1);
      g.fillCircle(5, 7, 2.5);
      g.fillCircle(17, 7, 2.5);
      // Slanted angry eyebrows
      g.lineStyle(1.5, 0x000000, 1);
      g.lineBetween(3, 4, 7, 6);
      g.lineBetween(19, 4, 15, 6);

      // Mouth
      g.fillStyle(0x000000, 1);
      g.fillRect(8, 14, 6, 2);
      
      g.generateTexture('monster_body', 22, 22);
    }
  }

  private createLocalPlayer(x: number, y: number) {
    this.localPlayer = this.physics.add.sprite(x, y, 'player_body');
    this.localPlayer.setTint(parseInt(this.playerColor.replace('#', '0x'), 16));
    
    // Set bounce and collision size
    this.localPlayer.setCollideWorldBounds(true);
    this.localPlayer.body.setGravityY(1000); //snappy gravity
    this.localPlayer.body.setSize(22, 28);
    this.localPlayer.body.setOffset(1, 1);

    // Camera follow local player
    this.cameras.main.startFollow(this.localPlayer, true, 0.15, 0.15);

    // Charge bar graphics helper
    this.chargeBar = this.add.graphics();
    
    // Initialize highest Y in air to the spawn height to prevent initial fall message
    this.highestYInAir = y;
  }

  private setupHostDragControls() {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Toggle dragging
      this.isDragging = true;
      this.dragStartX = pointer.x;
      this.dragStartY = pointer.y;
      this.spectatePlayer(null); // Stop spectating on drag
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) {
        const diffX = pointer.x - this.dragStartX;
        const diffY = pointer.y - this.dragStartY;
        
        // Pan the camera
        this.cameras.main.scrollX -= diffX;
        this.cameras.main.scrollY -= diffY;
        
        this.dragStartX = pointer.x;
        this.dragStartY = pointer.y;

        // Callback to UI
        this.onHostCameraUpdate(this.cameras.main.scrollX, this.cameras.main.scrollY);
      }
    });

    this.input.on('pointerup', () => {
      this.isDragging = false;
    });
  }

  private handleHostCameraControls() {
    // Keyboard camera controls
    let camX = 0;
    let camY = 0;
    const speed = (this.cursors.shift?.isDown) ? this.hostCamSpeed * 2 : this.hostCamSpeed;

    if (this.cursors.left?.isDown || this.keys.A?.isDown) {
      camX = -speed;
    } else if (this.cursors.right?.isDown || this.keys.D?.isDown) {
      camX = speed;
    }

    if (this.cursors.up?.isDown || this.keys.W?.isDown) {
      camY = -speed;
    } else if (this.cursors.down?.isDown || this.keys.S?.isDown) {
      camY = speed;
    }

    if (camX !== 0 || camY !== 0) {
      this.spectatePlayer(null); // Stop spectate when manually moving camera
      this.cameras.main.scrollX += camX;
      this.cameras.main.scrollY += camY;
      
      // Callback to UI
      this.onHostCameraUpdate(this.cameras.main.scrollX, this.cameras.main.scrollY);
    }
  }

  private handlePlayerControls(time: number, delta: number) {
    if (!this.localPlayer) return;
    
    // Disable inputs and reset velocity if paused
    if (this.physics.world.isPaused) {
      this.isCharging = false;
      this.chargeTime = 0;
      this.chargeRatio = 0;
      this.localPlayer.setVelocity(0, 0);
      return;
    }

    if (this.isLocalFrozen) {
      this.localPlayer.setVelocity(0, 0);
      return;
    }

    // Read virtual inputs from window if joystick/mobile is used
    const mobileInput = (window as any).mobileControls || { left: false, right: false, jump: false };

    // Aiming jump direction
    const goLeft = this.cursors.left?.isDown || this.keys.A?.isDown || mobileInput.left;
    const goRight = this.cursors.right?.isDown || this.keys.D?.isDown || mobileInput.right;
    const goUp = this.cursors.up?.isDown || this.keys.W?.isDown;
    const goDown = this.cursors.down?.isDown || this.keys.S?.isDown;

    // Flight controls override
    if (this.isLocalFlying) {
      this.isCharging = false;
      this.chargeTime = 0;
      this.chargeRatio = 0;
      this.localPlayer.setScale(1, 1);
      
      let vx = 0;
      let vy = 0;
      const speed = 250;
      
      if (goLeft) vx = -speed;
      if (goRight) vx = speed;
      if (goUp) vy = -speed;
      if (goDown) vy = speed;
      
      this.localPlayer.setVelocity(vx, vy);
      
      // Spawn nice sparkles while flying
      if (time % 4 === 0) {
        const p = this.add.rectangle(this.localPlayer.x + Phaser.Math.Between(-10, 10), this.localPlayer.y + 14, 4, 4, 0x38bdf8);
        this.tweens.add({
          targets: p,
          alpha: 0,
          y: p.y + 15,
          duration: 400,
          onComplete: () => p.destroy()
        });
      }
      return;
    }

    // Lock jump key at Level 0
    const isPressingJump = (this.cursors.space?.isDown || mobileInput.jump) && this.shoeLevel > 0;

    // Respawn trigger via Key R (React handles the state, but we check key press here)
    if (Phaser.Input.Keyboard.JustDown(this.keys.R)) {
      // We broadcast event by triggering R, React handles the checkpoint lookup
      const rEvent = new CustomEvent('kbd_respawn');
      window.dispatchEvent(rEvent);
    }

    let onGround = this.localPlayer.body.blocked.down || this.localPlayer.body.touching.down;
    
    // Fix micro-bounces on moving platforms (especially when they move down)
    if (!onGround && this.movingPlatformsGroup && this.movingPlatformsGroup.active) {
      this.movingPlatformsGroup.getChildren().forEach((plat: any) => {
        if (plat.body) {
          const platBody = plat.body as Phaser.Physics.Arcade.Body;
          const playerBottom = this.localPlayer.body.bottom;
          const platTop = platBody.top;
          
          const xOverlap = this.localPlayer.body.right > platBody.left && 
                           this.localPlayer.body.left < platBody.right;
                           
          // If player is directly above the platform within 5 pixels and not moving upwards
          if (xOverlap && Math.abs(playerBottom - platTop) <= 5 && this.localPlayer.body.velocity.y >= 0) {
            onGround = true;
            // Snap player Y so that body.bottom is exactly at platTop + 1 (ensure collision)
            this.localPlayer.y = platTop - this.localPlayer.body.halfHeight - this.localPlayer.body.offset.y + 1;
            
            // Match vertical velocity if platform is moving down
            if (platBody.velocity.y > 0) {
              this.localPlayer.setVelocityY(platBody.velocity.y);
            }
          }
        }
      });
    }
    
    // Handle state transitions
    if (onGround && !this.lastOnGround) {
      // Just landed! Reset squashing scale
      this.localPlayer.setScale(1, 1);

      // Check fall distance in meters
      const mapConfig = MAPS[this.mapId] || MAPS.easy;
      const groundY = mapConfig.height - 40;
      const fallStartHeight = Math.max(0, (groundY - this.highestYInAir) / 10);
      const fallEndHeight = Math.max(0, (groundY - this.localPlayer.y) / 10);
      const fallDistance = fallStartHeight - fallEndHeight;

      if (fallDistance > 60) {
        const fallEvent = new CustomEvent('player_long_fall');
        window.dispatchEvent(fallEvent);
      }
      
      this.highestYInAir = this.localPlayer.y;
    }
    this.lastOnGround = onGround;

    // Track highest peak reached in the air
    if (!onGround) {
      if (this.localPlayer.y < this.highestYInAir) {
        this.highestYInAir = this.localPlayer.y;
      }
    } else {
      this.highestYInAir = this.localPlayer.y;
    }

    if (onGround) {
      // --- GROUND CONTROLS ---
      if (isPressingJump) {
        // Start charging transition
        if (!this.isCharging) {
          this.isCharging = true;
          this.chargeTime = 0;
          this.chargeRatio = 0;
          this.jumpDirection = 0; // Default to vertical jump
        }
        
        this.chargeTime += delta;
        this.chargeRatio = Math.min(this.chargeTime / 800, 1); // 0.8s max charge time

        // Set direction: left, right, or reset to center (0) if neither is pressed
        if (goLeft) {
          this.jumpDirection = -1;
        } else if (goRight) {
          this.jumpDirection = 1;
        } else {
          this.jumpDirection = 0;
        }

        // Squash character to show charging
        const squash = 1 - 0.25 * this.chargeRatio;
        const stretch = 1 + 0.1 * this.chargeRatio;
        this.localPlayer.setScale(stretch, squash);
        this.localPlayer.setVelocityX(0); // Cannot move while charging
      } else {
        // --- JUMP LAUNCH! ---
        if (this.isCharging) {
          this.isCharging = false;
          this.localPlayer.setScale(1, 1);

          // Calculate velocities based on shoe level
          let minVy = -320;
          let maxVy = -750;
          let minVx = 100;
          let maxVx = 350;
          
          if (this.shoeLevel === 1) {
            minVy = -260;
            maxVy = -580; // Slightly higher than half height
            minVx = 85;
            maxVx = 280;
          }

          const launchVy = minVy + (maxVy - minVy) * this.chargeRatio;

          let launchVx = 0;
          if (this.jumpDirection !== 0) {
            launchVx = this.jumpDirection * (minVx + (maxVx - minVx) * this.chargeRatio);
          }

          // Launch!
          this.localPlayer.setVelocity(launchVx, launchVy);
          this.chargeTime = 0;
          this.chargeRatio = 0;
        } else {
          // --- REGULAR WALKING ON GROUND ---
          let onSlippery = false;
          if (this.slipperyPlatformsGroup && this.slipperyPlatformsGroup.active) {
            this.slipperyPlatformsGroup.getChildren().forEach((plat: any) => {
              if (Phaser.Geom.Intersects.RectangleToRectangle(this.localPlayer.getBounds(), plat.getBounds())) {
                onSlippery = true;
              }
            });
          }

          if (goLeft) {
            this.localPlayer.setVelocityX(-180);
          } else if (goRight) {
            this.localPlayer.setVelocityX(180);
          } else {
            if (onSlippery) {
              const vx = this.localPlayer.body.velocity.x;
              if (Math.abs(vx) < 5) {
                this.localPlayer.setVelocityX(0);
              } else {
                this.localPlayer.setVelocityX(vx * 0.96);
              }
            } else {
              this.localPlayer.setVelocityX(0);
            }
          }

          // Spark/dust trail on ground for upgraded shoes
          if (this.shoeLevel > 0 && Math.abs(this.localPlayer.body.velocity.x) > 50 && time % 5 === 0) {
            const dust = this.add.rectangle(this.localPlayer.x, this.localPlayer.y + 14, 4, 4, 0x06b6d4);
            this.tweens.add({
              targets: dust,
              alpha: 0,
              scale: 0.1,
              y: dust.y - 8,
              duration: 300,
              onComplete: () => dust.destroy()
            });
          }
        }
      }
    } else {
      // --- AIR CONTROLS (JUMP KING STYLE: NO AIR CONTROL) ---
      // Disable charging if user was charging but got knocked into air
      if (this.isCharging) {
        this.isCharging = false;
        this.chargeTime = 0;
        this.chargeRatio = 0;
        this.localPlayer.setScale(1, 1);
      }

      // Stretch character slightly to reflect falling speed
      const vy = this.localPlayer.body.velocity.y;
      if (Math.abs(vy) > 100) {
        const stretch = Math.min(1 + Math.abs(vy) / 2500, 1.25);
        const squash = 1 / stretch;
        this.localPlayer.setScale(squash, stretch);
      } else {
        this.localPlayer.setScale(1, 1);
      }

      // Handle Wall Bouncing
      const hitLeft = this.localPlayer.body.blocked.left;
      const hitRight = this.localPlayer.body.blocked.right;
      if (hitLeft || hitRight) {
        const vx = this.localPlayer.body.velocity.x;
        // Bounce in opposite direction if we have some horizontal velocity
        if (Math.abs(vx) > 30) {
          this.localPlayer.setVelocityX(-vx * 0.65); // Bouncy wall
          this.cameras.main.shake(100, 0.005); // Tiny shake for impact feel
        }
      }
    }
  }

  private handlePlatformCollision() {
    // Left empty, standard arcade physics resolves collision
  }

  private handleCollapsingPlatformCollision(playerObj: any, platformObj: any) {
    this.handlePlatformCollision();
    
    // Only collapse if player lands on top of the platform
    if (playerObj.body.touching.down && platformObj.body.touching.up) {
      const isAlreadyCollapsing = platformObj.getData('collapsingState');
      if (!isAlreadyCollapsing) {
        platformObj.setData('collapsingState', true);
        
        // Shake tween
        const originalX = platformObj.x;
        this.tweens.add({
          targets: platformObj,
          x: originalX + 4,
          duration: 50,
          yoyo: true,
          repeat: 19, // 20 cycles of 100ms = 2000ms (2 seconds) total
          onComplete: () => {
            // Restore original X after shake
            platformObj.x = originalX;
            // Hide and disable collision
            platformObj.setVisible(false);
            platformObj.body.enable = false;
            
            // Respawn after 3 seconds
            this.time.delayedCall(3000, () => {
              platformObj.setVisible(true);
              platformObj.body.enable = true;
              platformObj.setData('collapsingState', false);
              // Fade in
              platformObj.alpha = 0;
              this.tweens.add({
                targets: platformObj,
                alpha: 1,
                duration: 200
              });
            });
          }
        });
      }
    }
  }

  private handleBoosterCollision(playerObj: any, boosterObj: any) {
    this.handlePlatformCollision();
    
    // Check if player touched the top of booster platform
    if (playerObj.body.touching.down && boosterObj.body.touching.up) {
      playerObj.setVelocityY(-480); // Substantial upward push
      // Visual indicator on player
      this.tweens.add({
        targets: playerObj,
        alpha: 0.4,
        duration: 80,
        yoyo: true,
        repeat: 3
      });
    }
  }



  private handleMonsterOverlap(playerObj: any, monsterObj: any) {
    if (this.isHost || !this.localPlayer || this.isInvincible) return;

    this.isInvincible = true;
    
    const force = monsterObj.getData('knockbackForce') || 350;
    const direction = (this.localPlayer.x < monsterObj.x) ? -1 : 1;
    
    // Set knockback velocity
    this.localPlayer.setVelocity(direction * force, -350);

    // Shake camera for heavy impact feedback
    this.cameras.main.shake(150, 0.012);

    // Flash player to show they got hit
    this.tweens.add({
      targets: this.localPlayer,
      alpha: 0.2,
      duration: 80,
      yoyo: true,
      repeat: 6,
      onComplete: () => {
        this.isInvincible = false;
        if (this.localPlayer) this.localPlayer.setAlpha(1);
      }
    });
  }

  private handleGoalOverlap() {
    this.onReachGoal();
  }

  private updateChargeBar() {
    this.chargeBar.clear();
    
    if (this.isCharging && this.localPlayer) {
      const px = this.localPlayer.x;
      const py = this.localPlayer.y;

      // Draw aim arrow line
      this.chargeBar.lineStyle(4, 0xf59e0b, 0.8);
      this.chargeBar.beginPath();
      this.chargeBar.moveTo(px, py);
      
      const arrowLength = 40 + 40 * this.chargeRatio;
      let angle = -Math.PI / 2; // Straight up
      if (this.jumpDirection === -1) {
        angle = -Math.PI * 0.7; // Left angle
      } else if (this.jumpDirection === 1) {
        angle = -Math.PI * 0.3; // Right angle
      }

      const targetX = px + Math.cos(angle) * arrowLength;
      const targetY = py + Math.sin(angle) * arrowLength;
      this.chargeBar.lineTo(targetX, targetY);
      
      // Draw arrowhead
      this.chargeBar.strokePath();

      // Draw power bar
      const width = 36;
      const height = 6;
      const bx = px - width / 2;
      const by = py - 30;

      // Background
      this.chargeBar.fillStyle(0x334155, 0.8);
      this.chargeBar.fillRect(bx, by, width, height);

      // Foreground power color
      let color = 0x10b981; // Green
      if (this.chargeRatio > 0.75) {
        color = 0xef4444; // Red
      } else if (this.chargeRatio > 0.4) {
        color = 0xf59e0b; // Yellow
      }

      this.chargeBar.fillStyle(color, 1);
      this.chargeBar.fillRect(bx, by, width * this.chargeRatio, height);
    }
  }

  private interpolateRemotePlayers() {
    this.remotePlayers.forEach((remote) => {
      // Smooth linear interpolation (lerp)
      remote.sprite.x += (remote.targetX - remote.sprite.x) * 0.25;
      remote.sprite.y += (remote.targetY - remote.sprite.y) * 0.25;

      // Update nametag position
      remote.nameTag.setPosition(remote.sprite.x, remote.sprite.y - 25);
    });
  }

  private syncPositionWithThrottle(time: number) {
    if (!this.localPlayer || this.physics.world.isPaused) return;

    // Throttle to roughly 10 updates per second (every 100ms)
    if (time - this.lastUpdateTime > 100) {
      const mapConfig = MAPS[this.mapId] || MAPS.easy;
      const x = this.localPlayer.x;
      const y = this.localPlayer.y;
      
      // Height calculation: ground y minus current y.
      // Maximum height is the highest altitude they've climbed.
      const groundY = mapConfig.height - 40;
      const currentHeight = Math.max(0, (groundY - y) / 10); // scale factor: 10 pixels = 1 meter
      
      this.onPositionUpdate({
        x,
        y,
        vx: this.localPlayer.body.velocity.x,
        vy: this.localPlayer.body.velocity.y,
        height: currentHeight,
        shoeLevel: this.shoeLevel,
        isFlying: this.isLocalFlying
      } as any);
      
      this.lastUpdateTime = time;
    }
  }

  public setGamePaused(paused: boolean) {
    if (paused) {
      this.physics.world.pause();
      if (!this.pauseText) {
        this.pauseText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, 'TẠM DỪNG', {
          fontSize: '32px',
          color: '#ef4444',
          fontStyle: 'bold',
          backgroundColor: 'rgba(0,0,0,0.65)',
          padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
      }
      this.pauseText.setVisible(true);
    } else {
      this.physics.world.resume();
      if (this.pauseText) {
        this.pauseText.setVisible(false);
      }
    }
  }
  private handleCoinOverlap(playerObj: any, coinObj: any) {
    if (this.isHost) return;
    
    const mapConfig = MAPS[this.mapId] || MAPS.easy;
    const groundY = mapConfig.height;
    const currentHeight = Math.max(0, (groundY - playerObj.y) / 10);
    
    const coinValue = 1 + Math.floor(currentHeight / 100);
    
    // Hide and disable coin collision
    coinObj.setVisible(false);
    if (coinObj.body) {
      coinObj.body.enable = false;
    }
    
    const text = this.add.text(coinObj.x, coinObj.y - 10, `+${coinValue}`, {
      fontSize: '14px',
      color: '#facc15',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);
    
    this.tweens.add({
      targets: text,
      y: text.y - 45,
      alpha: 0,
      duration: 800,
      onComplete: () => text.destroy()
    });
    
    // Respawn after 3 seconds (3000ms)
    this.time.delayedCall(3000, () => {
      if (coinObj && coinObj.scene) {
        coinObj.setVisible(true);
        if (coinObj.body) {
          coinObj.body.enable = true;
        }
        
        // Fade in
        coinObj.alpha = 0;
        this.tweens.add({
          targets: coinObj,
          alpha: 1,
          duration: 200
        });
      }
    });
    
    const event = new CustomEvent('coin_collected', {
      detail: {
        value: coinValue
      }
    });
    window.dispatchEvent(event);
  }

  private handleFlightItemOverlap(playerObj: any, itemObj: any) {
    if (this.isHost || !this.localPlayer || !this.localPlayer.active) return;
    
    // Disable item temporarily (cooldown)
    itemObj.setVisible(false);
    if (itemObj.body) {
      itemObj.body.enable = false;
    }
    
    // Cooldown 15s to respawn the flight item
    this.time.delayedCall(15000, () => {
      if (itemObj && itemObj.scene) {
        itemObj.setVisible(true);
        if (itemObj.body) {
          itemObj.body.enable = true;
        }
        
        // Fade in effect
        itemObj.alpha = 0;
        this.tweens.add({
          targets: itemObj,
          alpha: 1,
          duration: 200
        });
      }
    });

    // Call UI callback
    if (this.onOverlapFlightItem) {
      this.onOverlapFlightItem();
    }
  }

  public activateFlight(duration: number) {
    if (this.isHost || !this.localPlayer || !this.localPlayer.active) return;
    
    this.isLocalFlying = true;
    this.isLocalFrozen = false; // Flight overrides freeze
    this.localPlayer.body.setGravityY(0);
    this.localPlayer.setVelocity(0, 0); // Reset velocity initially
    
    // Flash blue/cyan representing flight mode
    this.tweens.add({
      targets: this.localPlayer,
      alpha: 0.5,
      duration: 100,
      yoyo: true,
      repeat: 3
    });
    
    // Set timer to end flight
    this.time.delayedCall(duration, () => {
      this.isLocalFlying = false;
      if (this.localPlayer && this.localPlayer.active) {
        this.localPlayer.body.setGravityY(1000); // restore snappy gravity
        this.localPlayer.setAlpha(1);
        // Reset player color/tint just in case
        this.localPlayer.setTint(parseInt(this.playerColor.replace('#', '0x'), 16));
      }
    });
  }

  public freezePlayer(duration: number) {
    if (this.isHost || !this.localPlayer || !this.localPlayer.active) return;
    if (this.isLocalFlying) return; // Flight mode cannot be frozen
    
    this.isLocalFrozen = true;
    this.localPlayer.setVelocity(0, 0);
    this.localPlayer.body.setGravityY(0); // float/freeze in place
    
    // Tint player red to indicate frozen
    this.localPlayer.setTint(0xef4444);
    
    this.time.delayedCall(duration, () => {
      this.isLocalFrozen = false;
      if (this.localPlayer && this.localPlayer.active) {
        this.localPlayer.body.setGravityY(1000); // restore gravity
        this.localPlayer.setTint(parseInt(this.playerColor.replace('#', '0x'), 16));
      }
    });
  }
}
