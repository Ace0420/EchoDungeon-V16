                // ============================================================
        // ECHO DUNGEON V15 - PART 3
        // Dungeon Generation, Movement, Rooms, Loot
        // ============================================================

        // ============================================================
        // DUNGEON GENERATION - V10.5 Distance-Based System
        // Boss always at 11,11. Enemy difficulty scales from center 6,6
        // ============================================================
        
        function generateDungeon() {
            game.dungeon.grid = {};
            const center = { x: 6, y: 6 };
            
            for (let x = 0; x < game.dungeon.size; x++) {
                for (let y = 0; y < game.dungeon.size; y++) {
                    const key = `${x},${y}`;
                    
                    // Starting position - welcome chest
                    if (x === 6 && y === 6) {
                        game.dungeon.grid[key] = {
                            type: 'treasure',
                            content: 'welcome_chest',
                            visited: false,
                            looted: false
                        };
                        continue;
                    }
                    
                    // Boss room
                    if (x === 11 && y === 11) {
                        game.dungeon.grid[key] = {
                            type: 'boss',
                            content: 'lichKing',
                            visited: false
                        };
                        continue;
                    }
                    
                    // Calculate distance from center for scaling
                    const distance = Math.abs(x - center.x) + Math.abs(y - center.y);
                    
                    // 50% combat, 30% treasure, 20% special
                    const roll = Math.random() * 100;
                    
                    if (roll < 50) {
                        game.dungeon.grid[key] = {
                            type: 'combat',
                            content: getEnemyByDistance(distance),
                            visited: false
                        };
                    } else if (roll < 80) {
                        game.dungeon.grid[key] = {
                            type: 'treasure',
                            content: 'chest',
                            visited: false,
                            looted: false
                        };
                    } else {
                        const specialTypes = ['fountain', 'shrine', 'merchant', 'stairs'];
                        game.dungeon.grid[key] = {
                            type: 'special',
                            content: specialTypes[Math.floor(Math.random() * specialTypes.length)],
                            visited: false,
                            used: false
                        };
                    }
                }
            }
            
            game.currentRoom = game.dungeon.grid['6,6'];
        }

        function getEnemyByDistance(distance) {
            if (distance <= 2) return 'goblin';
            if (distance <= 4) return 'skeleton';
            if (distance <= 6) return 'orc';
            if (distance <= 8) return 'troll';
            if (distance <= 10) return 'demon';
            return 'dragon';
        }

        // ============================================================
        // MOVEMENT
        // ============================================================
        
        function move(direction) {
            const pos = game.player.position;
            let newX = pos.x;
            let newY = pos.y;
            
            if (direction === 'north') newY--;
            if (direction === 'south') newY++;
            if (direction === 'east') newX++;
            if (direction === 'west') newX--;
            
            if (newX < 0 || newX >= game.dungeon.size || newY < 0 || newY >= game.dungeon.size) {
                speak('You cannot go that way. You are at the edge of the dungeon.');
                return;
            }
            
            game.player.position.x = newX;
            game.player.position.y = newY;
            
            const key = `${newX},${newY}`;
            game.currentRoom = game.dungeon.grid[key];
            
            if (!game.currentRoom.visited) {
                game.currentRoom.visited = true;
                game.player.roomsExplored++;
                
                // Auto-save every 5 rooms
                if (game.player.roomsExplored % 5 === 0) {
                    saveGame();
                }
            }
            
            describeRoom();
        }

        // ============================================================
        // DESCRIBE ROOM
        // ============================================================
        
        function describeRoom() {
            const room = game.currentRoom;
            const pos = game.player.position;
            
            if (room.type === 'combat') {
                startCombat(room.content);
            } else if (room.type === 'boss') {
                startBossCombat();
            } else if (room.type === 'treasure') {
                if (room.content === 'welcome_chest') {
                    speak('You are at the dungeon entrance. A shiny welcome chest sits before you! Say open chest to claim your starting gift.');
                } else if (room.looted) {
                    speak('This room has an empty chest. You already took the treasure.');
                } else {
                    speak('You enter a room with a treasure chest! Say open chest to see what is inside.');
                }
            } else if (room.type === 'special') {
                if (room.content === 'fountain') {
                    if (room.used) {
                        speak('You find a dried fountain. Its magic has been spent.');
                    } else {
                        speak('You find a magical fountain! Crystal clear water flows from it. Say drink fountain to restore your health and mana.');
                    }
                } else if (room.content === 'shrine') {
                    if (room.used) {
                        speak('You find a silent shrine. Its blessing has been given.');
                    } else {
                        speak('You discover an ancient shrine! Divine energy radiates from it. Say use shrine to receive a blessing.');
                    }
                } else if (room.content === 'merchant') {
                    speak('A friendly merchant greets you! Say merchant to browse their wares.');
                } else if (room.content === 'stairs') {
                    speak('You find a descending staircase! It leads deeper into the dungeon. Say use stairs to descend to the next floor.');
                }
            } else {
                speak('The room is empty now.');
            }
        }

        function searchRoom() {
            const room = game.currentRoom;
            
            if (room.type === 'treasure' && !room.looted) {
                speak('You find a chest! Say open chest to loot it.');
            } else if (room.type === 'special') {
                describeRoom();
            } else {
                const searchRoll = Math.random();
                if (searchRoll < 0.3) {
                    const goldFound = Math.floor(Math.random() * 20 + 10) * game.dungeon.currentLevel;
                    game.player.gold += goldFound;
                    speak(`You search carefully and find ${goldFound} hidden gold!`);
                } else if (searchRoll < 0.5) {
                    const potionTypes = ['Health Potion', 'Mana Potion'];
                    const potion = potionTypes[Math.floor(Math.random() * potionTypes.length)];
                    game.player.inventory.push(potion);
                    speak(`You find a hidden ${potion}!`);
                } else {
                    speak('You search the room but find nothing of value.');
                }
            }
        }

        // ============================================================
        // OPEN CHEST - Floor-appropriate loot
        // ============================================================
        
        function openChest() {
            const room = game.currentRoom;
            
            if (room.type !== 'treasure') {
                speak('There is no chest here.');
                return;
            }
            
            if (room.looted) {
                speak('This chest is empty. You already took everything.');
                return;
            }
            
            room.looted = true;
            
            // Welcome chest
            if (room.content === 'welcome_chest') {
                const gold = 50;
                game.player.gold += gold;
                game.player.inventory.push('Health Potion');
                game.player.inventory.push('Mana Potion');
                
                speakSequence([
                    'You open the welcome chest!',
                    `You found ${gold} gold!`,
                    'You found a Health Potion!',
                    'You found a Mana Potion!',
                    'Your adventure begins!'
                ]);
                return;
            }
            
            // Regular chest - scales with floor
            const floor = game.dungeon.currentLevel;
            const loot = [];
            
            // Gold
            const gold = Math.floor((20 + Math.random() * 30) * floor);
            game.player.gold += gold;
            loot.push(`${gold} gold`);
            
            // Potions based on floor
            const potionRoll = Math.random();
            if (floor < 5) {
                if (potionRoll < 0.6) {
                    game.player.inventory.push('Health Potion');
                    loot.push('Health Potion');
                }
                if (potionRoll > 0.4) {
                    game.player.inventory.push('Mana Potion');
                    loot.push('Mana Potion');
                }
            } else if (floor < 10) {
                if (potionRoll < 0.5) {
                    game.player.inventory.push('Greater Health Potion');
                    loot.push('Greater Health Potion');
                }
                if (potionRoll > 0.5) {
                    game.player.inventory.push('Greater Mana Potion');
                    loot.push('Greater Mana Potion');
                }
            } else if (floor < 20) {
                game.player.inventory.push('Supreme Health Potion');
                game.player.inventory.push('Supreme Mana Potion');
                loot.push('Supreme Health Potion');
                loot.push('Supreme Mana Potion');
            } else {
                game.player.inventory.push('Ultimate Health Potion');
                game.player.inventory.push('Ultimate Mana Potion');
                loot.push('Ultimate Health Potion');
                loot.push('Ultimate Mana Potion');
            }
            
            // Equipment chance (15%)
            if (Math.random() < 0.15) {
                const equipTypes = ['weapon', 'armor', 'helmet', 'gloves', 'boots'];
                const equipType = equipTypes[Math.floor(Math.random() * equipTypes.length)];
                
                let equipList = [];
                if (equipType === 'weapon') equipList = equipment.weapons.filter(w => w.class === game.player.class);
                else if (equipType === 'armor') equipList = equipment.armor.filter(a => a.class === game.player.class);
                else if (equipType === 'helmet') equipList = equipment.helmets;
                else if (equipType === 'gloves') equipList = equipment.gloves;
                else if (equipType === 'boots') equipList = equipment.boots;
                
                if (equipList.length > 0) {
                    const item = equipList[Math.floor(Math.random() * equipList.length)];
                    game.player.inventory.push(item.name);
                    loot.push(item.name);
                }
            }
            
            // Ring chance (10%)
            if (Math.random() < 0.1) {
                const availableRings = rings.filter(r => !r.minLevel || game.player.level >= r.minLevel);
                if (availableRings.length > 0) {
                    const ring = availableRings[Math.floor(Math.random() * availableRings.length)];
                    game.player.inventory.push(ring.name);
                    loot.push(ring.name);
                }
            }
            
            // Treasure chance (8%)
            if (Math.random() < 0.08) {
                const treasure = treasures[Math.floor(Math.random() * treasures.length)];
                game.player.inventory.push(treasure.name);
                loot.push(treasure.name);
            }
            
            // Ability book chance (5% for mages, floor 5+)
            if (game.player.class === 'mage' && floor >= 5 && Math.random() < 0.05) {
                const availableAbilities = abilities.filter(a => 
                    a.class === 'mage' && 
                    (!a.minLevel || game.player.level >= a.minLevel) &&
                    !game.player.learnedAbilities.includes(a.name)
                );
                
                if (availableAbilities.length > 0) {
                    const ability = availableAbilities[Math.floor(Math.random() * availableAbilities.length)];
                    game.player.inventory.push(`Book of ${ability.name}`);
                    loot.push(`Book of ${ability.name}`);
                }
            }
            
            // Announce loot
            const messages = ['You open the chest!'];
            for (let item of loot) {
                messages.push(`You found ${item}!`);
            }
            speakSequence(messages);
        }

        // ============================================================
        // USE FOUNTAIN
        // ============================================================
        
        function useFountain() {
            const room = game.currentRoom;
            
            if (room.type !== 'special' || room.content !== 'fountain') {
                speak('There is no fountain here.');
                return;
            }
            
            if (room.used) {
                speak('The fountain has run dry. Its magic is spent.');
                return;
            }
            
            room.used = true;
            
            const healthRestored = game.player.maxHealth - game.player.health;
            const manaRestored = game.player.maxMana - game.player.mana;
            
            game.player.health = game.player.maxHealth;
            game.player.mana = game.player.maxMana;
            
            speakSequence([
                'You drink from the magical fountain!',
                'Cool, refreshing water flows through you!',
                `You restored ${healthRestored} health and ${manaRestored} mana!`,
                'You feel completely refreshed!'
            ]);
        }

        // ============================================================
        // USE SHRINE
        // ============================================================
        
        function useShrine() {
            const room = game.currentRoom;
            
            if (room.type !== 'special' || room.content !== 'shrine') {
                speak('There is no shrine here.');
                return;
            }
            
            if (room.used) {
                speak('The shrine is silent. Its blessing has been given.');
                return;
            }
            
            room.used = true;
            
            const blessings = [
                { type: 'health', amount: 50 },
                { type: 'mana', amount: 50 },
                { type: 'gold', amount: 100 },
                { type: 'experience', amount: 50 }
            ];
            
            const blessing = blessings[Math.floor(Math.random() * blessings.length)];
            
            if (blessing.type === 'health') {
                game.player.maxHealth += blessing.amount;
                game.player.health += blessing.amount;
                speak(`The shrine blesses you! Your maximum health increased by ${blessing.amount}!`);
            } else if (blessing.type === 'mana') {
                game.player.maxMana += blessing.amount;
                game.player.mana += blessing.amount;
                speak(`The shrine blesses you! Your maximum mana increased by ${blessing.amount}!`);
            } else if (blessing.type === 'gold') {
                game.player.gold += blessing.amount;
                speak(`The shrine blesses you with ${blessing.amount} gold!`);
            } else if (blessing.type === 'experience') {
                gainExperience(blessing.amount);
            }
        }

        // ============================================================
        // USE STAIRS
        // ============================================================
        
        function useStairs() {
            const room = game.currentRoom;
            
            if (room.type !== 'special' || room.content !== 'stairs') {
                speak('There are no stairs here.');
                return;
            }
            
            game.dungeon.currentLevel++;
            game.player.position = { x: 6, y: 6 };
            
            speakSequence([
                `You descend to floor ${game.dungeon.currentLevel}!`,
                'The air grows colder and more dangerous.',
                'Enemies here are much stronger!'
            ]);
            
            generateDungeon();
            saveGame();
            
            setTimeout(() => describeRoom(), 1500);
        }

        // ============================================================
        // MEDITATE - Scales with level (+10 per level)
        // ============================================================
        
        function meditate() {
            const manaRestore = 10 * game.player.level;
            const oldMana = game.player.mana;
            game.player.mana = Math.min(game.player.maxMana, game.player.mana + manaRestore);
            const actualRestore = game.player.mana - oldMana;
            
            if (actualRestore > 0) {
                speak(`You meditate and restore ${actualRestore} mana. Current mana: ${game.player.mana} of ${game.player.maxMana}.`);
            } else {
                speak(`Your mana is already full at ${game.player.maxMana}.`);
            }
        }

        // ============================================================
        // INVENTORY MANAGEMENT
        // ============================================================
        
        function listInventory() {
            if (game.player.inventory.length === 0) {
                speak('Your inventory is empty.');
                return;
            }
            
            const messages = [`You have ${game.player.inventory.length} items:`];
            
            const itemCounts = {};
            for (let item of game.player.inventory) {
                itemCounts[item] = (itemCounts[item] || 0) + 1;
            }
            
            for (let item in itemCounts) {
                const count = itemCounts[item];
                messages.push(`${item}: ${count}`);
            }
            
            speakSequence(messages);
        }

        function processPotionCommand(cmd) {
            if (cmd.includes('health')) {
                usePotion('health');
            } else if (cmd.includes('mana')) {
                usePotion('mana');
            } else {
                speak('Say health potion or mana potion.');
            }
        }

        function usePotion(type) {
            const potionPriority = type === 'health' 
                ? ['Ultimate Health Potion', 'Supreme Health Potion', 'Greater Health Potion', 'Health Potion']
                : ['Ultimate Mana Potion', 'Supreme Mana Potion', 'Greater Mana Potion', 'Mana Potion'];
            
            let foundPotion = null;
            let potionName = null;
            
            for (let potion of potionPriority) {
                const index = game.player.inventory.indexOf(potion);
                if (index !== -1) {
                    foundPotion = potion;
                    game.player.inventory.splice(index, 1);
                    break;
                }
            }
            
            if (!foundPotion) {
                speak(`You don't have any ${type} potions.`);
                return;
            }
            
            if (type === 'health') {
                const healAmounts = { 'Health Potion': 50, 'Greater Health Potion': 100, 'Supreme Health Potion': 300, 'Ultimate Health Potion': 800 };
                const amount = healAmounts[foundPotion];
                const oldHealth = game.player.health;
                game.player.health = Math.min(game.player.maxHealth, game.player.health + amount);
                const actualHeal = game.player.health - oldHealth;
                speak(`You drink ${foundPotion}! You restored ${actualHeal} health. Current health: ${game.player.health} of ${game.player.maxHealth}.`);
            } else {
                const manaAmounts = { 'Mana Potion': 30, 'Greater Mana Potion': 75, 'Supreme Mana Potion': 200, 'Ultimate Mana Potion': 500 };
                const amount = manaAmounts[foundPotion];
                const oldMana = game.player.mana;
                game.player.mana = Math.min(game.player.maxMana, game.player.mana + amount);
                const actualRestore = game.player.mana - oldMana;
                speak(`You drink ${foundPotion}! You restored ${actualRestore} mana. Current mana: ${game.player.mana} of ${game.player.maxMana}.`);
            }
        }

        // ============================================================
        // CHARACTER STATUS
        // ============================================================
        
        function characterStatus() {
            const messages = [
                `${game.player.name}, level ${game.player.level} ${game.player.race} ${game.player.class}.`,
                `Health: ${game.player.health} of ${game.player.maxHealth}.`,
                `Mana: ${game.player.mana} of ${game.player.maxMana}.`,
                `Gold: ${game.player.gold}.`,
                `Experience: ${game.player.experience} of ${game.player.experienceToNext}.`,
                `Attack: ${game.player.baseAttack}. Defense: ${game.player.defense}.`,
                `Position: ${game.player.position.x}, ${game.player.position.y} on floor ${game.dungeon.currentLevel}.`
            ];
            
            if (game.player.equippedRings.length > 0) {
                const ringCounts = {};
                game.player.equippedRings.forEach(r => ringCounts[r] = (ringCounts[r] || 0) + 1);
                const ringList = Object.entries(ringCounts).map(([r, c]) => c > 1 ? `${r} times ${c}` : r);
                messages.push(`Rings: ${ringList.join(', ')}.`);
            }
            
            speakSequence(messages);
        }

        // ============================================================
        // HELP
        // ============================================================
        
        function showHelp() {
            speakSequence([
                'Commands: North, South, East, West to move.',
                'Look around to examine. Search to find hidden items.',
                'Open chest for treasure.',
                'Say inventory to see items.',
                'Use health potion or mana potion.',
                'Meditate to restore mana. It scales with your level!',
                'Equip ring, remove ring for accessories.',
                'Read book to learn spells.',
                'Merchant to trade. Buy item name to purchase.',
                'In combat: Attack, Defend, Special, Cast spell, or Flee.',
                'Save to save game. Load character name to load.',
                'Say list saves to see characters.'
            ]);
        }

        // ============================================================
        // LEVELING - Simple V10.5 style
        // ============================================================
        
        function gainExperience(amount) {
            const hasExpBonus = game.player.specialItems.some(i => i === 'Crystal of Experience');
            const finalAmount = hasExpBonus ? amount * 2 : amount;
            
            game.player.experience += finalAmount;
            speak(`You gained ${finalAmount} experience!`);
            
            while (game.player.experience >= game.player.experienceToNext) {
                levelUp();
            }
        }

        function levelUp() {
            game.player.level++;
            game.player.experience -= game.player.experienceToNext;
            game.player.experienceToNext = Math.floor(game.player.experienceToNext * 1.5);
            
            game.player.maxHealth += 10;
            game.player.health = game.player.maxHealth;
            game.player.maxMana += 5;
            game.player.mana = game.player.maxMana;
            game.player.baseAttack += 3;
            
            speakSequence([
                `Level up! You are now level ${game.player.level}!`,
                `Maximum health increased to ${game.player.maxHealth}!`,
                `Maximum mana increased to ${game.player.maxMana}!`,
                `Attack power increased to ${game.player.baseAttack}!`,
                'Health and mana fully restored!'
            ]);
            
            saveGame();
        }

        // ============================================================
        // END OF PART 3
        // Continue with Part 4...
        // ============================================================
