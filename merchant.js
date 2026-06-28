        // ============================================================
                // ============================================================
        // ECHO DUNGEON V15 - PART 5
        // Merchant, Equipment, Rings, Books, Special Items
        // ============================================================

        // ============================================================
        // MERCHANT SYSTEM
        // ============================================================
        
        function talkToMerchant() {
            if (game.currentRoom.type !== 'special' || game.currentRoom.content !== 'merchant') {
                speak('There is no merchant here.');
                return;
            }
            game.merchantOpen = true;
            speak('A mysterious merchant greets you. Say what do you have to see wares, buy item name to purchase, or leave to exit.');
        }

        function listMerchantWares() {
            const messages = ['The merchant offers:'];
            const level = game.dungeon.currentLevel;
            
            merchantItems.forEach(item => {
                if (item.minLevel && level < item.minLevel) return;
                
                if (item.type === 'weapon' && item.class === game.player.class) {
                    messages.push(`${item.name} for ${item.price} gold. Attack ${item.attack}.`);
                } else if (item.type === 'armor' && item.class === game.player.class) {
                    messages.push(`${item.name} for ${item.price} gold. Defense ${item.defense}.`);
                } else if (item.type === 'shield' && (!item.class || item.class === game.player.class)) {
                    messages.push(`${item.name} for ${item.price} gold. Defense ${item.defense}.`);
                } else if (item.type === 'helmet' && (!item.class || item.class === game.player.class)) {
                    let desc = `${item.name} for ${item.price} gold.`;
                    if (item.defense) desc += ` Defense ${item.defense}.`;
                    if (item.mana) desc += ` Mana ${item.mana}.`;
                    messages.push(desc);
                } else if (item.type === 'gloves' && (!item.class || item.class === game.player.class)) {
                    let desc = `${item.name} for ${item.price} gold.`;
                    if (item.attack) desc += ` Attack ${item.attack}.`;
                    if (item.mana) desc += ` Mana ${item.mana}.`;
                    messages.push(desc);
                } else if (item.type === 'boots' && (!item.class || item.class === game.player.class)) {
                    let desc = `${item.name} for ${item.price} gold.`;
                    if (item.defense) desc += ` Defense ${item.defense}.`;
                    if (item.mana) desc += ` Mana ${item.mana}.`;
                    if (item.health) desc += ` Health ${item.health}.`;
                    messages.push(desc);
                } else if (item.type === 'bracelet') {
                    messages.push(`${item.name} for ${item.price} gold. Attack ${item.attack}, Mana ${item.mana}.`);
                } else if (item.type === 'potion') {
                    messages.push(`${item.name} for ${item.price} gold.`);
                } else if (item.type === 'special_potion' || item.type === 'special_item' || item.type === 'special_ring' || item.type === 'special_amulet') {
                    messages.push(`${item.name} for ${item.price} gold. ${item.description || item.effect}.`);
                }
            });
            messages.push('Say buy followed by the item name to purchase.');
            speakSequence(messages);
        }

        function buyFromMerchant(command) {
            let itemToBuy = null;
            
            for (let item of merchantItems) {
                if (command.includes(item.name.toLowerCase())) {
                    if (item.minLevel && game.dungeon.currentLevel < item.minLevel) {
                        speak(`${item.name} requires dungeon level ${item.minLevel}. Come back later.`);
                        return;
                    }
                    if (item.type === 'weapon' || item.type === 'armor' || item.type === 'helmet' || 
                        item.type === 'gloves' || item.type === 'boots' || item.type === 'shield' || item.type === 'bracelet') {
                        if (item.class === game.player.class || !item.class) {
                            itemToBuy = item;
                            break;
                        }
                    } else {
                        itemToBuy = item;
                        break;
                    }
                }
            }

            if (!itemToBuy) {
                speak('Item not found or not for your class. Say what do you have to see items.');
                return;
            }

            if (game.player.gold < itemToBuy.price) {
                speak(`${itemToBuy.name} costs ${itemToBuy.price} gold. You only have ${game.player.gold}.`);
                return;
            }

            game.player.gold -= itemToBuy.price;

            // RING OF REGENERATION - Special unlimited auto-equip
            if (itemToBuy.name === 'Ring of Regeneration') {
                game.player.equippedRings.push('Ring of Regeneration');
                speak(`You bought and equipped Ring of Regeneration! You now heal 50 health per turn in combat! You have ${game.player.equippedRings.filter(r => r === 'Ring of Regeneration').length} Rings of Regeneration equipped. Gold remaining: ${game.player.gold}.`);
                return;
            }

            // ELIXIR OF IMMORTALITY - Drink it for permanent effect
            if (itemToBuy.name === 'Elixir of Immortality') {
                game.player.activeEffects.push({ type: 'revive', permanent: true });
                speak(`You drink the Elixir of Immortality! You will automatically revive once with 50% health if you die! Gold remaining: ${game.player.gold}.`);
                return;
            }

            // POTION OF GIANT STRENGTH - Drink for 3 battle buff
            if (itemToBuy.name === 'Potion of Giant Strength') {
                game.player.activeEffects.push({ type: 'strength', duration: 3 });
                speak(`You drink the Potion of Giant Strength! Your attack damage is doubled for the next 3 battles! Gold remaining: ${game.player.gold}.`);
                return;
            }

            // ELIXIR OF CLARITY - Drink for 3 battle buff
            if (itemToBuy.name === 'Elixir of Clarity') {
                game.player.activeEffects.push({ type: 'clarity', duration: 3 });
                speak(`You drink the Elixir of Clarity! All spell costs are reduced by 50% for the next 3 battles! Gold remaining: ${game.player.gold}.`);
                return;
            }

            // MERCHANT'S LUCKY COIN - Permanent special item
            if (itemToBuy.name === "Merchant's Lucky Coin") {
                game.player.specialItems.push("Merchant's Lucky Coin");
                speak(`You bought the Merchant's Lucky Coin! You now gain 50% more gold from all sources! Gold remaining: ${game.player.gold}.`);
                return;
            }

            // CRYSTAL OF EXPERIENCE - Permanent special item
            if (itemToBuy.name === 'Crystal of Experience') {
                game.player.specialItems.push('Crystal of Experience');
                speak(`You bought the Crystal of Experience! You now gain double experience from all sources! Gold remaining: ${game.player.gold}.`);
                return;
            }

            // AMULET OF THE ARCANE MASTER
            if (itemToBuy.type === 'special_amulet') {
                if (game.player.equippedAmulet) {
                    game.player.inventory.push(game.player.equippedAmulet);
                }
                game.player.equippedAmulet = itemToBuy.name;
                game.player.maxMana += itemToBuy.manaValue;
                game.player.mana += itemToBuy.manaValue;
                speak(`You bought and equipped ${itemToBuy.name}! Max mana increased by ${itemToBuy.manaValue}! Gold remaining: ${game.player.gold}.`);
                return;
            }

            // EQUIPMENT - Auto-equip
            if (itemToBuy.type === 'weapon') {
                if (game.player.weapon) game.player.inventory.push(game.player.weapon);
                game.player.weapon = itemToBuy.name;
                speak(`You bought and equipped ${itemToBuy.name}! Attack +${itemToBuy.attack}! Gold remaining: ${game.player.gold}.`);
                updateDefense();
            } else if (itemToBuy.type === 'armor') {
                if (game.player.armor) game.player.inventory.push(game.player.armor);
                game.player.armor = itemToBuy.name;
                speak(`You bought and equipped ${itemToBuy.name}! Defense +${itemToBuy.defense}! Gold remaining: ${game.player.gold}.`);
                updateDefense();
            } else if (itemToBuy.type === 'shield') {
                if (game.player.shield) game.player.inventory.push(game.player.shield);
                game.player.shield = itemToBuy.name;
                speak(`You bought and equipped ${itemToBuy.name}! Defense +${itemToBuy.defense}! Gold remaining: ${game.player.gold}.`);
                updateDefense();
            } else if (itemToBuy.type === 'helmet') {
                if (game.player.helmet) game.player.inventory.push(game.player.helmet);
                game.player.helmet = itemToBuy.name;
                let desc = `You bought and equipped ${itemToBuy.name}!`;
                if (itemToBuy.defense) desc += ` Defense +${itemToBuy.defense}!`;
                if (itemToBuy.mana) {
                    game.player.maxMana += itemToBuy.mana;
                    game.player.mana += itemToBuy.mana;
                    desc += ` Mana +${itemToBuy.mana}!`;
                }
                desc += ` Gold remaining: ${game.player.gold}.`;
                speak(desc);
                updateDefense();
            } else if (itemToBuy.type === 'gloves') {
                if (game.player.gloves) game.player.inventory.push(game.player.gloves);
                game.player.gloves = itemToBuy.name;
                let desc = `You bought and equipped ${itemToBuy.name}!`;
                if (itemToBuy.attack) desc += ` Attack +${itemToBuy.attack}!`;
                if (itemToBuy.mana) {
                    game.player.maxMana += itemToBuy.mana;
                    game.player.mana += itemToBuy.mana;
                    desc += ` Mana +${itemToBuy.mana}!`;
                }
                desc += ` Gold remaining: ${game.player.gold}.`;
                speak(desc);
            } else if (itemToBuy.type === 'boots') {
                if (game.player.boots) game.player.inventory.push(game.player.boots);
                game.player.boots = itemToBuy.name;
                let desc = `You bought and equipped ${itemToBuy.name}!`;
                if (itemToBuy.defense) desc += ` Defense +${itemToBuy.defense}!`;
                if (itemToBuy.mana) {
                    game.player.maxMana += itemToBuy.mana;
                    game.player.mana += itemToBuy.mana;
                    desc += ` Mana +${itemToBuy.mana}!`;
                }
                if (itemToBuy.health) {
                    game.player.maxHealth += itemToBuy.health;
                    game.player.health += itemToBuy.health;
                    desc += ` Health +${itemToBuy.health}!`;
                }
                desc += ` Gold remaining: ${game.player.gold}.`;
                speak(desc);
                updateDefense();
            } else if (itemToBuy.type === 'bracelet') {
                const hand = command.includes('left') ? 'left' : command.includes('right') ? 'right' : 
                            !game.player.leftBracelet ? 'left' : !game.player.rightBracelet ? 'right' : null;
                
                if (!hand) {
                    speak('Both bracelet slots full. Say buy left bracelet or buy right bracelet to specify.');
                    game.player.gold += itemToBuy.price;
                    return;
                }
                
                if (hand === 'left' && game.player.leftBracelet) {
                    game.player.inventory.push(game.player.leftBracelet);
                } else if (hand === 'right' && game.player.rightBracelet) {
                    game.player.inventory.push(game.player.rightBracelet);
                }
                
                if (hand === 'left') {
                    game.player.leftBracelet = itemToBuy.name;
                } else {
                    game.player.rightBracelet = itemToBuy.name;
                }
                
                if (itemToBuy.mana) {
                    game.player.maxMana += itemToBuy.mana;
                    game.player.mana += itemToBuy.mana;
                }
                speak(`You bought and equipped ${itemToBuy.name} on your ${hand} wrist! Attack +${itemToBuy.attack}, Mana +${itemToBuy.mana}! Gold remaining: ${game.player.gold}.`);
            } else {
                // Regular items to inventory
                game.player.inventory.push(itemToBuy.name);
                speak(`You bought ${itemToBuy.name} for ${itemToBuy.price} gold. Gold remaining: ${game.player.gold}.`);
            }
        }

        // ============================================================
        // RING SYSTEM - Up to 10 rings, max 2 of same (EXCEPT Regeneration)
        // ============================================================
        
        function equipRing(command) {
            const ringName = command.includes('vitality') || command.includes('health') ? 'Ring of Vitality' :
                             command.includes('minor mana') ? 'Ring of Minor Mana' :
                             command.includes('protection') ? 'Ring of Protection' :
                             command.includes('strength') ? 'Ring of Strength' :
                             command.includes('wisdom') ? 'Ring of Wisdom' :
                             command.includes('titan') ? 'Ring of the Titan' :
                             command.includes('arcane power') ? 'Ring of Arcane Power' :
                             command.includes('berserker') ? 'Ring of the Berserker' :
                             command.includes('regeneration') ? 'Ring of Regeneration' :
                             command.includes('ancient ring') ? 'Ancient Ring' :
                             command.includes('cosmic ring') ? 'Cosmic Ring' :
                             command.includes('devastation') ? 'Ring of Devastation' :
                             command.includes('ragnarok ring') ? 'Ragnarok Ring' :
                             command.includes('genesis ring') ? 'Genesis Ring' :
                             command.includes('apocalypse ring') ? 'Apocalypse Ring' : null;

            if (!ringName) {
                const availableRings = game.player.inventory.filter(item => 
                    rings.some(r => r.name === item) || item === 'Ring of Regeneration'
                );
                if (availableRings.length > 0) {
                    speak(`You have: ${availableRings.join(', ')}. Say which one to equip.`);
                } else {
                    speak('You have no rings. Find them in chests or buy from merchants.');
                }
                return;
            }

            const ringIndex = game.player.inventory.findIndex(item => item === ringName);
            if (ringIndex === -1) {
                speak(`You do not have ${ringName}.`);
                return;
            }

            if (game.player.equippedRings.length >= 10) {
                speak('You already have 10 rings equipped. Say remove ring first.');
                return;
            }

            // Ring of Regeneration is unlimited
            if (ringName !== 'Ring of Regeneration') {
                const equippedCount = game.player.equippedRings.filter(r => r === ringName).length;
                if (equippedCount >= 2) {
                    speak(`You already have 2 ${ringName} equipped. Maximum 2 of same ring.`);
                    return;
                }
            }

            const ringData = rings.find(r => r.name === ringName);
            if (!ringData && ringName !== 'Ring of Regeneration') {
                speak('Ring data error.');
                return;
            }

            game.player.inventory.splice(ringIndex, 1);
            game.player.equippedRings.push(ringName);
            
            if (ringName === 'Ring of Regeneration') {
                const regenCount = game.player.equippedRings.filter(r => r === 'Ring of Regeneration').length;
                speak(`You equip ${ringName}! You now heal ${regenCount * 50} per turn in combat! You have ${game.player.equippedRings.length} rings equipped.`);
            } else if (ringData.stat === 'maxHealth') {
                game.player.maxHealth += ringData.value;
                game.player.health += ringData.value;
                speak(`You equip ${ringName}! Max health increased by ${ringData.value}! You have ${game.player.equippedRings.length} rings equipped.`);
            } else if (ringData.stat === 'maxMana') {
                game.player.maxMana += ringData.value;
                game.player.mana += ringData.value;
                speak(`You equip ${ringName}! Max mana increased by ${ringData.value}! You have ${game.player.equippedRings.length} rings equipped.`);
            } else if (ringData.stat === 'attack') {
                speak(`You equip ${ringName}! Attacks are stronger! You have ${game.player.equippedRings.length} rings equipped.`);
            }
        }

        function removeRing(command) {
            if (game.player.equippedRings.length === 0) {
                speak('You have no rings equipped.');
                return;
            }

            const ringName = command.includes('vitality') ? 'Ring of Vitality' :
                             command.includes('minor mana') ? 'Ring of Minor Mana' :
                             command.includes('protection') ? 'Ring of Protection' :
                             command.includes('strength') ? 'Ring of Strength' :
                             command.includes('wisdom') ? 'Ring of Wisdom' :
                             command.includes('titan') ? 'Ring of the Titan' :
                             command.includes('arcane power') ? 'Ring of Arcane Power' :
                             command.includes('berserker') ? 'Ring of the Berserker' :
                             command.includes('regeneration') ? 'Ring of Regeneration' :
                             command.includes('ancient ring') ? 'Ancient Ring' :
                             command.includes('cosmic ring') ? 'Cosmic Ring' :
                             command.includes('devastation') ? 'Ring of Devastation' :
                             command.includes('ragnarok ring') ? 'Ragnarok Ring' :
                             command.includes('genesis ring') ? 'Genesis Ring' :
                             command.includes('apocalypse ring') ? 'Apocalypse Ring' : null;

            if (!ringName) {
                const ringCounts = {};
                game.player.equippedRings.forEach(ring => ringCounts[ring] = (ringCounts[ring] || 0) + 1);
                const ringList = Object.entries(ringCounts).map(([ring, count]) => 
                    count > 1 ? `${ring} times ${count}` : ring
                );
                speak(`Equipped rings: ${ringList.join(', ')}. Say which to remove.`);
                return;
            }

            const ringIndex = game.player.equippedRings.findIndex(r => r === ringName);
            if (ringIndex === -1) {
                speak(`You do not have ${ringName} equipped.`);
                return;
            }

            game.player.equippedRings.splice(ringIndex, 1);
            game.player.inventory.push(ringName);

            const ringData = rings.find(r => r.name === ringName);
            if (ringName === 'Ring of Regeneration') {
                speak(`You remove ${ringName}. You have ${game.player.equippedRings.length} rings equipped.`);
            } else if (ringData.stat === 'maxHealth') {
                game.player.maxHealth -= ringData.value;
                game.player.health = Math.min(game.player.health, game.player.maxHealth);
                speak(`You remove ${ringName}. Max health decreased by ${ringData.value}. You have ${game.player.equippedRings.length} rings equipped.`);
            } else if (ringData.stat === 'maxMana') {
                game.player.maxMana -= ringData.value;
                game.player.mana = Math.min(game.player.mana, game.player.maxMana);
                speak(`You remove ${ringName}. Max mana decreased by ${ringData.value}. You have ${game.player.equippedRings.length} rings equipped.`);
            } else {
                speak(`You remove ${ringName}. You have ${game.player.equippedRings.length} rings equipped.`);
            }
        }

        // ============================================================
        // EQUIPMENT SYSTEM
        // ============================================================
        
        function equipItem(command) {
            let foundItem = null;
            
            for (let item of game.player.inventory) {
                if (command.includes(item.toLowerCase())) {
                    foundItem = item;
                    break;
                }
            }
            
            if (!foundItem) {
                speak('Item not found in inventory.');
                return;
            }
            
            // Check equipment types
            const weaponData = equipment.weapons.find(w => w.name === foundItem);
            const armorData = equipment.armor.find(a => a.name === foundItem);
            const shieldData = equipment.shields.find(s => s.name === foundItem);
            const helmetData = equipment.helmets.find(h => h.name === foundItem);
            const glovesData = equipment.gloves.find(g => g.name === foundItem);
            const bootsData = equipment.boots.find(b => b.name === foundItem);
            
            const itemIndex = game.player.inventory.indexOf(foundItem);
            
            if (weaponData) {
                if (game.player.weapon) game.player.inventory.push(game.player.weapon);
                game.player.weapon = foundItem;
                game.player.inventory.splice(itemIndex, 1);
                speak(`You equipped ${foundItem}!`);
            } else if (armorData) {
                if (game.player.armor) game.player.inventory.push(game.player.armor);
                game.player.armor = foundItem;
                game.player.inventory.splice(itemIndex, 1);
                speak(`You equipped ${foundItem}!`);
                updateDefense();
            } else if (shieldData) {
                if (game.player.shield) game.player.inventory.push(game.player.shield);
                game.player.shield = foundItem;
                game.player.inventory.splice(itemIndex, 1);
                speak(`You equipped ${foundItem}!`);
                updateDefense();
            } else if (helmetData) {
                if (game.player.helmet) game.player.inventory.push(game.player.helmet);
                game.player.helmet = foundItem;
                game.player.inventory.splice(itemIndex, 1);
                speak(`You equipped ${foundItem}!`);
                updateDefense();
            } else if (glovesData) {
                if (game.player.gloves) game.player.inventory.push(game.player.gloves);
                game.player.gloves = foundItem;
                game.player.inventory.splice(itemIndex, 1);
                speak(`You equipped ${foundItem}!`);
            } else if (bootsData) {
                if (game.player.boots) game.player.inventory.push(game.player.boots);
                game.player.boots = foundItem;
                game.player.inventory.splice(itemIndex, 1);
                speak(`You equipped ${foundItem}!`);
                updateDefense();
            } else {
                speak('That item cannot be equipped.');
            }
        }

        function equipAmulet(command) {
            speak('Amulets can only be purchased from merchants.');
        }

        function equipBracelet(command) {
            speak('Bracelets can only be purchased from merchants.');
        }

        // ============================================================
        // READ BOOK - Learn abilities
        // ============================================================
        
        function readBook(command) {
            let bookName = null;
            
            for (let item of game.player.inventory) {
                if (item.includes('Book of') && command.includes(item.toLowerCase().replace('book of ', ''))) {
                    bookName = item;
                    break;
                }
            }
            
            if (!bookName) {
                speak('You do not have that book.');
                return;
            }
            
            const abilityName = bookName.replace('Book of ', '');
            const abilityData = abilities.find(a => a.name === abilityName);
            
            if (!abilityData) {
                speak('Book error.');
                return;
            }
            
            if (game.player.learnedAbilities.includes(abilityName)) {
                speak(`You already know ${abilityName}.`);
                return;
            }
            
            if (abilityData.minLevel && game.player.level < abilityData.minLevel) {
                speak(`You need to be level ${abilityData.minLevel} to learn ${abilityName}.`);
                return;
            }
            
            const bookIndex = game.player.inventory.indexOf(bookName);
            game.player.inventory.splice(bookIndex, 1);
            game.player.learnedAbilities.push(abilityName);
            
            speak(`You read ${bookName} and learned ${abilityName}! ${abilityData.description}. Costs ${abilityData.cost} mana.`);
        }

        // ============================================================
        // JUNK BAG SYSTEM
        // ============================================================
        
        function addToJunk(command) {
            const sellableItems = game.player.inventory.filter(item => {
                return equipment.weapons.some(w => w.name === item) ||
                       equipment.armor.some(a => a.name === item) ||
                       equipment.shields.some(s => s.name === item) ||
                       equipment.helmets.some(h => h.name === item) ||
                       equipment.gloves.some(g => g.name === item) ||
                       equipment.boots.some(b => b.name === item) ||
                       equipment.bracelets.some(b => b.name === item) ||
                       treasures.some(t => t.name === item);
            });

            if (sellableItems.length === 0) {
                speak('You have no equipment or treasures to junk.');
                return;
            }

            let itemToAdd = null;
            for (let item of sellableItems) {
                if (command.includes(item.toLowerCase())) {
                    itemToAdd = item;
                    break;
                }
            }

            if (!itemToAdd) {
                speak('Item not found. Say view junk to see what you can junk.');
                return;
            }

            const itemIndex = game.player.inventory.indexOf(itemToAdd);
            game.player.inventory.splice(itemIndex, 1);
            game.player.junkBag.push(itemToAdd);
            speak(`${itemToAdd} added to junk bag.`);
        }

        function viewJunk() {
            if (game.player.junkBag.length === 0) {
                speak('Your junk bag is empty.');
                return;
            }
            
            speak(`Junk bag contains: ${game.player.junkBag.join(', ')}.`);
        }

        function sellAllJunk() {
            if (game.player.junkBag.length === 0) {
                speak('Your junk bag is empty.');
                return;
            }
            
            let totalGold = 0;
            for (let item of game.player.junkBag) {
                const treasure = treasures.find(t => t.name === item);
                if (treasure) {
                    totalGold += treasure.value;
                } else {
                    const equipData = 
                        equipment.weapons.find(w => w.name === item) ||
                        equipment.armor.find(a => a.name === item) ||
                        equipment.shields.find(s => s.name === item) ||
                        equipment.helmets.find(h => h.name === item) ||
                        equipment.gloves.find(g => g.name === item) ||
                        equipment.boots.find(b => b.name === item) ||
                        equipment.bracelets.find(b => b.name === item);
                    if (equipData) {
                        totalGold += Math.floor(equipData.value * 0.5);
                    }
                }
            }
            
            game.player.gold += totalGold;
            game.player.junkBag = [];
            speak(`You sold all junk for ${totalGold} gold! Total gold: ${game.player.gold}.`);
        }

        // ============================================================
        // END OF PART 5
        // Continue with Part 6...
