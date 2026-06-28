        // ============================================================
                // ============================================================
        // ECHO DUNGEON V15 - PART 7 (CORRECTED)
        // New Potions, V10.5 Event System, Proper Closing
        // ============================================================

        // ============================================================
        // ADDITIONAL MERCHANT POTIONS - The Fun Stuff!
        // ============================================================
        
        merchantItems.push({
            name: 'Elixir of Haste',
            type: 'special_potion',
            price: 350,
            effect: 'haste',
            duration: 3,
            description: 'Attack twice per turn for 3 battles'
        });

        merchantItems.push({
            name: 'Potion of Stone Skin',
            type: 'special_potion',
            price: 400,
            effect: 'stoneskin',
            duration: 3,
            description: 'Take 50% less damage for 3 battles'
        });

        merchantItems.push({
            name: 'Elixir of Lucky Strikes',
            type: 'special_potion',
            price: 450,
            effect: 'lucky',
            duration: 3,
            description: 'All attacks are critical hits for 3 battles'
        });

        merchantItems.push({
            name: 'Potion of Arcane Mastery',
            type: 'special_potion',
            price: 500,
            effect: 'arcanemaster',
            duration: 3,
            description: 'Spells deal double damage for 3 battles'
        });

        merchantItems.push({
            name: 'Charm of Fortune',
            type: 'special_item',
            price: 1500,
            effect: 'Double gold and experience',
            stat: 'fortune'
        });

        merchantItems.push({
            name: 'Ring of Spell Storing',
            type: 'special_item',
            price: 2000,
            effect: 'Reduces all spell costs by 25%',
            stat: 'spellcost'
        });

        merchantItems.push({
            name: 'Bracelet of Shielding',
            type: 'bracelet',
            price: 300,
            attack: 5,
            mana: 20,
            description: 'Reduces incoming damage by 20%'
        });

        // ============================================================
        // BROWSER SUPPORT CHECK
        // ============================================================
        
        function checkBrowserSupport() {
            browserSupport.https = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
            browserSupport.speechSynthesis = !!(window.speechSynthesis && window.SpeechSynthesisUtterance);
            browserSupport.speechRecognition = !!(window.webkitSpeechRecognition || window.SpeechRecognition);
            
            if (!browserSupport.https) {
                speak('Warning: Speech recognition requires HTTPS.');
                return false;
            }
            
            if (!browserSupport.speechSynthesis) {
                speak('Warning: Your browser does not support speech synthesis.');
                return false;
            }
            
            if (!browserSupport.speechRecognition) {
                speak('Warning: Your browser does not support speech recognition. Please use Chrome or Edge.');
                return false;
            }
            
            return true;
        }

        // ============================================================
        // HANDLE CLICK - Your proven tap system
        // ============================================================
        
        function handleClick() {
            if (!game.started) {
                game.started = true;
                game.needsGender = true;
                micButton.classList.remove('start-button');
                speakSequence([
                    'Welcome to Echo Dungeon V-15!',
                    'Let us create your hero!',
                    'First, what is your gender? Say male, or female.'
                ]);
                return;
            }
            
            startListening();
        }

        // ============================================================
        // FINAL INITIALIZATION - DOMContentLoaded
        // ============================================================
        
        document.addEventListener('DOMContentLoaded', () => {
            checkBrowserSupport();
            setTimeout(() => {
                speak('Echo Dungeon V15 is ready. Tap the screen to begin.');
            }, 1000);
        });

        // Prevent context menu on the button
        micButton.addEventListener('contextmenu', (e) => e.preventDefault());

