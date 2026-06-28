                // ============================================================
        // ECHO DUNGEON V15 - PART 4
        // Combat System, Abilities, Ring Management
        // ============================================================

        // ============================================================
        // START COMBAT
        // ============================================================
        
        function startCombat(enemyType) {
            const enemyTemplate = enemies[enemyType];
            const floor = game.dungeon.currentLevel;
            
            game.combat = {
                enemy: {
                    name: enemyTemplate.name,
                    health: Math.floor(enemyTemplate.health * (1 + (floor - 1) * 0.3)),
                    maxHealth: Math.floor(enemyTemplate.health * (1 + (floor - 1) * 0.3)),
                    damage: Math.floor(enemyTemplate.damage * (1 + (floor - 1) * 0.25)),
                    gold: Math.floor(enemyTemplate.gold * floor),
                    exp: Math.floor(enemyTemplate.exp * floor),
                    fleeChance: enemyTemplate.fleeChance,
                    regenerate: enemyTemplate.regenerate || 0,
                    frozen: false,
                    timestopTurns: 0,
                    poisoned: false,
                    poisonTurns: 0,
                    stunned: false,
                    marked: false
                },
                playerDefending: false,
                playerShadowmelded: false,
                secondEnemy: null
            };
            
            speakSequence([
                `A ${game.combat.enemy.name} blocks your path!`,
                `Enemy health: ${game.combat.enemy.health}.`,
                'What will you do? Say attack, defend, special, cast a spell, or flee.'
            ]);
        }

        function startBossCombat() {
            const floor = game.dungeon.currentLevel;
            const bossTemplate = enemies.lichKing;
            
            game.combat = {
                enemy: {
                    name: bossTemplate.name,
                    health: Math.floor(bossTemplate.health * (1 + (floor - 1) * 0.5)),
                    maxHealth: Math.floor(bossTemplate.health * (1 + (floor - 1) * 0.5)),
                    damage: Math.floor(bossTemplate.damage * (1 + (floor - 1) * 0.4)),
                    gold: Math.floor(bossTemplate.gold * floor * 2),
                    exp: Math.floor(bossTemplate.exp * floor * 2),
                    fleeChance: 0,
                    regenerate: bossTemplate.regenerate * floor,
                    frozen: false,
                    timestopTurns: 0,
                    poisoned: false,
                    poisonTurns: 0,
                    stunned: false,
                    marked: false
                },
                playerDefending: false,
                playerShadowmelded: false,
                isBoss: true
            };
            
            speakSequence([
                'You enter the boss chamber!',
                `The ${game.combat.enemy.name} rises before you!`,
                `Boss health: ${game.combat.enemy.health}!`,
                'What will you do?'
            ]);
        }

        // ============================================================
        // PLAYER ATTACK
        // ============================================================
        
        function playerAttack() {
            let damage = game.player.baseAttack;
            
            // Add weapon damage
            const weaponData = equipment.weapons.find(w => w.name === game.player.weapon);
            if (weaponData) damage += weaponData.attack;
            
            // Add gloves damage
            const glovesData = equipment.gloves.find(g => g.name === game.player.gloves);
            if (glovesData && glovesData.attack) damage += glovesData.attack;
            
            // Add bracelet damage
            const leftBracelet = equipment.bracelets.find(b => b.name === game.player.leftBracelet);
            if (leftBracelet) damage += leftBracelet.attack;
            const rightBracelet = equipment.bracelets.find(b => b.name === game.player.rightBracelet);
            if (rightBracelet) damage += rightBracelet.attack;
            
            // Add ring bonuses
            for (let ring of game.player.equippedRings) {
                const ringData = rings.find(r => r.name === ring);
                if (ringData && ringData.stat === 'attack') {
                    damage += ringData.value;
                }
            }
            
            // Level scaling
            damage += (game.player.level - 1) * 3;
            
            // Shadowmeld bonus
            if (game.combat.playerShadowmelded) {
                damage *= 2;
                game.combat.playerShadowmelded = false;
            }
            
            // Death Mark bonus
            if (game.combat.enemy.marked) {
                damage = Math.floor(damage * 1.5);
            }
            
            // Giant Strength effect
            const hasGiantStrength = game.player.activeEffects.some(e => e.type === 'strength' && e.duration > 0);
            if (hasGiantStrength) {
                damage *= 2;
                const effect = game.player.activeEffects.find(e => e.type === 'strength');
                effect.duration--;
                if (effect.duration <= 0) {
                    game.player.activeEffects = game.player.activeEffects.filter(e => e.type !== 'strength');
                }
            }
            
            game.combat.enemy.health -= damage;
            
            speakSequence([
                `You attack for ${damage} damage!`,
                `Enemy has ${Math.max(0, game.combat.enemy.health)} health left.`
            ], () => {
                if (game.combat.enemy.health <= 0) {
                    setTimeout(() => combatVictory(), 1000);
                } else {
                    setTimeout(() => enemyTurn(), 1000);
                }
            });
        }

        // ============================================================
        // PLAYER DEFEND
        // ============================================================
        
        function playerDefend() {
            game.combat.playerDefending = true;
            speak('You raise your guard! Damage reduced this turn.', () => {
                setTimeout(() => enemyTurn(), 1000);
            });
        }

        // ============================================================
        // PLAYER SPECIAL ABILITY
        // ============================================================
        
        function playerSpecial() {
            const classData = classes[game.player.class];
            const special = classData.special;
            
            if (game.player.mana < special.cost) {
                speak(`Not enough mana! ${special.name} costs ${special.cost}. You have ${game.player.mana}.`);
                return;
            }
            
            game.player.mana -= special.cost;
            
            let damage = special.damage + (game.player.level - 1) * 5;
            if (game.combat.enemy.marked) damage = Math.floor(damage * 1.5);
            
            game.combat.enemy.health -= damage;
            
            speakSequence([
                `You use ${special.name}!`,
                `${damage} damage!`,
                `Enemy has ${Math.max(0, game.combat.enemy.health)} health left.`
            ], () => {
                if (game.combat.enemy.health <= 0) {
                    setTimeout(() => combatVictory(), 1000);
                } else {
                    setTimeout(() => enemyTurn(), 1000);
                }
            });
        }

        // ============================================================
        // CAST SPELL - All ability types
        // ============================================================
        
        function castSpell(cmd) {
            let abilityName = null;
            let abilityData = null;
            
            // Check learned abilities
            for (let ability of game.player.learnedAbilities) {
                if (cmd.includes(ability.toLowerCase())) {
                    abilityName = ability;
                    const classSpecial = classes[game.player.class].special;
                    if (ability === classSpecial.name) {
                        abilityData = classSpecial;
                    } else {
                        abilityData = abilities.find(a => a.name === ability);
                    }
                    break;
                }
            }
            
            if (!abilityData) {
                speak('You do not know that spell.');
                return;
            }
            
            // Apply Elixir of Clarity
            let manaCost = abilityData.cost;
            const hasClarity = game.player.activeEffects.some(e => e.type === 'clarity' && e.duration > 0);
            if (hasClarity) {
                manaCost = Math.floor(manaCost * 0.5);
            }
            
            if (game.player.mana < manaCost) {
                speak(`Not enough mana! ${abilityName} costs ${manaCost}. You have ${game.player.mana}.`);
                return;
            }
            
            game.player.mana -= manaCost;
            
            // Decrement clarity if used
            if (hasClarity) {
                const effect = game.player.activeEffects.find(e => e.type === 'clarity');
                effect.duration--;
                if (effect.duration <= 0) {
                    game.player.activeEffects = game.player.activeEffects.filter(e => e.type !== 'clarity');
                }
            }
            
            // Handle different ability types
            if (abilityData.type === 'damage') {
                executeDamageSpell(abilityName, abilityData);
            } else if (abilityData.type === 'aoe') {
                executeAOESpell(abilityName, abilityData);
            } else if (abilityData.type === 'freeze') {
                executeFreezeSpell(abilityName, abilityData);
            } else if (abilityData.type === 'timestop') {
                executeTimestopSpell(abilityName);
            } else if (abilityData.type === 'stun') {
                executeStunSpell(abilityName, abilityData);
            } else if (abilityData.type === 'poison') {
                executePoisonSpell(abilityName, abilityData);
            } else if (abilityData.type === 'sneak') {
                executeSneakSpell(abilityName, abilityData);
            } else if (abilityData.type === 'rage') {
                executeRageSpell(abilityName);
            } else if (abilityData.type === 'vanish') {
                executeVanishSpell(abilityName);
            } else if (abilityData.type === 'mark') {
                executeMarkSpell(abilityName, abilityData);
            }
        }

        function executeDamageSpell(name, data) {
            let damage = data.damage + (game.player.level - 1) * 6;
            if (game.combat.enemy.marked) damage = Math.floor(damage * 1.5);
            
            game.combat.enemy.health -= damage;
            
            speakSequence([
                `You cast ${name}!`,
                `${damage} damage!`,
                `Enemy has ${Math.max(0, game.combat.enemy.health)} health left.`
            ], () => {
                if (game.combat.enemy.health <= 0) {
                    setTimeout(() => combatVictory(), 1000);
                } else {
                    setTimeout(() => enemyTurn(), 1000);
                }
            });
        }

        function executeAOESpell(name, data) {
            let damage = data.damage + (game.player.level - 1) * 6;
            if (game.combat.enemy.marked) damage = Math.floor(damage * 1.5);
            
            game.combat.enemy.health -= damage;
            
            const messages = [`You cast ${name}!`, `${damage} damage to all enemies!`];
            
            if (game.combat.secondEnemy) {
                game.combat.secondEnemy.health -= damage;
                messages.push(`Both enemies take ${damage} damage!`);
            }
            
            messages.push(`${game.combat.enemy.name} has ${Math.max(0, game.combat.enemy.health)} health left.`);
            
            speakSequence(messages, () => {
                if (game.combat.enemy.health <= 0) {
                    setTimeout(() => combatVictory(), 1000);
                } else {
                    setTimeout(() => enemyTurn(), 1000);
                }
            });
        }

        function executeFreezeSpell(name, data) {
            let damage = data.damage + (game.player.level - 1) * 6;
            game.combat.enemy.health -= damage;
            game.combat.enemy.frozen = true;
            game.combat.enemy.timestopTurns = 1;
            
            speakSequence([
                `You cast ${name}!`,
                `${damage} damage and the enemy is frozen!`,
                `Enemy has ${Math.max(0, game.combat.enemy.health)} health left.`
            ], () => {
                if (game.combat.enemy.health <= 0) {
                    setTimeout(() => combatVictory(), 1000);
                }
            });
        }

        function executeTimestopSpell(name) {
            game.combat.enemy.frozen = true;
            game.combat.enemy.timestopTurns = 2;
            
            speakSequence([
                `You cast ${name}!`,
                'Time freezes around you!',
                'The enemy is frozen for 2 turns!'
            ]);
        }

        function executeStunSpell(name, data) {
            let damage = data.damage + (game.player.level - 1) * 5;
            game.combat.enemy.health -= damage;
            game.combat.enemy.stunned = true;
            
            speakSequence([
                `You cast ${name}!`,
                `${damage} damage and the enemy is stunned!`,
                `Enemy has ${Math.max(0, game.combat.enemy.health)} health left.`
            ], () => {
                if (game.combat.enemy.health <= 0) {
                    setTimeout(() => combatVictory(), 1000);
                }
            });
        }

        function executePoisonSpell(name, data) {
            let damage = data.damage + (game.player.level - 1) * 3;
            game.combat.enemy.health -= damage;
            game.combat.enemy.poisoned = true;
            game.combat.enemy.poisonTurns = data.duration || 3;
            
            speakSequence([
                `You cast ${name}!`,
                `${damage} damage and the enemy is poisoned!`,
                'They will take 15 damage per turn for 3 turns!',
                `Enemy has ${Math.max(0, game.combat.enemy.health)} health left.`
            ], () => {
                if (game.combat.enemy.health <= 0) {
                    setTimeout(() => combatVictory(), 1000);
                } else {
                    setTimeout(() => enemyTurn(), 1000);
                }
            });
        }

        function executeSneakSpell(name, data) {
            let damage = data.damage + (game.player.level - 1) * 5;
            if (game.combat.playerShadowmelded) {
                damage *= 2;
                game.combat.playerShadowmelded = false;
            }
            if (game.combat.enemy.marked) damage = Math.floor(damage * 1.5);
            
            game.combat.enemy.health -= damage;
            
            speakSequence([
                `You strike from the shadows!`,
                `${damage} damage!`,
                'The enemy cannot counter!',
                `Enemy has ${Math.max(0, game.combat.enemy.health)} health left.`
            ], () => {
                if (game.combat.enemy.health <= 0) {
                    setTimeout(() => combatVictory(), 1000);
                }
            });
        }

        function executeRageSpell(name) {
            let baseDamage = game.player.baseAttack;
            const weaponData = equipment.weapons.find(w => w.name === game.player.weapon);
            if (weaponData) baseDamage += weaponData.attack;
            baseDamage += (game.player.level - 1) * 5;
            
            const totalDamage = baseDamage * 3;
            game.combat.enemy.health -= totalDamage;
            
            speakSequence([
                `You enter a berserker rage!`,
                `You strike three times for ${totalDamage} total damage!`,
                `Enemy has ${Math.max(0, game.combat.enemy.health)} health left.`
            ], () => {
                if (game.combat.enemy.health <= 0) {
                    setTimeout(() => combatVictory(), 1000);
                } else {
                    setTimeout(() => enemyTurn(), 1000);
                }
            });
        }

        function executeVanishSpell(name) {
            game.combat.playerShadowmelded = true;
            speakSequence([
                `You cast ${name}!`,
                'You meld into the shadows!',
                'Your next attack deals 200% damage!'
            ]);
        }

        function executeMarkSpell(name, data) {
            let damage = data.damage + (game.player.level - 1) * 5;
            game.combat.enemy.health -= damage;
            game.combat.enemy.marked = true;
            
            speakSequence([
                `You cast ${name}!`,
                `${damage} damage!`,
                'The enemy is marked! They take 50% more damage!',
                `Enemy has ${Math.max(0, game.combat.enemy.health)} health left.`
            ], () => {
                if (game.combat.enemy.health <= 0) {
                    setTimeout(() => combatVictory(), 1000);
                } else {
                    setTimeout(() => enemyTurn(), 1000);
                }
            });
        }

        // ============================================================
        // ATTEMPT FLEE
        // ============================================================
        
        function attemptFlee() {
            if (game.combat.isBoss) {
                speak('You cannot flee from the boss!', () => {
                    setTimeout(() => enemyTurn(), 1000);
                });
                return;
            }
            
            if (Math.random() < game.combat.enemy.fleeChance) {
                speak('You successfully fled from combat!');
                game.combat = null;
            } else {
                speak('You failed to escape!', () => {
                    setTimeout(() => enemyTurn(), 1000);
                });
            }
        }

        // ============================================================
        // ENEMY TURN - With Ring of Regeneration healing
        // ============================================================
        
        function enemyTurn() {
            if (!game.combat) return;
            
            const enemy = game.combat.enemy;
            
            // Check frozen/stunned
            if (enemy.frozen && enemy.timestopTurns > 0) {
                enemy.timestopTurns--;
                if (enemy.timestopTurns <= 0) enemy.frozen = false;
                speak(`The enemy is frozen for ${enemy.timestopTurns} more turns! What will you do?`);
                return;
            }
            
            if (enemy.stunned) {
                enemy.stunned = false;
                speak('The enemy is stunned and cannot act! What will you do?');
                return;
            }
            
            // Poison damage
            if (enemy.poisoned && enemy.poisonTurns > 0) {
                enemy.health -= 15;
                enemy.poisonTurns--;
                if (enemy.poisonTurns <= 0) enemy.poisoned = false;
            }
            
            if (enemy.health <= 0) {
                setTimeout(() => combatVictory(), 500);
                return;
            }
            
            // Enemy regeneration
            if (enemy.regenerate > 0) {
                enemy.health = Math.min(enemy.maxHealth, enemy.health + enemy.regenerate);
            }
            
            // Enemy attack
            let damage = enemy.damage;
            
            if (game.combat.playerDefending) {
                damage = Math.floor(damage * 0.5);
                game.combat.playerDefending = false;
            }
            
            // Apply defense
            damage = Math.max(1, damage - game.player.defense);
            
            game.player.health -= damage;
            
            const messages = [`${enemy.name} attacks for ${damage} damage!`];
            
            // Ring of Regeneration healing (50 per ring, UNLIMITED)
            let totalRegen = 0;
            for (let ring of game.player.equippedRings) {
                if (ring === 'Ring of Regeneration') {
                    totalRegen += 50;
                }
            }
            
            if (totalRegen > 0) {
                game.player.health = Math.min(game.player.maxHealth, game.player.health + totalRegen);
                messages.push(`Your Rings of Regeneration heal ${totalRegen}!`);
            }
            
            messages.push(`Your health: ${Math.max(0, game.player.health)} of ${game.player.maxHealth}.`);
            
            if (game.player.health <= 0) {
                // Check for Elixir of Immortality
                if (game.player.activeEffects.some(e => e.type === 'revive')) {
                    game.player.health = Math.floor(game.player.maxHealth * 0.5);
                    game.player.activeEffects = game.player.activeEffects.filter(e => e.type !== 'revive');
                    messages.push('The Elixir of Immortality saves you!');
                    messages.push(`You revive with ${game.player.health} health!`);
                    messages.push('What will you do?');
                    speakSequence(messages);
                } else {
                    messages.push('You have been defeated...');
                    speakSequence(messages, () => {
                        setTimeout(() => playerDeath(), 1000);
                    });
                }
            } else {
                messages.push('What will you do?');
                speakSequence(messages);
            }
        }

        // ============================================================
        // COMBAT VICTORY
        // ============================================================
        
        function combatVictory() {
            const enemy = game.combat.enemy;
            const isBoss = game.combat.isBoss;
            
            let goldGained = enemy.gold;
            const hasGoldBonus = game.player.specialItems.some(i => i === "Merchant's Lucky Coin");
            if (hasGoldBonus) goldGained = Math.floor(goldGained * 1.5);
            
            game.player.gold += goldGained;
            
            const messages = [
                `Victory! ${enemy.name} is defeated!`,
                `You gained ${enemy.exp} experience!`,
                `You found ${goldGained} gold!`
            ];
            
            if (isBoss) {
                messages.push('You defeated the boss!');
                messages.push('Legendary treasure awaits!');
                game.player.inventory.push('Supreme Health Potion');
                game.player.inventory.push('Supreme Mana Potion');
                game.player.gold += 500;
                messages.push('You found Supreme potions and 500 bonus gold!');
            }
            
            speakSequence(messages, () => {
                gainExperience(enemy.exp);
                game.combat = null;
                game.currentRoom.type = 'empty';
            });
        }

        // ============================================================
        // PLAYER DEATH
        // ============================================================
        
        function playerDeath() {
            speakSequence([
                'You have fallen in battle...',
                `You reached level ${game.player.level} on floor ${game.dungeon.currentLevel}.`,
                'Say load to continue with a saved character.'
            ]);
            game.combat = null;
            game.phase = 'dead';
        }

        // ============================================================
        // END OF PART 4
        // Continue with Part 5...
