class Load extends Phaser.Scene {
    constructor() {
        super("loadScene");
    }

    preload() {
        this.load.setPath("./assets/");

        // Load the player images directly from assets
        this.load.image("player", "tile_0055.png");
        this.load.image("player_walk", "tile_0056.png");
        this.load.image("player_jump", "tile_0058.png");
        this.load.audio("nomnom", "footstep_grass_001.ogg");
        this.load.audio("bgm", "fluffingaduck.mp3");

        // Load tilemap information
        this.load.spritesheet("tilemap_tiles", "tilemap_packed.png", { frameWidth: 16, frameHeight: 16 });
        this.load.tilemapTiledJSON("platformer-level-1", "platformer-level-1.tmj");   // Tilemap in JSON

        // Load particle atlas for walking dust effects
        this.load.atlas("kenny-particles", "kenny-particles-2.png", "kenny-particles.json");
    }

    create() {
        this.anims.create({
            key: 'walk',
            frames: [
                { key: 'player_walk' },
                { key: 'player' }
            ],
            frameRate: 15,
            repeat: -1
        });

        this.anims.create({
            key: 'idle',
            frames: [{ key: 'player' }],
            repeat: -1
        });

        this.anims.create({
            key: 'jump',
            frames: [{ key: 'player_jump' }]
        });

         // ...and pass to the next Scene
         this.scene.start("platformerScene");
    }

    // Never get here since a new scene is started in create()
    update() {
    }
}