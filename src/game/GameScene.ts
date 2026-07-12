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
  private checkpointsGroup!: Phaser.Physics.Arcade.StaticGroup;
  private goalZone!: Phaser.GameObjects.Rectangle;

  // Jump King Physics Variables
  private isCharging: boolean = false;
  private chargeTime: number = 0;
  private chargeRatio: number = 0;
  private jumpDirection: number = 0; // -1 = left, 0 = up, 1 = right
  private lastOnGround: boolean = true;

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

  // Callbacks to React
  private onReachCheckpoint!: (id: number) => void;
  private onReachGoal!: () => void;
  private onPositionUpdate!: (state: { x: number; y: number; vx: number; vy: number; height: number }) => void;
  private onHostCameraUpdate!: (x: number, y: number) => void;

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
    onPositionUpdate: (state: { x: number; y: number; vx: number; vy: number; height: number }) => void;
    onHostCameraUpdate: (x: number, y: number) => void;
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

    this.remotePlayers.clear();
    this.isCharging = false;
    this.chargeTime = 0;
    this.chargeRatio = 0;
    this.jumpDirection = 0;
    this.spectateTargetId = null;
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

    // Create static platforms group
    this.platformsGroup = this.physics.add.staticGroup();
    mapConfig.platforms.forEach((plat) => {
      // Draw platform
      const rect = this.add.rectangle(plat.x, plat.y, plat.width, plat.height, parseInt(plat.color?.replace('#', '0x') || '0x475569', 16));
      this.platformsGroup.add(rect);
      // Give physics properties
      const body = rect.body as Phaser.Physics.Arcade.StaticBody;
      body.updateFromGameObject();
    });

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
    } else {
      // Setup host free camera dragging controls
      this.setupHostDragControls();
      // Initially focus camera near spawn point or mid map
      this.cameras.main.setScroll(mapConfig.width / 2 - this.cameras.main.width / 2, mapConfig.height - 400);
    }

    // Set up collisions & overlaps
    if (!this.isHost) {
      this.physics.add.collider(this.localPlayer, this.platformsGroup, this.handlePlatformCollision, undefined, this);
      this.physics.add.overlap(this.localPlayer, this.checkpointsGroup, this.handleCheckpointOverlap, undefined, this);
      this.physics.add.overlap(this.localPlayer, this.goalZone, this.handleGoalOverlap, undefined, this);
    }

    if (this.isInitiallyPaused) {
      this.setGamePaused(true);
    }
  }

  public update(time: number, delta: number) {
    // Checkpoint Enter/Leave Triggers
    if (!this.isHost) {
      if (this.overlappingCheckpointId !== this.lastOverlappingCheckpointId) {
        if (this.overlappingCheckpointId !== -1) {
          const event = new CustomEvent('enter_checkpoint', { detail: { id: this.overlappingCheckpointId } });
          window.dispatchEvent(event);
        } else {
          const event = new CustomEvent('leave_checkpoint', { detail: { id: this.lastOverlappingCheckpointId } });
          window.dispatchEvent(event);
        }
        this.lastOverlappingCheckpointId = this.overlappingCheckpointId;
      }
      this.overlappingCheckpointId = -1; // Reset for physics overlap step
    }

    if (this.isHost) {
      this.handleHostCameraControls();
    } else {
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
  }

  // Update list of remote players
  public updatePlayers(players: Record<string, PlayerState>) {
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
        if (p.isFinished) {
          remote.nameTag.setText(`🏁 ${p.name}`);
          remote.nameTag.setColor('#f59e0b');
        } else {
          remote.nameTag.setText(`${p.name} (${Math.round(p.height)}m)`);
        }
      } else {
        // Create new remote player sprite
        const sprite = this.add.sprite(p.x, p.y, 'player_body');
        sprite.setTint(parseInt(p.color.replace('#', '0x'), 16));
        sprite.setAlpha(0.5); // Ghost effect
        sprite.setVisible(!p.offline);
        
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

    const onGround = this.localPlayer.body.blocked.down;
    
    // Handle state transitions
    if (onGround && !this.lastOnGround) {
      // Just landed! Reset squashing scale
      this.localPlayer.setScale(1, 1);
    }
    this.lastOnGround = onGround;

    // Respawn trigger via Key R (React handles the state, but we check key press here)
    if (Phaser.Input.Keyboard.JustDown(this.keys.R)) {
      // We broadcast event by triggering R, React handles the checkpoint lookup
      const rEvent = new CustomEvent('kbd_respawn');
      window.dispatchEvent(rEvent);
    }

    // Read virtual inputs from window if joystick/mobile is used
    const mobileInput = (window as any).mobileControls || { left: false, right: false, jump: false };

    // Aiming jump direction
    const goLeft = this.cursors.left?.isDown || this.keys.A?.isDown || mobileInput.left;
    const goRight = this.cursors.right?.isDown || this.keys.D?.isDown || mobileInput.right;
    const isPressingJump = this.cursors.space?.isDown || mobileInput.jump;

    if (onGround) {
      // --- GROUND CONTROLS ---
      if (isPressingJump) {
        // Start charging
        this.isCharging = true;
        this.chargeTime += delta;
        this.chargeRatio = Math.min(this.chargeTime / 800, 1); // 0.8s max charge time

        // Set direction
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

          // Calculate velocities
          const minVy = -320;
          const maxVy = -700;
          const launchVy = minVy + (maxVy - minVy) * this.chargeRatio;

          let launchVx = 0;
          if (this.jumpDirection !== 0) {
            const minVx = 100;
            const maxVx = 350;
            launchVx = this.jumpDirection * (minVx + (maxVx - minVx) * this.chargeRatio);
          }

          // Launch!
          this.localPlayer.setVelocity(launchVx, launchVy);
          this.chargeTime = 0;
          this.chargeRatio = 0;
        } else {
          // --- REGULAR WALKING ON GROUND ---
          if (goLeft) {
            this.localPlayer.setVelocityX(-180);
          } else if (goRight) {
            this.localPlayer.setVelocityX(180);
          } else {
            this.localPlayer.setVelocityX(0);
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

  private handleCheckpointOverlap(playerObj: any, cpObj: any) {
    const cpId = cpObj.getData('checkpointId');
    if (typeof cpId === 'number') {
      this.overlappingCheckpointId = cpId;
    }
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
        height: currentHeight
      });
      
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
}
