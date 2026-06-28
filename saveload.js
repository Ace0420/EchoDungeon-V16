        // ============================================================
                // ============================================================
        // ECHO DUNGEON V15 - PART 6
        // Save/Load System, Helper Functions, Room Descriptions
        // ============================================================

        // ============================================================
        // ROOM DESCRIPTIONS - Atmospheric flavor text
        // ============================================================
        
        const roomTypes = {
            entrance: { 
                descriptions: [
                    'the grand entrance hall. Torches flicker on ancient stone walls.',
                    'the entrance chamber. A faded tapestry hangs on the north wall.',
                    'the starting hall. Cobwebs drape from vaulted ceilings above.'
                ], 
                hasEnemy: false 
            },
            empty: { 
                descriptions: [
                    'an abandoned barracks. Rusty weapons litter the floor.',
                    'a collapsed library. Torn pages scatter at your feet.',
                    'a crumbling shrine. A broken altar stands in the center.',
                    'a forgotten armory. Empty weapon racks line the walls.',
                    'a dusty workshop. Ancient tools hang from hooks.',
                    'a meditation chamber. Stone benches circle a dry fountain.',
                    'an old prison cell. Iron bars have rusted through.',
                    'a guard post. A skeleton sits slumped in a chair.'
                ], 
                hasEnemy: false 
            },
            treasure: { 
                descriptions: [
                    'a glittering treasure vault. Gold coins reflect torchlight.',
                    'a dragon\'s hoard chamber. Piles of jewels gleam in the darkness.',
                    'a royal treasury. Ancient chests overflow with riches.',
                    'a pirate\'s cache. Stolen goods fill every corner.',
                    'a wizard\'s vault. Magical artifacts pulse with energy.'
                ], 
                hasEnemy: false 
            },
            enemy: { 
                descriptions: [
                    'a dark chamber. You sense hostile eyes watching you.',
                    'a blood-stained arena. Old battle scars mark the floor.',
                    'a shadowy lair. Something growls in the darkness.',
                    'a monster\'s den. Bones crunch beneath your feet.',
                    'a cursed chamber. An evil presence fills the air.'
                ], 
                hasEnemy: true 
            },
            boss: { 
                descriptions: [
                    'the throne room of darkness. A massive beast awaits on a stone throne.',
                    'the dragon\'s lair. Heat radiates from the enormous creature before you.',
                    'the demon king\'s chamber. Dark energy swirls around your foe.'
                ], 
                hasEnemy: true 
            },
            fountain: {
                descriptions: [
                    'a magical fountain room. Crystal clear water bubbles from an enchanted spring.',
                    'an ancient healing shrine. A mystical fountain glows with restorative power.'
                ],
                hasEnemy: false
            },
            merchant: {
                descriptions: [
                    'a merchant\'s tent. A hooded figure tends to various wares.',
                    'a traveling shop. Mysterious goods line makeshift shelves.'
                ],
                hasEnemy: false
            }
        };

        function getRandomDescription(type) {
            const roomType = roomTypes[type];
            if (!roomType || !roomType.descriptions) return '';
            return roomType.descriptions[Math.floor(Math.random() * roomType.descriptions.length)];
        }

        // ============================================================
        // SAVE GAME SYSTEM - V14 Name-Based
        // ============================================================
        
        function saveGame(saveName) {
            if (!game.player.name) {
                speak('You must create a character before saving.');
                return;
            }
            
            const name = saveName || game.player.name;
            
            try {
                const saveData = {
                    version: 'V15',
                    timestamp: Date.now(),
                    player: JSON.parse(JSON.stringify(game.player)),
                    dungeon: {
                        grid: game.dungeon.grid,
                        size: game.dungeon.size,
                        currentLevel: game.dungeon.currentLevel,
                        hasSecretRoom: game.dungeon.hasSecretRoom
                    },
                    currentRoom: game.currentRoom,
                    phase: game.phase
                };
                
                const saveKey = `echoDungeon_char_${name.toLowerCase()}`;
                localStorage.setItem(saveKey, JSON.stringify(saveData));
                
                // Update character list
                let charList = JSON.parse(localStorage.getItem('echoDungeon_characters') || '[]');
                if (!charList.includes(name.toLowerCase())) {
                    charList.push(name.toLowerCase());
                    localStorage.setItem('echoDungeon_characters', JSON.stringify(charList));
                }
                
                speak(`Game saved! Character ${name} saved. Say load ${name} to continue later.`);
                
            } catch (e) {
                speak('Error saving game. Please try again.');
            }
        }

        // ============================================================
        // LOAD GAME SYSTEM
        // ============================================================
        
        function loadGame(characterName) {
            if (!characterName) {
                listSavedCharacters();
                return;
            }
            
            try {
                const saveKey = `echoDungeon_char_${characterName.toLowerCase()}`;
                const saveDataString = localStorage.getItem(saveKey);
                
                if (!saveDataString) {
                    speak(`No saved character named ${characterName}. Say list saves to see characters.`);
                    return;
                }
                
                const saveData = JSON.parse(saveDataString);
                
                // Restore game state
                Object.assign(game.player, saveData.player);
                game.dungeon.grid = saveData.dungeon.grid;
                game.dungeon.size = saveData.dungeon.size;
                game.dungeon.currentLevel = saveData.dungeon.currentLevel;
                game.dungeon.hasSecretRoom = saveData.dungeon.hasSecretRoom;
                game.currentRoom = saveData.currentRoom;
                game.phase = 'exploration';
                game.started = true;
                game.initialized = true;
                game.combat = null;
                
                // Recalculate defense
                updateDefense();
                
                speakSequence([
                    `Welcome back, ${game.player.name}!`,
                    `Level ${game.player.level} ${game.player.race} ${game.player.class}.`,
                    `Floor ${game.dungeon.currentLevel}.`,
                    `Health: ${game.player.health} of ${game.player.maxHealth}. Mana: ${game.player.mana} of ${game.player.maxMana}.`,
                    'Say look around or help for commands.'
                ]);
                
            } catch (e) {
                speak('Error loading save. File may be corrupted.');
            }
        }

        // ============================================================
        // LIST SAVED CHARACTERS
        // ============================================================
        
        function listSavedCharacters() {
            try {
                const charList = JSON.parse(localStorage.getItem('echoDungeon_characters') || '[]');
                
                if (charList.length === 0) {
                    speak('No saved characters. Start a new game and say save!');
                    return;
                }
                
                let messages = [`You have ${charList.length} saved character${charList.length > 1 ? 's' : ''}.`];
                
                for (let charName of charList) {
                    const saveKey = `echoDungeon_char_${charName}`;
                    const saveData = JSON.parse(localStorage.getItem(saveKey) || '{}');
                    
                    if (saveData.player) {
                        messages.push(`${saveData.player.name}: Level ${saveData.player.level} ${saveData.player.race} ${saveData.player.class}, Floor ${saveData.dungeon?.currentLevel || 1}.`);
                    }
                }
                
                messages.push('Say load followed by character name.');
                
                speakSequence(messages);
                
            } catch (e) {
                speak('Error reading save files.');
            }
        }

        // ============================================================
        // DELETE SAVE
        // ============================================================
        
        function deleteSave(characterName) {
            if (!characterName) {
                speak('Say delete save followed by character name.');
                return;
            }
            
            try {
                const saveKey = `echoDungeon_char_${characterName.toLowerCase()}`;
                
                if (!localStorage.getItem(saveKey)) {
                    speak(`No saved character named ${characterName}.`);
                    return;
                }
                
                localStorage.removeItem(saveKey);
                
                let charList = JSON.parse(localStorage.getItem('echoDungeon_characters') || '[]');
                charList = charList.filter(c => c !== characterName.toLowerCase());
                localStorage.setItem('echoDungeon_characters', JSON.stringify(charList));
                
                speak(`Character ${characterName} deleted. Farewell, brave hero.`);
                
            } catch (e) {
                speak('Error deleting save.');
            }
        }

        // ============================================================
        // LOCKPICKS SYSTEM - For Rogues
        // ============================================================
        
        function useLockpicks() {
            if (game.player.class !== 'rogue') {
                speak('Only rogues can use lockpicks.');
                return;
            }
            
            if (!game.player.inventory.includes('Lockpicks')) {
                speak('You do not have lockpicks.');
                return;
            }
            
            const room = game.currentRoom;
            
            if (room.type === 'treasure' && !room.looted) {
                const success = Math.random() < 0.8;
                if (success) {
                    speak('You expertly pick the lock! Opening the chest.');
                    openChest();
                } else {
                    speak('The lock is too complex. Try again or just open it normally.');
                }
            } else {
                // Find hidden treasure
                const findChance = 0.3;
                if (Math.random() < findChance) {
                    const goldFound = Math.floor(Math.random() * 50 + 25) * game.dungeon.currentLevel;
                    game.player.gold += goldFound;
                    speak(`You pick a hidden lock and find ${goldFound} gold!`);
                } else {
                    speak('You search for hidden locks but find nothing.');
                }
            }
        }

        // ============================================================
        // UNLEASH ABILITY - Forget learned abilities
        // ============================================================
        
        function unlearnAbility(command) {
            if (game.player.learnedAbilities.length === 0) {
                speak('You have no learned abilities.');
                return;
            }
            
            let abilityToForget = null;
            for (let ability of game.player.learnedAbilities) {
                if (command.includes(ability.toLowerCase())) {
                    abilityToForget = ability;
                    break;
                }
            }
            
            if (!abilityToForget) {
                speak(`Known abilities: ${game.player.learnedAbilities.join(', ')}. Say which to forget.`);
                return;
            }
            
            // Don't allow forgetting class special
            const classData = classes[game.player.class];
            if (abilityToForget === classData.special.name) {
                speak('You cannot forget your class special ability.');
                return;
            }
            
            const index = game.player.learnedAbilities.indexOf(abilityToForget);
            game.player.learnedAbilities.splice(index, 1);
            speak(`You forgot ${abilityToForget}.`);
        }

        // ============================================================
        // HINT SYSTEM
        // ============================================================
        
        function giveHint() {
            const hints = [
                'The boss is always at position 11, 11. Plan your route!',
                'Enemies get stronger the farther you are from the center.',
                'Buy Rings of Regeneration! Stack them for massive healing!',
                'Elixir of Immortality will save you once. Drink it before tough fights!',
                'Meditate restores 10 mana per level. Use it often!',
                'Special potions like Giant Strength and Clarity last 3 battles!',
                'Search rooms to find hidden gold and items!',
                'Merchants sell better gear on deeper floors!',
                'Save every 5 rooms automatically, but save manually before risky moves!',
                'The junk bag lets you sell old equipment for gold!',
                'Rings stack! You can equip up to 10 rings total!',
                'Read books to learn new spells and abilities!',
                'Fountains and shrines are one-time use per floor. Use them wisely!',
                'Defense reduces damage taken. Upgrade your armor!',
                'Rogues can use lockpicks to find hidden treasures!',
                'Boss fights drop huge rewards. Be prepared!',
                'Lucky Coin and Crystal of Experience boost gold and XP permanently!',
                'Time Stop freezes enemies for 2 turns. Perfect for setting up combos!',
                'Death Mark makes enemies take 50% more damage!',
                'Shadowmeld makes your next attack deal double damage!',
                'Level up fully restores health and mana!',
                'Flee from fights you cannot win. Bosses cannot be fled from!',
                'Stairs take you deeper. Enemies scale with each floor!',
                'Your starting position is always 6, 6. The center!',
                'Say status to check your stats quickly!'
            ];
            
            const hint = hints[Math.floor(Math.random() * hints.length)];
            speak(`Hint: ${hint}`);
        }

        // ============================================================
        // COMMANDS LIST
        // ============================================================
        
        function listCommands() {
            speakSequence([
                'Movement: North, South, East, West.',
                'Exploration: Look around, Search room, Open chest.',
                'Fountains: Drink fountain. Shrines: Use shrine. Stairs: Use stairs.',
                'Merchant: Say merchant, then buy item name.',
                'Inventory: Say inventory. Status: Say status.',
                'Potions: Use health potion or mana potion.',
                'Meditate: Restores mana based on level.',
                'Equipment: Equip item name. Equip ring name.',
                'Remove ring name to unequip rings.',
                'Books: Read book name to learn spells.',
                'Junk: Add junk item, Sell all junk.',
                'Lockpicks: Rogues can use lockpicks.',
                'Combat: Attack, Defend, Special, Cast spell name, Use potion, Flee.',
                'Save: Say save. Load: Say load character name.',
                'List saves to see characters.',
                'Help: Say help. Hint: Say hint for tips.'
            ]);
        }

        // ============================================================
        // DUNGEON COMPLETE - Floor finished
        // ============================================================
        
        function dungeonComplete() {
            speakSequence([
                'Congratulations! You cleared this floor!',
                'Find the stairs to descend deeper!',
                'Enemies grow stronger on each floor!',
                'Make sure to visit merchants for better gear!'
            ]);
        }

        // ============================================================
        // SCALE ENEMY FOR LEVEL - Floor-based enemy scaling
        // ============================================================
        
        function scaleEnemyForLevel(enemyTemplate, floor) {
            return {
                name: enemyTemplate.name,
                health: Math.floor(enemyTemplate.health * (1 + (floor - 1) * 0.3)),
                maxHealth: Math.floor(enemyTemplate.health * (1 + (floor - 1) * 0.3)),
                damage: Math.floor(enemyTemplate.damage * (1 + (floor - 1) * 0.25)),
                gold: Math.floor(enemyTemplate.gold * floor),
                exp: Math.floor(enemyTemplate.exp * floor),
                fleeChance: enemyTemplate.fleeChance,
                regenerate: enemyTemplate.regenerate || 0
            };
        }

        // ============================================================
        // BROWSER SUPPORT CHECK
        // ============================================================
        
        function checkBrowserSupport() {
            const isHttps = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
            const hasSpeechSynthesis = !!(window.speechSynthesis && window.SpeechSynthesisUtterance);
            const hasSpeechRecognition = !!(window.webkitSpeechRecognition || window.SpeechRecognition);
            
            if (!isHttps) {
                speak('Warning: Speech recognition requires HTTPS. Please use a secure connection.');
                return false;
            }
            
            if (!hasSpeechSynthesis) {
                speak('Warning: Your browser does not support speech synthesis.');
                return false;
            }
            
            if (!hasSpeechRecognition) {
                speak('Warning: Your browser does not support speech recognition. Please use Chrome or Edge.');
                return false;
            }
            
            return true;
        }

        // ============================================================
        // CLEAR JUNK BAG
        // ============================================================
        
        function clearJunk() {
            if (game.player.junkBag.length === 0) {
                speak('Your junk bag is empty.');
                return;
            }
            
            game.player.junkBag = [];
            speak('Junk bag cleared.');
        }

        // ============================================================
        // REMOVE FROM JUNK BAG
        // ============================================================
        
        function removeFromJunk(command) {
            if (game.player.junkBag.length === 0) {
                speak('Your junk bag is empty.');
                return;
            }
            
            let itemToRemove = null;
            for (let item of game.player.junkBag) {
                if (command.includes(item.toLowerCase())) {
                    itemToRemove = item;
                    break;
                }
            }
            
            if (!itemToRemove) {
                speak('Item not found in junk bag.');
                return;
            }
            
            const index = game.player.junkBag.indexOf(itemToRemove);
            game.player.junkBag.splice(index, 1);
            game.player.inventory.push(itemToRemove);
            speak(`${itemToRemove} removed from junk bag.`);
        }

        // ============================================================
        // RECALCULATE DEFENSE (Alias for updateDefense)
        // ============================================================
        
        function recalculateDefense() {
            updateDefense();
        }

        // ============================================================
        // GAME OVER - Alternative to playerDeath
        // ============================================================
        
        function gameOver() {
            playerDeath();
        }

        // ============================================================
        // DETERMINE LOOT - Treasure generation
        // ============================================================
        
        function determineLoot(chestType) {
            const floor = game.dungeon.currentLevel;
            const loot = [];
            
            // Gold
            const gold = Math.floor((20 + Math.random() * 30) * floor);
            loot.push({ type: 'gold', amount: gold });
            
            // Potions
            if (floor < 5) {
                if (Math.random() < 0.6) loot.push({ type: 'item', name: 'Health Potion' });
                if (Math.random() < 0.6) loot.push({ type: 'item', name: 'Mana Potion' });
            } else if (floor < 10) {
                if (Math.random() < 0.5) loot.push({ type: 'item', name: 'Greater Health Potion' });
                if (Math.random() < 0.5) loot.push({ type: 'item', name: 'Greater Mana Potion' });
            } else {
                loot.push({ type: 'item', name: 'Supreme Health Potion' });
                loot.push({ type: 'item', name: 'Supreme Mana Potion' });
            }
            
            return loot;
        }

        // ============================================================
        // DETERMINE TREASURE - Gem generation
        // ============================================================
        
        function determineTreasure() {
            const treasure = treasures[Math.floor(Math.random() * treasures.length)];
            return treasure.name;
        }

        // ============================================================
        // STOP LISTENING
        // ============================================================
        
        function stopListening() {
            if (recognition && game.listening) {
                recognition.stop();
                game.listening = false;
            }
        }

        // ============================================================
        // EQUIP WEAPON OR ARMOR (Helper)
        // ============================================================
        
        function equipWeaponOrArmor(itemName) {
            equipItem(`equip ${itemName}`);
        }

        // ============================================================
        // INITIALIZE GAME - Setup on first load
        // ============================================================
        
        function initializeGame() {
            if (!checkBrowserSupport()) {
                return;
            }
            
            if (!initSpeechRecognition()) {
                return;
            }
            
            speak('Welcome to Echo Dungeon! Tap anywhere to begin.');
        }

        // ============================================================
        // HANDLE CLICK - Tap anywhere to listen
        // ============================================================
        
        function handleClick(e) {
            if (e) e.preventDefault();
            startListening();
        }

        // ============================================================
        // END OF PART 6
        // Continue with Part 7 (Final)...
