class Platformer extends Phaser.Scene {
    constructor() {
        super("platformerScene");
    }

    init() {
        // variables and settings
        this.ACCELERATION = 300;
        this.DRAG = 8000;    // DRAG < ACCELERATION = icy slide
        this.physics.world.gravity.y = 1500;
        this.JUMP_VELOCITY = -500;
        this.PARTICLE_VELOCITY = 50;
        this.SCALE = 1.75;
        // double-jump settings
        this.maxJumps = 2; // total jumps allowed (1 = single jump, 2 = double jump)
        this.jumpsRemaining = this.maxJumps;
        this.wasOnGround = false;
        this.movementdisabled = false;
    }

    create() {
        this.map = this.add.tilemap("platformer-level-1", 16, 16, 96, 36);

        this.tileset = this.map.addTilesetImage("tilemap_packed", "tilemap_tiles");

        // Create a layer
        this.groundLayer = this.map.createLayer("Ground-n-Platforms", this.tileset, 0, 0);
        this.backgroundLayer = this.map.createLayer("Background", this.tileset, 0, 36);
        this.collectLayer = this.map.createLayer("Bee", this.tileset, 0, 0);
        this.endLayer = this.map.createLayer("Endgoal", this.tileset, 0, 0);
        // match background scroll to the tilemap so it fills the full map vertically
        this.backgroundLayer.setScrollFactor(0.75);
        this.backgroundLayer.setDepth(-10);
        this.backgroundLayer.setScale(1);
        this.eataudio = this.sound.add("nomnom");
        this.bgm = this.sound.add("bgm");
        this.bgm.play();

        // Make it collidable
        this.groundLayer.setCollisionByProperty({
            collides: true
        });

        this.beeGroup = this.physics.add.staticGroup();
        this.collectLayer.forEachTile((tile) => {
            if (tile.index > 0) {
                const bee = this.beeGroup.create(tile.getCenterX(), tile.getCenterY(), 'tilemap_tiles', tile.index - 1);
                bee.setOrigin(0.5, 0.5);
            }
        }, this);
        this.collectLayer.setVisible(false);

        this.endgoalGroup = this.physics.add.staticGroup();
        this.endLayer.forEachTile((tile) => {
            if (tile.properties && tile.properties.endgoal) {
                const endgoal = this.endgoalGroup.create(tile.getCenterX(), tile.getCenterY(), 'tilemap_tiles', tile.index - 1);
                endgoal.setOrigin(0.5, 0.5);
            }
        }, this);

        // bounds = map bounds
        this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

        my.sprite.player = this.physics.add.sprite(60, 140, "player").setScale(this.SCALE);
        my.sprite.player.setCollideWorldBounds(true);

        // initialize jumps state for the player
        this.jumpsRemaining = this.maxJumps;
        this.wasOnGround = my.sprite.player.body.blocked.down;

        // initialize score ui meow
        this.score = 0;
        this.scoreText = this.add.text(16, 16, 'Score: 0', {
            fontSize: '24px',
            fill: '#8b5656'
        });

        // collision handling and bee collection :3
        this.physics.add.collider(my.sprite.player, this.groundLayer);
        this.physics.add.overlap(my.sprite.player, this.beeGroup, this.collectBee, null, this);
        this.physics.add.overlap(my.sprite.player, this.endgoalGroup, this.reachEndgoal, null, this);

        // set up Phaser-provided cursor key input
        cursors = this.input.keyboard.createCursorKeys();        
        
        // walking part
        my.vfx.walking = this.add.particles(0, 0, "kenny-particles", {
            frame: ['dirt_01.png', 'dirt_02.png'],
            random: true,
            scale: {start: 0.02, end: 0.01},
            maxAliveParticles: 4,
            lifespan: 250,
            gravityY: -400,
            alpha: {start: 1, end: 0.1}, 
        });
        // jumping part 
        my.vfx.jumping = this.add.particles(0, 0, "kenny-particles", {
            frame: ['twirl_01.png', 'twirl_02.png'],
            random: true,
            scale: {start: 0.02, end: 0.01},
            lifespan: 250,
            gravityY: 400,
            alpha: {start: 1, end: 0.1}, 
        });

        my.vfx.walking.stop();
        // camera ughh this took so long to debug 
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.setZoom(2);
        this.scoreText.setScale(1 / this.cameras.main.zoom);
        this.cameras.main.startFollow(my.sprite.player, true, 1, 0); // no need for y lerp cause the camera will always be the height of the game !!
        this.cameras.main.setDeadzone(0, 0);
        this.cameras.main.roundPixels = true;


    }

    update() {
        if(cursors.left.isDown && this.movementdisabled != true) {
            my.sprite.player.body.setAccelerationX(-this.ACCELERATION);
            my.sprite.player.setFlip(true, false);
            my.sprite.player.anims.play('walk', true);
            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-25, my.sprite.player.displayHeight/2-5, false);
            my.vfx.walking.setParticleSpeed(this.PARTICLE_VELOCITY, 0);
            if (my.sprite.player.body.blocked.down) {
                my.vfx.walking.start();
            }

        } else if(cursors.right.isDown && this.movementdisabled != true) {
            my.sprite.player.body.setAccelerationX(this.ACCELERATION);
            my.sprite.player.resetFlip();
            my.sprite.player.anims.play('walk', true);
            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-25, my.sprite.player.displayHeight/2-5, false);
            my.vfx.walking.setParticleSpeed(this.PARTICLE_VELOCITY, 0);
            if (my.sprite.player.body.blocked.down) {
                my.vfx.walking.start();
            }

        } else {
            my.sprite.player.body.setAccelerationX(0);
            my.sprite.player.body.setDragX(this.DRAG);
            my.sprite.player.anims.play('idle');
            if (my.vfx.walking) {
                my.vfx.walking.stop();
            }
        }

        // player jump
        // note that we need body.blocked rather than body.touching b/c the former applies to tilemap tiles and the latter to the "ground"
        if(!my.sprite.player.body.blocked.down) {
            my.sprite.player.anims.play('jump');
        }

        // reset jumps when landing
        if (my.sprite.player.body.blocked.down && !this.wasOnGround) {
            this.jumpsRemaining = this.maxJumps;
        }

        // double jump
        if (Phaser.Input.Keyboard.JustDown(cursors.up) && this.movementdisabled != true) {
            if (my.sprite.player.body.blocked.down) {
                my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY);
                this.jumpsRemaining = this.maxJumps - 1;
                 my.vfx.jumping.explode(10, my.sprite.player.x, my.sprite.player.y + 2);
            } else if (this.jumpsRemaining > 0) {
                my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY);
                this.jumpsRemaining--;
                 my.vfx.jumping.explode(10, my.sprite.player.x, my.sprite.player.y + 2);
            }
        }

        // update grounded state tracker
        this.wasOnGround = my.sprite.player.body.blocked.down;

        // if player falls, restart
        if (my.sprite.player.y >= 270) {
            this.resetGameInstant();
        }

    }

    collectBee(player, bee) {
        bee.destroy();
        this.score += 10;
        this.scoreText.setText('Score: ' + this.score);
        this.eataudio.play();
        player.setScale(player.scale + 0.1);
    }

    reachEndgoal(player, endgoal) {
        // stop player movement
        player.body.setVelocity(0, 0);
        player.body.setAcceleration(0, 0);
        this.cameras.main.centerX,
        this.cameras.main.centerY,
        this.ACCELERATION = 0;
        this.DRAG = 8000
        this.physics.world.gravity.y = 0;
        this.JUMP_VELOCITY = 0;
        this.PARTICLE_VELOCITY = 0;
        this.SCALE = 1.75;
        this.maxJumps = 0;
        this.wasOnGround = false;
        this.movementdisabled = true;
        this.bgm.stop();
        // show level complete message
        const completeText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            'Level Complete!\nFinal Score: ' + this.score,
            {
                fontSize: '48px',
                fill: '#8b5656',
                align: 'center',
                backgroundColor: '#f69d9d',
                padding: { x: 20, y: 20 }
            }
        ).setScrollFactor(0).setDepth(100).setOrigin(0.5, 0.5); 
        
        this.resetGame();
    }

    resetGame() {
        this.time.delayedCall(2000, () => {
            this.scene.restart();
        });
    }
    resetGameInstant() {
        this.scene.restart();

    }
}


