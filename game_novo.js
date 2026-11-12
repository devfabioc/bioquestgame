/* =====================================================
   BIOQUEST — FABIOLOGIA
   game.js (v3: energia, itens, arma e mais inimigos) — Phaser 3
   ===================================================== */

const WIDTH = 1280;
const HEIGHT = 720;
const WORLD_WIDTH = 2560;
const GROUND_TOP = 665;          // topo do chão
const JUMP_SPEED = 560;
const TERMINAL_XS = [450, 1330, 1900];

const MAX_ENERGY = 100;
const MAX_LIVES = 5;
const START_AMMO = 5;
const SHIELD_MS = 6000;

const WORLDS = [
  {
    name: "FLORESTA DA ECOLOGIA",
    color: 0x91d9a2,
    tint: 0xffffff,
    weapon: "SEMENTES",
    shotTint: 0xb6ff6b,
    questions: [
      {
        q: "Qual relação ecológica ocorre quando um organismo captura outro para se alimentar?",
        a: ["Mutualismo", "Predatismo", "Comensalismo", "Inquilinismo"],
        c: 1,
        e: "No predatismo, um organismo captura e consome outro."
      },
      {
        q: "Os produtores de uma cadeia alimentar são geralmente:",
        a: ["Fungos", "Carnívoros", "Autotróficos", "Decompositores"],
        c: 2,
        e: "Os produtores fabricam matéria orgânica, geralmente por fotossíntese."
      },
      {
        q: "O que acontece com a energia ao longo da cadeia alimentar?",
        a: ["Aumenta", "É totalmente reciclada", "Parte é dissipada como calor", "Permanece constante"],
        c: 2,
        e: "Parte da energia é dissipada como calor em cada nível trófico."
      }
    ]
  },
  {
    name: "INVASÃO VIRAL",
    color: 0x263e75,
    tint: 0xb8a8ff,
    weapon: "ANTICORPOS",
    shotTint: 0x7fd0ff,
    questions: [
      {
        q: "Os vírus dependem de células hospedeiras porque:",
        a: ["Produzem seu próprio ATP", "Precisam da maquinaria celular para se reproduzir", "Possuem núcleo", "Realizam fotossíntese"],
        c: 1,
        e: "Os vírus são parasitas intracelulares obrigatórios."
      },
      {
        q: "A vacinação estimula:",
        a: ["A memória imunológica", "A digestão", "A produção de hemácias", "A coagulação"],
        c: 0,
        e: "A vacinação estimula a formação de células de memória."
      },
      {
        q: "Os antibióticos atuam principalmente contra:",
        a: ["Vírus", "Bactérias", "Príons", "Protozoários"],
        c: 1,
        e: "Antibióticos são utilizados contra infecções bacterianas."
      }
    ]
  },
  {
    name: "LABORATÓRIO CELULAR",
    color: 0x34436f,
    tint: 0x9fe8ff,
    weapon: "ENZIMAS",
    shotTint: 0xff9df0,
    questions: [
      {
        q: "Qual organela está relacionada à produção de ATP?",
        a: ["Lisossomo", "Mitocôndria", "Ribossomo", "Centríolo"],
        c: 1,
        e: "A mitocôndria participa da respiração celular."
      },
      {
        q: "A síntese de proteínas ocorre nos:",
        a: ["Ribossomos", "Lisossomos", "Vacúolos", "Centríolos"],
        c: 0,
        e: "Os ribossomos realizam a síntese proteica."
      },
      {
        q: "O DNA é formado por unidades chamadas:",
        a: ["Aminoácidos", "Lipídios", "Nucleotídeos", "Glicídios"],
        c: 2,
        e: "Os nucleotídeos formam a molécula de DNA."
      }
    ]
  }
];

class BioQuest extends Phaser.Scene {

  constructor() {
    super("BioQuest");
  }

  init(data = {}) {
    this.worldIndex = data.worldIndex ?? 0;
    this.score = data.score ?? 0;
    this.lives = data.lives ?? 3;
    this.coins = data.coins ?? 0;
    this.energy = data.energy ?? MAX_ENERGY;
    this.ammo = data.ammo ?? START_AMMO;

    this.questionIndex = 0;
    this.answered = 0;

    this.started = false;
    this.quizOpen = false;
    this.finished = false;
    this.resultShown = false;

    this.invulnUntil = 0;
    this.hurtUntil = 0;
    this.knockUntil = 0;
    this.shieldUntil = 0;
    this.nextShot = 0;
    this.toastCooldown = 0;
    this.ammoToastAt = 0;
    this.facing = 1;

    // zera o estado dos botões de toque
    this.touch = { left: false, right: false, crouch: false };
    this.jumpRequested = false;
    this.interactRequested = false;
    this.fireRequested = false;

    this.quizObjects = [];
    this.quizKeyHandler = null;
    this.toastText = null;
  }

  preload() {
    this.load.spritesheet(
      "fabiologia",
      "assets/personagem/fabiologia_spritesheet.png",
      { frameWidth: 384, frameHeight: 512 }
    );
  }

  create() {
    this.world = WORLDS[this.worldIndex];

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, HEIGHT);

    this.hasSprite =
      this.textures.exists("fabiologia") &&
      this.textures.get("fabiologia").frameTotal >= 8;

    this.createBackground();
    this.createTextures();
    this.createLevel();
    this.createPlayer();
    this.createAnimations();
    this.createControls();
    this.createHUD();
    this.createCollisions();
    this.createStartScreen();

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
  }

  /* ---------------- CENÁRIO ---------------- */

  createBackground() {
    this.cameras.main.setBackgroundColor(this.world.color);

    const bg = this.add.graphics();
    bg.fillStyle(this.world.color);
    bg.fillRect(0, 0, WORLD_WIDTH, HEIGHT);

    if (this.worldIndex === 0) {
      for (let x = 0; x < WORLD_WIDTH; x += 180) {
        bg.fillStyle(0x34734a);
        bg.fillCircle(x + 70, 400, 85);
        bg.fillStyle(0x28583a);
        bg.fillRect(x + 62, 400, 18, 265);
      }
    } else {
      for (let i = 0; i < 60; i++) {
        bg.fillStyle(0xffffff, 0.35);
        bg.fillCircle(
          Phaser.Math.Between(0, WORLD_WIDTH),
          Phaser.Math.Between(0, 450),
          Phaser.Math.Between(1, 3)
        );
      }
    }

    bg.setScrollFactor(0.25);
  }

  createTextures() {
    const make = (name, w, h, draw) => {
      if (this.textures.exists(name)) return;
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      draw(g);
      g.generateTexture(name, w, h);
      g.destroy();
    };

    make("ground", 128, 32, g => {
      g.fillStyle(0x326b42);
      g.fillRect(0, 0, 128, 32);
      g.fillStyle(0x79d66e);
      g.fillRect(0, 0, 128, 7);
    });

    make("platform", 150, 22, g => {
      g.fillStyle(0x536e7b);
      g.fillRoundedRect(0, 0, 150, 22, 6);
      g.fillStyle(0x7be3ac);
      g.fillRect(0, 0, 150, 5);
    });

    make("coin", 32, 32, g => {
      g.fillStyle(0xffd12e);
      g.fillCircle(16, 16, 14);
      g.lineStyle(3, 0xffffff);
      g.strokeCircle(16, 16, 10);
    });

    make("enemy", 48, 48, g => {
      g.fillStyle(0xe54e64);
      g.fillCircle(24, 24, 21);
      g.fillStyle(0xffffff);
      g.fillCircle(17, 18, 5);
      g.fillCircle(31, 18, 5);
      g.fillStyle(0x111111);
      g.fillCircle(17, 18, 2);
      g.fillCircle(31, 18, 2);
    });

    make("flyer", 56, 44, g => {
      g.fillStyle(0x7b4fd6);
      g.fillTriangle(0, 8, 22, 22, 6, 36);
      g.fillTriangle(56, 8, 34, 22, 50, 36);
      g.fillStyle(0xa66bff);
      g.fillCircle(28, 24, 16);
      g.fillStyle(0xffffff);
      g.fillCircle(22, 20, 4);
      g.fillCircle(34, 20, 4);
      g.fillStyle(0x111111);
      g.fillCircle(22, 20, 2);
      g.fillCircle(34, 20, 2);
    });

    make("spike", 32, 34, g => {
      g.fillStyle(0xffffff);
      g.fillTriangle(0, 34, 16, 0, 32, 34);
    });

    make("portal", 80, 96, g => {
      g.fillStyle(0x50f5d7, 0.3);
      g.fillEllipse(40, 48, 70, 90);
      g.lineStyle(7, 0x50f5d7);
      g.strokeEllipse(40, 48, 52, 80);
    });

    make("terminal", 64, 70, g => {
      g.fillStyle(0x183d50);
      g.fillRoundedRect(3, 3, 58, 64, 7);
      g.fillStyle(0x6ce8cf);
      g.fillRect(11, 11, 42, 34);
    });

    // tiro
    make("shot", 16, 16, g => {
      g.fillStyle(0xffffff);
      g.fillCircle(8, 8, 7);
      g.lineStyle(2, 0x222222);
      g.strokeCircle(8, 8, 7);
    });

    // itens
    make("energy", 32, 32, g => {
      g.fillStyle(0x3ddc84);
      g.fillCircle(16, 16, 15);
      g.lineStyle(2, 0xffffff);
      g.strokeCircle(16, 16, 15);
      g.fillStyle(0xffffff);
      g.fillRect(13, 7, 6, 18);
      g.fillRect(7, 13, 18, 6);
    });

    make("heart", 32, 32, g => {
      g.fillStyle(0xff5c7a);
      g.fillCircle(10, 11, 8);
      g.fillCircle(22, 11, 8);
      g.fillTriangle(3, 15, 29, 15, 16, 30);
    });

    make("ammo", 32, 32, g => {
      g.fillStyle(0xffb347);
      g.fillRoundedRect(2, 6, 28, 22, 4);
      g.lineStyle(2, 0x7a4a00);
      g.strokeRoundedRect(2, 6, 28, 22, 4);
      g.fillStyle(0xffffff);
      g.fillTriangle(18, 8, 9, 19, 16, 19);
      g.fillTriangle(14, 26, 23, 15, 16, 15);
    });

    make("shield", 32, 32, g => {
      g.fillStyle(0x4fc3f7);
      g.fillRect(4, 3, 24, 14);
      g.fillTriangle(4, 16, 28, 16, 16, 30);
      g.lineStyle(2, 0xffffff);
      g.strokeRect(4, 3, 24, 14);
    });
  }

  createLevel() {
    this.platforms = this.physics.add.staticGroup();
    this.hazards = this.physics.add.staticGroup();
    this.terminals = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group();                       // andadores
    this.flyers = this.physics.add.group({ allowGravity: false }); // voadores
    this.shots = this.physics.add.group({ allowGravity: false });
    this.pickups = this.physics.add.group({ allowGravity: false, immovable: true });
    this.coinsGroup = this.physics.add.group({ allowGravity: false, immovable: true });

    // chão: UM único corpo
    this.ground = this.add.tileSprite(
      WORLD_WIDTH / 2, 681, WORLD_WIDTH, 32, "ground"
    ).setTint(this.world.tint);
    this.physics.add.existing(this.ground, true);

    [
      [330, 550], [560, 460], [790, 535],
      [1020, 445], [1260, 520], [1480, 455],
      [1710, 535], [1940, 445], [2180, 520]
    ].forEach(([x, y]) => {
      this.platforms.create(x, y, "platform")
        .setTint(this.world.tint)
        .refreshBody();
    });

    // moedas
    [
      [430, 500], [650, 410], [890, 480],
      [1110, 400], [1360, 470], [1590, 410],
      [1830, 480], [2070, 400], [2290, 465],
      [180, 640], [1120, 640], [1650, 640], [2300, 640]
    ].forEach(([x, y]) => {
      const coin = this.coinsGroup.create(x, y, "coin");
      coin.body.setAllowGravity(false);
      this.tweens.add({
        targets: coin,
        y: y - 9,
        duration: 600,
        yoyo: true,
        repeat: -1
      });
    });

    // itens para pegar
    [
      ["ammo", 250, 635],
      ["ammo", 330, 505],
      ["energy", 560, 415],
      ["shield", 790, 490],
      ["ammo", 1020, 400],
      ["energy", 1050, 635],
      ["energy", 1260, 475],
      ["life", 1480, 410],
      ["ammo", 1710, 490],
      ["energy", 1940, 400],
      ["ammo", 2000, 635],
      ["shield", 2180, 475],
      ["energy", 2380, 635]
    ].forEach(([type, x, y]) => this.spawnPickup(type, x, y));

    // espinhos
    [720, 1210, 1780].forEach(x => {
      this.hazards.create(x, GROUND_TOP - 17, "spike").refreshBody();
    });

    // inimigos andadores
    [650, 900, 1130, 1530, 1700, 2110, 2330].forEach(x => this.spawnWalker(x));

    // inimigos voadores
    [[760, 330], [1400, 300], [2050, 320]].forEach(([x, y]) => this.spawnFlyer(x, y));

    // terminais de desafio
    this.totalChallenges = TERMINAL_XS.length;

    TERMINAL_XS.forEach(x => {
      const t = this.terminals.create(x, GROUND_TOP - 35, "terminal");
      t.refreshBody();
      t.setData("used", false);

      const label = this.add.text(x, GROUND_TOP - 95, "[E] DESAFIO", {
        fontSize: "14px",
        color: "#ffffff",
        backgroundColor: "#092b35",
        padding: { x: 6, y: 3 }
      }).setOrigin(0.5).setDepth(5);

      t.setData("label", label);
    });

    // portal começa bloqueado
    this.portalOpen = false;
    this.portal = this.physics.add.staticImage(2460, GROUND_TOP - 48, "portal");
    this.portal.setAlpha(0.3);
    this.portal.refreshBody();

    this.portalLabel = this.add.text(2460, GROUND_TOP - 120, "BLOQUEADO", {
      fontSize: "14px",
      color: "#ffe16a",
      backgroundColor: "#092b35",
      padding: { x: 6, y: 3 }
    }).setOrigin(0.5).setDepth(5);
  }

  spawnPickup(type, x, y) {
    const item = this.pickups.create(x, y, type);
    item.body.setAllowGravity(false);
    item.setData("type", type);

    this.tweens.add({
      targets: item,
      y: y - 8,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });

    return item;
  }

  spawnWalker(x) {
    const speed = 60 + this.worldIndex * 18;
    const strong = this.worldIndex > 0;

    const e = this.enemies.create(x, GROUND_TOP - 24, "enemy");
    e.setBounce(0);
    e.setVelocityX(speed);
    e.setCollideWorldBounds(true);

    e.setData({
      type: "walker",
      left: x - 100,
      right: x + 100,
      speed,
      hp: strong ? 2 : 1,
      dmg: 20,
      tint: strong ? 0xff9a5c : 0
    });

    if (strong) e.setTint(0xff9a5c);
  }

  spawnFlyer(x, y) {
    const f = this.flyers.create(x, y, "flyer");
    f.body.setAllowGravity(false);

    const speed = 70 + this.worldIndex * 15;
    f.setVelocityX(speed);

    f.setData({
      type: "flyer",
      left: x - 160,
      right: x + 160,
      baseY: y,
      phase: Math.random() * 6,
      amp: 40,
      speed,
      hp: 2,
      dmg: 15,
      tint: 0
    });
  }

  createPlayer() {
    if (this.hasSprite) {
      this.player = this.physics.add.sprite(100, 560, "fabiologia", 0);
      this.player.setScale(0.16);
      this.player.body.setSize(175, 350);
      this.player.body.setOffset(104, 105);
    } else {
      this.player = this.physics.add.sprite(100, 560, "enemy");
      this.player.setTint(0x6be58c);
    }

    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    this.player.setMaxVelocity(260, 800);
    this.player.setBounce(0);

    this.checkpointX = 100;
    this.checkpointY = 560;
  }

  createAnimations() {
    if (!this.hasSprite) return;

    const defs = [
      ["idle", [0], 1, -1],
      ["run", [1, 2, 3], 10, -1],
      ["crouch", [4], 1, -1],
      ["jump", [5], 1, 0],
      ["hurt", [6], 1, 0],
      ["lookUp", [7], 1, -1]
    ];

    defs.forEach(([key, frames, rate, repeat]) => {
      if (this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers("fabiologia", { frames }),
        frameRate: rate,
        repeat
      });
    });
  }

  /* ---------------- CONTROLES ---------------- */

  createControls() {
    this.keys = this.input.keyboard.addKeys({
      left: "LEFT",
      right: "RIGHT",
      up: "UP",
      down: "DOWN",
      jump: "SPACE",
      a: "A",
      d: "D",
      e: "E",
      fire: "F",
      fire2: "X"
    });

    if (!this.sys.game.device.input.touch) return;

    this.createTouchButton(60, 620, "◀",
      () => this.touch.left = true, () => this.touch.left = false);
    this.createTouchButton(140, 620, "▶",
      () => this.touch.right = true, () => this.touch.right = false);
    this.createTouchButton(1040, 620, "↓",
      () => this.touch.crouch = true, () => this.touch.crouch = false);
    this.createTouchButton(1130, 620, "↑",
      () => this.jumpRequested = true, () => {});
    this.createTouchButton(1210, 620, "E",
      () => this.interactRequested = true, () => {});
    this.createTouchButton(950, 620, "F",
      () => this.fireRequested = true, () => {});
  }

  createTouchButton(x, y, label, onDown, onUp) {
    const circle = this.add.circle(x, y, 32, 0x092b35, 0.8)
      .setStrokeStyle(2, 0x9de6d2)
      .setScrollFactor(0)
      .setDepth(100)
      .setInteractive();

    this.add.text(x, y, label, {
      fontSize: "27px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

    circle.on("pointerdown", () => {
      onDown();
      circle.setFillStyle(0x287f70);
    });

    const release = () => {
      onUp();
      circle.setFillStyle(0x092b35, 0.8);
    };

    circle.on("pointerup", release);
    circle.on("pointerout", release);
    circle.on("pointerupoutside", release);
  }

  /* ---------------- HUD ---------------- */

  createHUD() {
    this.hud = this.add.container(0, 0).setScrollFactor(0).setDepth(150);

    const bg = this.add.rectangle(640, 42, 1240, 68, 0x092b35, 0.9)
      .setStrokeStyle(2, 0x70d9ad);

    this.hudTitle = this.add.text(25, 10, this.world.name, {
      fontSize: "20px", color: "#ffffff", fontStyle: "bold"
    });

    this.hudScore = this.add.text(650, 10, "", {
      fontSize: "20px", color: "#ffe16a", fontStyle: "bold"
    }).setOrigin(0.5, 0);

    this.hudLives = this.add.text(1130, 10, "", {
      fontSize: "20px", color: "#ff8a9a", fontStyle: "bold"
    }).setOrigin(0.5, 0);

    this.hudEnergyLabel = this.add.text(25, 44, "ENERGIA", {
      fontSize: "16px", color: "#8ff0bb", fontStyle: "bold"
    });

    this.hudBar = this.add.graphics();

    this.hudAmmo = this.add.text(650, 44, "", {
      fontSize: "16px", color: "#ffb347", fontStyle: "bold"
    }).setOrigin(0.5, 0);

    this.hudShield = this.add.text(1130, 44, "", {
      fontSize: "16px", color: "#7fe9ff", fontStyle: "bold"
    }).setOrigin(0.5, 0);

    this.hud.add([
      bg, this.hudTitle, this.hudScore, this.hudLives,
      this.hudEnergyLabel, this.hudBar, this.hudAmmo, this.hudShield
    ]);

    this.add.text(
      640, 695,
      "A/D ou ←/→ mover  |  ESPAÇO pular  |  F atirar  |  ↓ abaixar  |  E interagir",
      {
        fontSize: "14px",
        color: "#ffffff",
        backgroundColor: "#092b35",
        padding: { x: 10, y: 5 }
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(150);

    this.updateHUD();
  }

  updateHUD() {
    if (!this.hudScore) return;

    this.hudScore.setText(
      `PONTOS: ${this.score}  |  MOEDAS: ${this.coins}  |  DESAFIOS: ${this.answered}/${this.totalChallenges}`
    );

    this.hudLives.setText("VIDAS: " + "♥ ".repeat(Math.max(0, this.lives)));

    this.hudAmmo.setText(`${this.world.weapon}: ${this.ammo}   (F atira)`);

    const shieldLeft = this.shieldUntil - this.time.now;
    this.hudShield.setText(
      shieldLeft > 0 ? `ESCUDO ${Math.ceil(shieldLeft / 1000)}s` : ""
    );

    const ratio = Phaser.Math.Clamp(this.energy / MAX_ENERGY, 0, 1);
    const color = ratio > 0.5 ? 0x3ddc84 : ratio > 0.25 ? 0xffd12e : 0xff5c5c;

    const x = 110, y = 44, w = 260, h = 18;
    this.hudBar.clear();
    this.hudBar.fillStyle(0x0b1f28, 1);
    this.hudBar.fillRect(x, y, w, h);
    this.hudBar.fillStyle(color, 1);
    this.hudBar.fillRect(x + 2, y + 2, (w - 4) * ratio, h - 4);
    this.hudBar.lineStyle(2, 0x70d9ad, 1);
    this.hudBar.strokeRect(x, y, w, h);
  }

  showToast(msg) {
    if (this.toastText) this.toastText.destroy();

    this.toastText = this.add.text(640, 130, msg, {
      fontSize: "22px",
      color: "#ffe16a",
      backgroundColor: "#092b35",
      padding: { x: 14, y: 8 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(400);

    const t = this.toastText;
    this.tweens.add({
      targets: t,
      alpha: 0,
      delay: 1500,
      duration: 500,
      onComplete: () => t.destroy()
    });
  }

  /* ---------------- COLISÕES ---------------- */

  createCollisions() {
    this.physics.add.collider(this.player, this.ground);
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemies, this.ground);
    this.physics.add.collider(this.enemies, this.platforms);

    this.physics.add.overlap(this.player, this.coinsGroup, this.collectCoin, null, this);
    this.physics.add.overlap(this.player, this.pickups, this.collectPickup, null, this);
    this.physics.add.overlap(this.player, this.hazards, this.hazardHit, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.hitEnemy, null, this);
    this.physics.add.overlap(this.player, this.flyers, this.hitEnemy, null, this);
    this.physics.add.overlap(this.player, this.terminals, this.interactTerminal, null, this);
    this.physics.add.overlap(this.player, this.portal, this.finishWorld, null, this);

    // tiros
    this.physics.add.overlap(this.shots, this.enemies, this.shotHitsEnemy, null, this);
    this.physics.add.overlap(this.shots, this.flyers, this.shotHitsEnemy, null, this);
    this.physics.add.overlap(this.shots, this.platforms, (shot) => shot.destroy(), null, this);
  }

  /* ---------------- TELA INICIAL ---------------- */

  createStartScreen() {
    this.startPanel = this.add.container(0, 0).setScrollFactor(0).setDepth(300);

    const shade = this.add.rectangle(640, 360, 1280, 720, 0x061923, 0.88);

    const title = this.add.text(640, 215, "BIOQUEST", {
      fontSize: "64px", color: "#80efb1", fontStyle: "bold"
    }).setOrigin(0.5);

    const subtitle = this.add.text(640, 295, this.world.name, {
      fontSize: "27px", color: "#ffffff", fontStyle: "bold"
    }).setOrigin(0.5);

    const tip = this.add.text(640, 375,
      `Colete ENERGIA, VIDAS, ESCUDOS e MUNIÇÃO.\nAtire ${this.world.weapon} com F e pule em cima dos inimigos!\nResponda os 3 desafios para abrir o portal.`, {
      fontSize: "19px", color: "#ffffff", align: "center", lineSpacing: 6
    }).setOrigin(0.5);

    const start = this.add.text(640, 490, "CLIQUE AQUI OU PRESSIONE ESPAÇO", {
      fontSize: "22px", color: "#ffe16a", fontStyle: "bold"
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.startPanel.add([shade, title, subtitle, tip, start]);

    start.on("pointerdown", () => this.startGame());
    this.input.keyboard.once("keydown-SPACE", () => this.startGame());
  }

  startGame() {
    if (this.started) return;
    this.started = true;
    this.startPanel.destroy();

    // consome o SPACE usado para iniciar
    Phaser.Input.Keyboard.JustDown(this.keys.jump);
  }

  /* ---------------- LOOP ---------------- */

  update() {
    if (!this.started || this.finished || this.quizOpen) return;

    this.updatePlayer();
    this.updateEnemies();
    this.updateHUD();

    this.jumpRequested = false;
    this.interactRequested = false;
    this.fireRequested = false;
  }

  updatePlayer() {
    const now = this.time.now;

    const left = this.keys.left.isDown || this.keys.a.isDown || this.touch.left;
    const right = this.keys.right.isDown || this.keys.d.isDown || this.touch.right;
    const crouch = this.keys.down.isDown || this.touch.crouch;
    const lookUp = this.keys.up.isDown;

    const grounded =
      this.player.body.blocked.down || this.player.body.touching.down;

    // durante o recuo do dano o controle horizontal fica suspenso
    if (now >= this.knockUntil) {
      if (left && !right && !crouch) {
        this.player.setVelocityX(-190);
        this.facing = -1;
      } else if (right && !left && !crouch) {
        this.player.setVelocityX(190);
        this.facing = 1;
      } else {
        this.player.setVelocityX(0);
      }
    }

    this.player.setFlipX(this.facing < 0);

    const jump =
      Phaser.Input.Keyboard.JustDown(this.keys.jump) || this.jumpRequested;

    if (jump && grounded && !crouch) {
      this.player.setVelocityY(-JUMP_SPEED);
    }

    const fire =
      Phaser.Input.Keyboard.JustDown(this.keys.fire) ||
      Phaser.Input.Keyboard.JustDown(this.keys.fire2) ||
      this.fireRequested;

    if (fire) this.shoot();

    this.applyPlayerVisuals(now);

    if (!this.hasSprite) return;

    if (now < this.hurtUntil) {
      this.player.anims.play("hurt", true);
    } else if (!grounded) {
      this.player.anims.play("jump", true);
    } else if (crouch) {
      this.player.anims.play("crouch", true);
    } else if (lookUp) {
      this.player.anims.play("lookUp", true);
    } else if (Math.abs(this.player.body.velocity.x) > 20) {
      this.player.anims.play("run", true);
    } else {
      this.player.anims.play("idle", true);
    }
  }

  applyPlayerVisuals(now) {
    let tint = this.hasSprite ? 0 : 0x6be58c;

    if (now < this.shieldUntil) tint = 0x7fe9ff;
    else if (now < this.hurtUntil) tint = 0xff7777;

    if (tint) this.player.setTint(tint);
    else this.player.clearTint();

    const blink =
      now < this.invulnUntil &&
      now >= this.shieldUntil &&
      Math.floor(now / 90) % 2 === 0;

    this.player.setAlpha(blink ? 0.45 : 1);
  }

  updateEnemies() {
    const now = this.time.now;

    this.enemies.getChildren().forEach(enemy => {
      if (!enemy || !enemy.active) return;

      const speed = enemy.getData("speed");

      if (enemy.x < enemy.getData("left")) enemy.setVelocityX(speed);
      if (enemy.x > enemy.getData("right")) enemy.setVelocityX(-speed);
    });

    this.flyers.getChildren().forEach(f => {
      if (!f || !f.active) return;

      const speed = f.getData("speed");

      if (f.x < f.getData("left")) f.setVelocityX(speed);
      if (f.x > f.getData("right")) f.setVelocityX(-speed);

      f.y = f.getData("baseY") +
        Math.sin(now * 0.003 + f.getData("phase")) * f.getData("amp");
    });
  }

  /* ---------------- ARMA ---------------- */

  shoot() {
    const now = this.time.now;
    if (now < this.nextShot) return;

    if (this.ammo <= 0) {
      if (now > this.ammoToastAt) {
        this.showToast(`Sem ${this.world.weapon.toLowerCase()}! Procure as caixas de munição.`);
        this.ammoToastAt = now + 1500;
      }
      return;
    }

    this.ammo--;
    this.nextShot = now + 280;

    const dir = this.facing;
    const shot = this.shots.create(
      this.player.x + dir * 34,
      this.player.y - 6,
      "shot"
    );

    shot.body.setAllowGravity(false);
    shot.setTint(this.world.shotTint);
    shot.setDepth(9);
    shot.setVelocityX(dir * 560);

    this.time.delayedCall(1100, () => {
      if (shot && shot.active) shot.destroy();
    });

    this.updateHUD();
  }

  shotHitsEnemy(shot, enemy) {
    if (!shot.active || !enemy.active) return;

    shot.destroy();
    this.damageEnemy(enemy, 1);
  }

  damageEnemy(enemy, dmg) {
    if (!enemy.active) return;

    const hp = enemy.getData("hp") - dmg;
    enemy.setData("hp", hp);

    if (hp <= 0) {
      this.killEnemy(enemy);
      return;
    }

    enemy.setTintFill(0xffffff);
    this.time.delayedCall(90, () => {
      if (!enemy.active) return;
      const t = enemy.getData("tint");
      if (t) enemy.setTint(t);
      else enemy.clearTint();
    });
  }

  killEnemy(enemy) {
    const isFlyer = enemy.getData("type") === "flyer";
    const x = enemy.x;
    const y = enemy.y;

    this.score += isFlyer ? 40 : 25;
    this.burst(x, y, isFlyer ? 0xa66bff : 0xe54e64);

    // chance de soltar um item
    if (Math.random() < 0.35) {
      const type = Math.random() < 0.3 ? "ammo" : "energy";
      this.spawnPickup(type, Phaser.Math.Clamp(x, 60, WORLD_WIDTH - 60), GROUND_TOP - 30);
    }

    enemy.disableBody(true, true);
    this.updateHUD();
  }

  burst(x, y, color) {
    for (let i = 0; i < 8; i++) {
      const p = this.add.circle(x, y, 4, color).setDepth(20);
      const a = (Math.PI * 2 / 8) * i;

      this.tweens.add({
        targets: p,
        x: x + Math.cos(a) * 42,
        y: y + Math.sin(a) * 42,
        alpha: 0,
        duration: 350,
        onComplete: () => p.destroy()
      });
    }
  }

  /* ---------------- EVENTOS DO JOGO ---------------- */

  collectCoin(player, coin) {
    if (!coin.active) return;

    coin.disableBody(true, true);
    this.coins++;
    this.score += 10;
    this.updateHUD();
  }

  collectPickup(player, item) {
    if (!item.active) return;

    const type = item.getData("type");

    if (type === "energy") {
      if (this.energy >= MAX_ENERGY) return;
      this.energy = Math.min(MAX_ENERGY, this.energy + 30);
      this.showToast("+30 ENERGIA");
    } else if (type === "heart") {
      if (this.lives >= MAX_LIVES) return;
      this.lives++;
      this.showToast("+1 VIDA");
    } else if (type === "ammo") {
      this.ammo += 6;
      this.showToast(`+6 ${this.world.weapon}`);
    } else if (type === "shield") {
      this.shieldUntil = this.time.now + SHIELD_MS;
      this.showToast(`ESCUDO por ${SHIELD_MS / 1000}s!`);
    }

    item.disableBody(true, true);
    this.score += 5;
    this.updateHUD();
  }

  hitEnemy(player, enemy) {
    if (!enemy.active) return;

    const falling = player.body.velocity.y > 0;
    const fromAbove = player.body.bottom - enemy.body.top < 26;

    if (falling && fromAbove) {
      player.setVelocityY(-340);
      this.damageEnemy(enemy, 2);
    } else {
      this.hurtPlayer(enemy.getData("dmg") ?? 20, enemy.x);
    }
  }

  hazardHit(player, spike) {
    this.hurtPlayer(20, spike.x);
  }

  hurtPlayer(amount, srcX) {
    const now = this.time.now;

    if (this.finished || this.quizOpen) return;
    if (now < this.invulnUntil || now < this.shieldUntil) return;

    this.energy -= amount;

    this.invulnUntil = now + 1100;
    this.hurtUntil = now + 350;
    this.knockUntil = now + 250;

    const dir = this.player.x < srcX ? -1 : 1;
    this.player.setVelocity(dir * 240, -320);

    this.cameras.main.shake(120, 0.005);
    this.updateHUD();

    if (this.energy <= 0) this.handleDeath();
  }

  handleDeath() {
    this.lives--;
    this.energy = MAX_ENERGY;
    this.updateHUD();

    if (this.lives <= 0) {
      this.gameOver();
      return;
    }

    this.player.setPosition(this.checkpointX, this.checkpointY);
    this.player.setVelocity(0, -200);

    this.invulnUntil = this.time.now + 1800;
    this.hurtUntil = this.time.now + 300;

    this.showToast("Você perdeu uma vida! Energia restaurada.");
  }

  interactTerminal(player, terminal) {
    if (terminal.getData("used") || this.quizOpen) return;

    const interact =
      Phaser.Input.Keyboard.JustDown(this.keys.e) || this.interactRequested;

    if (!interact) return;

    terminal.setData("used", true);

    // o terminal vira checkpoint
    this.checkpointX = terminal.x - 70;
    this.checkpointY = 560;

    this.currentTerminal = terminal;
    this.openQuiz();
  }

  /* ---------------- QUIZ ---------------- */

  clearQuizObjects() {
    this.quizObjects.forEach(obj => obj && obj.destroy && obj.destroy());
    this.quizObjects = [];
  }

  bindQuizKeys(fn) {
    this.unbindQuizKeys();
    this.quizKeyHandler = fn;
    this.input.keyboard.on("keydown", fn);
  }

  unbindQuizKeys() {
    if (this.quizKeyHandler) {
      this.input.keyboard.off("keydown", this.quizKeyHandler);
      this.quizKeyHandler = null;
    }
  }

  openQuiz() {
    if (this.quizOpen) return;

    this.quizOpen = true;

    this.player.setVelocity(0, 0);
    this.physics.pause();

    const question =
      this.world.questions[this.questionIndex % this.world.questions.length];
    this.currentQuestion = question;

    const add = (obj) => {
      obj.setScrollFactor(0).setDepth(500);
      this.quizObjects.push(obj);
      return obj;
    };

    add(this.add.rectangle(640, 360, 1280, 720, 0x06131e, 0.96));
    add(this.add.rectangle(640, 360, 930, 560, 0x123849).setStrokeStyle(4, 0x79e6bd));

    add(this.add.text(640, 115, "DESAFIO BIOQUEST", {
      fontSize: "32px", color: "#8ff0bb", fontStyle: "bold"
    }).setOrigin(0.5));

    add(this.add.text(640, 160,
      `QUESTÃO ${this.answered + 1} DE ${this.totalChallenges}   •   acerte: +20 energia e +4 munição   •   erre: −25 energia`, {
      fontSize: "16px", color: "#ffe16a"
    }).setOrigin(0.5));

    add(this.add.text(230, 205, question.q, {
      fontSize: "23px",
      color: "#ffffff",
      fontStyle: "bold",
      wordWrap: { width: 820 }
    }));

    question.a.forEach((answer, index) => {
      const y = 315 + index * 65;

      const box = add(this.add.rectangle(640, y, 850, 52, 0x24566a)
        .setStrokeStyle(2, 0x75cdb4));

      box.setInteractive({ useHandCursor: true });
      box.on("pointerover", () => box.setFillStyle(0x2f7088));
      box.on("pointerout", () => box.setFillStyle(0x24566a));
      box.on("pointerdown", () => this.answerQuestion(index));

      add(this.add.text(250, y,
        `${String.fromCharCode(65 + index)})  ${answer}`, {
        fontSize: "20px", color: "#ffffff"
      }).setOrigin(0, 0.5));
    });

    // atalhos de teclado: A-D ou 1-4
    this.bindQuizKeys((event) => {
      const k = event.key.toUpperCase();
      const idx = "ABCD".indexOf(k) >= 0 ? "ABCD".indexOf(k) : "1234".indexOf(k);
      if (idx >= 0 && idx < 4) this.answerQuestion(idx);
    });
  }

  answerQuestion(index) {
    if (!this.quizOpen || this.resultShown) return;

    this.resultShown = true;
    this.unbindQuizKeys();

    const question = this.currentQuestion;
    const correct = index === question.c;

    let rewardText;

    if (correct) {
      this.score += 100;
      this.energy = Math.min(MAX_ENERGY, this.energy + 20);
      this.ammo += 4;
      rewardText = `+100 pontos   +20 ENERGIA   +4 ${this.world.weapon}`;
    } else {
      this.energy -= 25;
      rewardText = "−25 ENERGIA";
    }

    this.updateHUD();
    this.clearQuizObjects();

    const add = (obj) => {
      obj.setScrollFactor(0).setDepth(510);
      this.quizObjects.push(obj);
      return obj;
    };

    add(this.add.rectangle(640, 360, 1280, 720, 0x06131e, 0.97));
    add(this.add.rectangle(640, 360, 900, 440, 0x123849).setStrokeStyle(3, 0x79e6bd));

    add(this.add.text(640, 245,
      correct ? "RESPOSTA CORRETA!" : "RESPOSTA INCORRETA", {
      fontSize: "34px",
      color: correct ? "#82f0a7" : "#ff8b8b",
      fontStyle: "bold"
    }).setOrigin(0.5));

    if (!correct) {
      add(this.add.text(640, 290,
        `Resposta certa: ${question.a[question.c]}`, {
        fontSize: "20px", color: "#ffe16a", align: "center",
        wordWrap: { width: 760 }
      }).setOrigin(0.5));
    }

    add(this.add.text(640, 350, question.e, {
      fontSize: "22px", color: "#ffffff", align: "center",
      wordWrap: { width: 760 }
    }).setOrigin(0.5));

    add(this.add.text(640, 405, rewardText, {
      fontSize: "20px",
      color: correct ? "#82f0a7" : "#ff8b8b",
      fontStyle: "bold"
    }).setOrigin(0.5));

    const btn = add(this.add.rectangle(640, 475, 280, 62, 0x24566a)
      .setStrokeStyle(2, 0x79e6bd));
    btn.setInteractive({ useHandCursor: true });

    add(this.add.text(640, 475, "CONTINUAR", {
      fontSize: "24px", color: "#ffe16a"
    }).setOrigin(0.5));

    const proceed = () => this.closeResult();

    btn.on("pointerdown", proceed);
    this.bindQuizKeys((event) => {
      if (event.key === "Enter" || event.key === " ") proceed();
    });
  }

  closeResult() {
    if (!this.resultShown) return;

    this.resultShown = false;
    this.unbindQuizKeys();
    this.clearQuizObjects();

    this.questionIndex++;
    this.answered++;

    const t = this.currentTerminal;
    if (t) {
      const label = t.getData("label");
      if (label) label.setText("✔ FEITO");
      t.setTint(0x777777);
    }

    // descarta teclas apertas durante o quiz (evita pulo/tiro automático)
    Phaser.Input.Keyboard.JustDown(this.keys.jump);
    Phaser.Input.Keyboard.JustDown(this.keys.fire);
    Phaser.Input.Keyboard.JustDown(this.keys.fire2);
    Phaser.Input.Keyboard.JustDown(this.keys.e);

    this.quizOpen = false;
    this.physics.resume();
    this.updateHUD();

    if (this.energy <= 0) {
      this.handleDeath();
      if (this.lives <= 0) return;
    }

    if (this.answered >= this.totalChallenges && !this.portalOpen) {
      this.portalOpen = true;
      this.portal.setAlpha(1);
      this.portalLabel.setText("PORTAL ABERTO");
      this.tweens.add({
        targets: this.portal,
        alpha: 0.6,
        duration: 500,
        yoyo: true,
        repeat: -1
      });
      this.showToast("Portal aberto! Vá até o fim da fase.");
    }
  }

  /* ---------------- FIM DE FASE / JOGO ---------------- */

  finishWorld() {
    if (this.finished) return;

    if (!this.portalOpen) {
      if (this.time.now > this.toastCooldown) {
        this.showToast("Responda todos os desafios para abrir o portal!");
        this.toastCooldown = this.time.now + 2500;
      }
      return;
    }

    this.finished = true;
    this.player.setVelocity(0, 0);

    if (this.worldIndex < WORLDS.length - 1) {
      this.showNextWorld();
    } else {
      this.victory();
    }
  }

  makeButton(x, y, w, h, label, cb, depth, fontSize = "26px") {
    const rect = this.add.rectangle(x, y, w, h, 0x24566a)
      .setStrokeStyle(2, 0x79e6bd)
      .setScrollFactor(0)
      .setDepth(depth)
      .setInteractive({ useHandCursor: true });

    this.add.text(x, y, label, {
      fontSize, color: "#ffe16a", fontStyle: "bold"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(depth + 1);

    let done = false;
    const once = () => {
      if (done) return;
      done = true;
      cb();
    };

    rect.on("pointerdown", once);
    this.input.keyboard.once("keydown-ENTER", once);
  }

  showNextWorld() {
    this.add.rectangle(640, 360, 1280, 720, 0x061923, 0.96)
      .setScrollFactor(0).setDepth(600);

    this.add.text(640, 260, "FASE CONCLUÍDA!", {
      fontSize: "46px", color: "#8ff0bb", fontStyle: "bold"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(601);

    this.add.text(640, 330,
      `Pontos: ${this.score}  |  Vidas: ${this.lives}  |  Energia recuperada (+30)`, {
      fontSize: "22px", color: "#ffffff"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(601);

    this.makeButton(640, 430, 300, 65, "PRÓXIMA FASE", () => {
      this.scene.restart({
        worldIndex: this.worldIndex + 1,
        score: this.score,
        lives: this.lives,
        coins: this.coins,
        energy: Math.min(MAX_ENERGY, this.energy + 30),
        ammo: this.ammo
      });
    }, 601);
  }

  victory() {
    this.showEndScreen(
      "MISSÃO CUMPRIDA!",
      `Pontuação: ${this.score}  |  Moedas: ${this.coins}`
    );
  }

  gameOver() {
    this.finished = true;
    this.physics.pause();

    this.showEndScreen(
      "FIM DE JOGO",
      "Tente novamente e complete sua missão."
    );
  }

  showEndScreen(titleText, detailText) {
    this.add.rectangle(640, 360, 1280, 720, 0x061923, 0.97)
      .setScrollFactor(0).setDepth(700);

    this.add.text(640, 270, titleText, {
      fontSize: "48px", color: "#8ff0bb", fontStyle: "bold"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(701);

    this.add.text(640, 350, detailText, {
      fontSize: "23px", color: "#ffffff"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(701);

    this.makeButton(640, 450, 340, 65, "JOGAR NOVAMENTE", () => {
      this.scene.restart({ worldIndex: 0, score: 0, lives: 3, coins: 0 });
    }, 701, "25px");
  }
}

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: "#102d3b",

  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 1100 },
      debug: false
    }
  },

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },

  input: {
    activePointers: 5
  },

  scene: [BioQuest]
};

window.bioQuestGame = new Phaser.Game(config);