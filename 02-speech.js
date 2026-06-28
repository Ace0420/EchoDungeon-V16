                // ============================================================
        // ECHO DUNGEON V15 - PART 2 (FIXED SPEECH RECOGNITION)
        // Merchant Items, Speech Systems, Character Creation
        // ============================================================

        // ============================================================
        // MERCHANT ITEMS - Complete V10.5 shop system
        // ============================================================
        
        const merchantItems = [
            { name: 'Health Potion', type: 'potion', price: 50 },
            { name: 'Mana Potion', type: 'potion', price: 40 },
            { name: 'Greater Health Potion', type: 'potion', price: 100, healing: 100 },
            { name: 'Greater Mana Potion', type: 'potion', price: 80, mana: 75 },
            { name: 'Supreme Health Potion', type: 'potion', price: 300, healing: 300, minLevel: 10 },
            { name: 'Supreme Mana Potion', type: 'potion', price: 250, mana: 200, minLevel: 10 },
            { name: 'Ultimate Health Potion', type: 'potion', price: 800, healing: 800, minLevel: 20 },
            { name: 'Ultimate Mana Potion', type: 'potion', price: 700, mana: 500, minLevel: 20 },
            { name: 'Elixir of Immortality', type: 'special_potion', price: 400, effect: 'revive', description: 'Auto-revive on death with 50% health' },
            { name: 'Potion of Giant Strength', type: 'special_potion', price: 300, effect: 'strength', duration: 3, description: 'Double attack damage for 3 battles' },
            { name: 'Elixir of Clarity', type: 'special_potion', price: 350, effect: 'clarity', description: 'All spells cost 50% less mana for 3 battles' },
            { name: "Merchant's Lucky Coin", type: 'special_item', price: 500, effect: '+50% gold from all sources', stat: 'goldBonus', value: 0.5 },
            { name: 'Crystal of Experience', type: 'special_item', price: 600, effect: '+100% experience gain', stat: 'expBonus', value: 1.0 },
            { name: 'Ring of Regeneration', type: 'special_ring', price: 400, effect: 'Restore 50 health per turn in combat', stat: 'regen', value: 50 },
            { name: 'Amulet of the Arcane Master', type: 'special_amulet', price: 700, effect: '+50 Max Mana and +10 spell damage', stat: 'arcane', manaValue: 50, damageValue: 10 },
            
            { name: 'Legendary Warhammer', type: 'weapon', price: 3500, attack: 65, class: 'warrior', description: 'Crushes all opposition' },
            { name: 'Staff of Ultimate Power', type: 'weapon', price: 4000, attack: 40, mana: 100, class: 'mage', description: 'Limitless arcane potential' },
            { name: 'Blades of the Phantom King', type: 'weapon', price: 3800, attack: 55, class: 'rogue', description: 'Strike from any shadow' },
            
            { name: 'Fortress Armor', type: 'armor', price: 4500, defense: 80, class: 'warrior', description: 'Impenetrable defense' },
            { name: 'Robes of Ultimate Magic', type: 'armor', price: 5000, defense: 60, mana: 120, class: 'mage', description: 'Channel infinite power' },
            { name: 'Suit of the Shadow Emperor', type: 'armor', price: 4800, defense: 70, class: 'rogue', description: 'One with darkness' },
            
            { name: 'Shield of the Immortal', type: 'shield', price: 5500, defense: 90, class: 'warrior', description: 'Nothing can harm you', minLevel: 10 },
            
            { name: 'Crown of Absolute Power', type: 'helmet', price: 6000, defense: 100, mana: 150, description: 'Ultimate authority', minLevel: 10 },
            
            { name: 'Gauntlets of the God Slayer', type: 'gloves', price: 5500, attack: 100, mana: 100, description: 'Destroy the divine', minLevel: 10 },
            
            { name: 'Boots of Infinity', type: 'boots', price: 5000, defense: 80, mana: 120, health: 150, description: 'Walk forever', minLevel: 10 },
            
            { name: 'Bracelet of the Cosmos', type: 'bracelet', price: 8000, attack: 80, mana: 200, description: 'Harness cosmic power', minLevel: 10 },
            { name: 'Bracelet of Annihilation', type: 'bracelet', price: 15000, attack: 150, mana: 350, description: 'Destroy all creation', minLevel: 20 }
        ];

        // ============================================================
        // SPEECH SYNTHESIS
        // ============================================================
        
        function speak(text, callback) {
            if (!window.speechSynthesis) {
                if (callback) callback();
                return;
            }
            
            try {
                window.speechSynthesis.cancel();
            } catch(e) {
                // Ignore
            }
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            
            utterance.onend = function() {
                if (callback) callback();
            };
            
            utterance.onerror = function() {
                if (callback) callback();
            };
            
            try {
                window.speechSynthesis.speak(utterance);
            } catch(e) {
                if (callback) callback();
            }
        }

        function speakSequence(messages, callback) {
            if (!messages || messages.length === 0) {
                if (callback) callback();
                return;
            }
            
            const message = messages.shift();
            speak(message, function() {
                speakSequence(messages, callback);
            });
        }

        // ============================================================
        // SPEECH RECOGNITION - V10.5 Pattern (Create fresh each time)
        // ============================================================

        function startListening() {
            if (!browserSupport.speechRecognition || !browserSupport.https) {
                speak('Voice recognition requires HTTPS and a compatible browser like Chrome or Edge.');
                return;
            }
            
            if (game.listening) {
                stopListening();
                return;
            }
            
            try {
                const Recognition = window.webkitSpeechRecognition || window.SpeechRecognition;
                recognition = new Recognition();
                recognition.continuous = false;
                recognition.lang = 'en-US';
                
                recognition.onstart = () => {
                    game.listening = true;
                    micButton.classList.add('listening');
                };
                
                recognition.onresult = (event) => {
                    const command = event.results[0][0].transcript.toLowerCase().trim();
                    displayText(`You said: "${command}"`);
                    stopListening();
                    setTimeout(() => processCommand(command), 500);
                };
                
                recognition.onerror = (event) => {
                    stopListening();
                    if (event.error !== 'no-speech' && event.error !== 'aborted') {
                        speak('Voice error. Try again.');
                    }
                };
                
                recognition.onend = () => {
                    stopListening();
                };
                
                recognition.start();
                
            } catch (e) {
                console.error('Recognition error:', e);
                speak('Could not start listening. Please try again.');
                game.listening = false;
                micButton.classList.remove('listening');
            }
        }

        function stopListening() {
            game.listening = false;
            micButton.classList.remove('listening');
            if (recognition) {
                try {
                    recognition.stop();
                } catch (e) {}
                recognition = null;
            }
        }

        // ============================================================
        // COMMAND PROCESSOR
        // ============================================================
        
        function processCommand(command) {
            const cmd = command.toLowerCase().trim();
            
            // Gender selection with flexible recognition
            if (game.needsGender) {
                if (cmd.includes('male') || cmd.includes('dude') && !cmd.includes('female')) {
                    game.player.gender = 'male';
                    game.needsGender = false;
                    game.needsRace = true;
                    speakSequence([
                        'Male selected!',
                        'Now, what is your race?',
                        'You can be a Human, Elf, Dwarf, or Orc.',
                        'Humans are balanced. Elves have more mana. Dwarves have more health. Orcs are strong warriors.'
                    ]);
                } else if (cmd.includes('female')) {
                    game.player.gender = 'female';
                    game.needsGender = false;
                    game.needsRace = true;
                    speakSequence([
                        'Female selected!',
                        'Now, what is your race?',
                        'You can be a Human, Elf, Dwarf, or Orc.',
                        'Humans are balanced. Elves have more mana. Dwarves have more health. Orcs are strong warriors.'
                    ]);
                } else {
                    speak('Please say male, or female.');
                }
                return;
            }
            
            // Race selection
            if (game.needsRace) {
                if (cmd.includes('human')) {
                    game.player.race = 'human';
                    game.needsRace = false;
                    game.needsClass = true;
                    speakSequence([
                        'Human chosen! Balanced and versatile.',
                        'Now choose your class!',
                        'Warrior: Strong melee fighter with high health.',
                        'Mage: Master of magic with powerful spells.',
                        'Rogue: Agile and cunning with special abilities.'
                    ]);
                } else if (cmd.includes('elf')) {
                    game.player.race = 'elf';
                    game.needsRace = false;
                    game.needsClass = true;
                    speakSequence([
                        'Elf chosen! Masters of magic with increased mana.',
                        'Now choose your class!',
                        'Warrior: Strong melee fighter with high health.',
                        'Mage: Master of magic with powerful spells.',
                        'Rogue: Agile and cunning with special abilities.'
                    ]);
                } else if (cmd.includes('dwarf')) {
                    game.player.race = 'dwarf';
                    game.needsRace = false;
                    game.needsClass = true;
                    speakSequence([
                        'Dwarf chosen! Tough and resilient with extra health.',
                        'Now choose your class!',
                        'Warrior: Strong melee fighter with high health.',
                        'Mage: Master of magic with powerful spells.',
                        'Rogue: Agile and cunning with special abilities.'
                    ]);
                } else if (cmd.includes('orc')) {
                    game.player.race = 'orc';
                    game.needsRace = false;
                    game.needsClass = true;
                    speakSequence([
                        'Orc chosen! Strong warriors with bonus health.',
                        'Now choose your class!',
                        'Warrior: Strong melee fighter with high health.',
                        'Mage: Master of magic with powerful spells.',
                        'Rogue: Agile and cunning with special abilities.'
                    ]);
                } else {
                    speak('Please choose Human, Elf, Dwarf, or Orc.');
                }
                return;
            }
            
            // Class selection
            if (game.needsClass) {
                if (cmd.includes('warrior')) {
                    game.player.class = 'warrior';
                    game.needsClass = false;
                    speak('Excellent! What is your name, brave warrior?');
                } else if (cmd.includes('mage') || cmd.includes('wizard')) {
                    game.player.class = 'mage';
                    game.needsClass = false;
                    speak('Wonderful! What is your name, wise mage?');
                } else if (cmd.includes('rogue') || cmd.includes('thief')) {
                    game.player.class = 'rogue';
                    game.needsClass = false;
                    speak('Perfect! What is your name, cunning rogue?');
                } else {
                    speak('Please choose Warrior, Mage, or Rogue.');
                }
                return;
            }
            
            // Name input
            if (game.player.class && !game.player.name) {
                game.player.name = command.charAt(0).toUpperCase() + command.slice(1);
                initializeCharacter();
                return;
            }
            
            // Merchant mode
            if (game.merchantOpen) {
                if (cmd.includes('leave') || cmd.includes('exit') || cmd.includes('close')) {
                    game.merchantOpen = false;
                    speak('You leave the merchant.');
                } else if (cmd.includes('buy') || cmd.includes('purchase')) {
                    buyFromMerchant(cmd);
                } else if (cmd.includes('what') || cmd.includes('wares') || cmd.includes('stock')) {
                    listMerchantWares();
                } else {
                    speak('Say buy, what do you have, or leave.');
                }
                return;
            }
            
            // Combat mode
            if (game.combat) {
                if (cmd.includes('attack') || cmd.includes('fight')) {
                    playerAttack();
                } else if (cmd.includes('defend') || cmd.includes('block') || cmd.includes('guard')) {
                    playerDefend();
                } else if (cmd.includes('special') || cmd.includes('ability')) {
                    playerSpecial();
                } else if (cmd.includes('cast') || cmd.includes('spell')) {
                    castSpell(cmd);
                } else if (cmd.includes('potion') || cmd.includes('use') || cmd.includes('drink') || cmd.includes('heal')) {
                    processPotionCommand(cmd);
                } else if (cmd.includes('flee') || cmd.includes('run') || cmd.includes('escape')) {
                    attemptFlee();
                } else {
                    speak('Say attack, defend, special, cast spell, use potion, or flee.');
                }
                return;
            }
            
            // Exploration commands
            if (cmd.includes('status') || cmd.includes('stats') || cmd.includes('check')) {
                characterStatus();
            } else if (cmd.includes('inventory') || cmd.includes('items') || cmd.includes('bag')) {
                listInventory();
            } else if (cmd.includes('remove ring') || cmd.includes('unequip ring')) {
                removeRing(cmd);
            } else if (cmd.includes('potion') || cmd.includes('use') || cmd.includes('drink') || cmd.includes('heal')) {
                processPotionCommand(cmd);
            } else if (cmd.includes('north') || cmd.includes('forward')) {
                move('north');
            } else if (cmd.includes('south') || cmd.includes('back')) {
                move('south');
            } else if (cmd.includes('east') || cmd.includes('right')) {
                move('east');
            } else if (cmd.includes('west') || cmd.includes('left')) {
                move('west');
            } else if (cmd.includes('meditate') || cmd.includes('rest')) {
                meditate();
            } else if (cmd.includes('look') || cmd.includes('around') || cmd.includes('where')) {
                describeRoom();
            } else if (cmd.includes('search') || cmd.includes('examine')) {
                searchRoom();
            } else if (cmd.includes('open chest') || cmd.includes('chest') || cmd.includes('loot')) {
                openChest();
            } else if (cmd.includes('fountain') || cmd.includes('drink water')) {
                useFountain();
            } else if (cmd.includes('stairs') || cmd.includes('go down') || cmd.includes('descend')) {
                useStairs();
            } else if (cmd.includes('merchant') || cmd.includes('shop') || cmd.includes('trade')) {
                talkToMerchant();
            } else if (cmd.includes('wear ring') || cmd.includes('equip ring') || cmd.includes('put on ring')) {
                equipRing(cmd);
            } else if (cmd.includes('equip amulet') || cmd.includes('wear amulet')) {
                equipAmulet(cmd);
            } else if (cmd.includes('equip bracelet') || cmd.includes('wear bracelet')) {
                equipBracelet(cmd);
            } else if (cmd.includes('equip') || cmd.includes('wear')) {
                equipItem(cmd);
            } else if (cmd.includes('read book') || cmd.includes('read') || cmd.includes('learn')) {
                readBook(cmd);
            } else if (cmd.includes('save')) {
                saveGame(cmd.replace('save', '').replace('game', '').trim() || null);
            } else if (cmd.includes('load')) {
                loadGame(cmd.replace('load', '').replace('game', '').trim() || null);
            } else if (cmd.includes('list') && cmd.includes('save')) {
                listSavedCharacters();
            } else if (cmd.includes('delete') && cmd.includes('save')) {
                deleteSave(cmd.replace('delete', '').replace('save', '').trim());
            } else if (cmd.includes('help')) {
                showHelp();
            } else if (cmd.includes('hint')) {
                giveHint();
            } else if (cmd.includes('junk') && (cmd.includes('add') || cmd.includes('put'))) {
                addToJunk(cmd);
            } else if (cmd.includes('sell junk') || cmd.includes('sell all junk')) {
                sellAllJunk();
            } else if (cmd.includes('view junk') || cmd.includes('check junk')) {
                viewJunk();
            } else if (cmd.includes('lockpicks') || cmd.includes('lockpick')) {
                useLockpicks();
            } else {
                speak('Unknown command. Say help for options.');
            }
        }

        // ============================================================
        // INITIALIZE CHARACTER
        // ============================================================
        
        function initializeCharacter() {
            const classData = classes[game.player.class];
            const raceData = races[game.player.race];
            
            // Apply class stats with race bonuses
            game.player.health = classData.health + raceData.healthBonus;
            game.player.maxHealth = classData.maxHealth + raceData.healthBonus;
            game.player.mana = classData.mana + raceData.manaBonus;
            game.player.maxMana = classData.maxMana + raceData.manaBonus;
            game.player.gold = classData.gold;
            
            // Equip starting gear
            for (let item of classData.items) {
                if (item === 'Steel Sword' || item === 'Mystic Staff' || item === 'Shadow Daggers') {
                    game.player.weapon = item;
                } else if (item === 'Chainmail' || item === 'Enchanted Robes' || item === 'Shadow Leather') {
                    game.player.armor = item;
                } else if (item === 'Iron Shield') {
                    game.player.shield = item;
                } else {
                    game.player.inventory.push(item);
                }
            }
            
            // Add class special
            game.player.learnedAbilities.push(classData.special.name);
            
            // Calculate defense
            updateDefense();
            
            // Initialize
            game.initialized = true;
            game.phase = 'exploration';
            
            // Generate dungeon
            generateDungeon();
            
            // Welcome
            speakSequence([
                `Excellent! ${game.player.name} the ${game.player.race} ${game.player.class} is ready for adventure!`,
                `You start with ${game.player.health} health, ${game.player.mana} mana, and ${game.player.gold} gold.`,
                `You are equipped with ${game.player.weapon}.`,
                `You stand at the entrance of the dungeon. A welcome chest awaits you!`,
                `The boss lurks in the far southeast corner at position 11, 11.`,
                `Tap anywhere and say help for commands. Good luck, brave hero!`
            ], () => {
                describeRoom();
            });
        }

        function updateDefense() {
            game.player.defense = 0;
            
            const armorData = equipment.armor.find(a => a.name === game.player.armor);
            if (armorData) game.player.defense += armorData.defense;
            
            const shieldData = equipment.shields.find(s => s.name === game.player.shield);
            if (shieldData) game.player.defense += shieldData.defense;
            
            const helmetData = equipment.helmets.find(h => h.name === game.player.helmet);
            if (helmetData && helmetData.defense) game.player.defense += helmetData.defense;
            
            const bootsData = equipment.boots.find(b => b.name === game.player.boots);
            if (bootsData && bootsData.defense) game.player.defense += bootsData.defense;
        }

        // ============================================================
        // END OF PART 2 (FIXED)
        // Continue with Part 3...
        // ============================================================
        // Continue with Part 3...
        // ============================================================
