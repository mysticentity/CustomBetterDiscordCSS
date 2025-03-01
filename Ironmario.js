import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

/*
 * -- IronMario Tracker Script
 * -- This script tracks various aspects of a run (attempt count, stars, warp mapping, etc.) by reading emulator memory,
 * -- logging data to files, and rendering an on-screen overlay.
 * -- It uses lunajson for JSON encoding and pl.tablex for deep table functions.
 */
 
// Dummy JSON library import replacement. In this code, we do not perform any JSON encoding/decoding,
// however, if needed one can use org.json or any similar library.
 
// Dummy Tablex deep copy functionality will be implemented in the Tablex class below.
 
public class IronMarioTrackerScript {
    
    // ----------------------------
    // CONFIGURATION STRUCTURES
    // ----------------------------
    public static class Config {
        // Main configuration table that holds version info, file paths, memory addresses, and user data.
        public static final String TRACKER_VERSION = "1.1.1";
        public static final String FONT_FACE = "Lucida Console";
        public static final boolean SHOW_SONG_TITLE = false; // Flag to toggle song title display on the UI.
        
        public static class FILES {
            public static final String ATTEMPT_COUNT = "usr/attempts.txt"; // File to record total attempt count.
            public static final String ATTEMPT_DATA = "usr/attempts_data.csv"; // CSV file for detailed run attempt data.
            public static final String PB_COUNT = "usr/pb_stars.txt"; // File for storing the personal best (PB) star count.
            public static final String SONG_INFO = "usr/song_info.txt"; // File for storing song info. (Location, Title)
            public static final String WARP_LOG = "usr/warp_log.json"; // File to log warp map data as JSON.
        }
        
        public static class MEM {
            // Memory addresses defined in the configuration.
            public static final int MARIO_BASE = 0x1a0340; // Base memory address for Mario-related data.
            public static final int HUD_BASE = 0x1a0330; // Base memory address for HUD elements.
            public static final int CURRENT_LEVEL_ID = 0x18fd78; // Address for the current level ID.
            public static final int CURRENT_SEED = 0x1cdf80; // Address for the current run's seed.
            public static final int DELAYED_WARP_OP = 0x1a031c; // Address for delayed warp operation code.
            public static final int INTENDED_LEVEL_ID = 0x19f0cc; // Address for the intended level after a warp.
            public static final int CURRENT_SONG_ID = 0x19485e; // Address for the current song ID.
            
            // Additional memory addresses for Mario-specific data derived from MARIO_BASE.
            public static class MARIO {
                public static final int INPUT = MARIO_BASE + 0x2; // Address for Mario's input flags or status.
                public static final int ACTION = MARIO_BASE + 0xC; // Address for Mario's current action/state.
                public static final int POS = MARIO_BASE + 0x3C; // Address for Mario's 3D position (stored as floats).
                public static final int HURT_COUNTER = MARIO_BASE + 0xB2; // Address for a counter indicating recent damage.
            }
            
            // Memory addresses for HUD-related data.
            public static class HUD {
                public static final int STARS = HUD_BASE + 0x4; // Address for the number of stars displayed.
                public static final int HEALTH = HUD_BASE + 0x6; // Address for Mario's health.
            }
        }
        
        public static class USER {
            public static int ATTEMPTS = 0; // Total number of attempts (will be updated from file).
            public static int PB_STARS = 0; // Personal best star count (will be updated from file).
        }
        
        public static final String BACKGROUND_IMAGE = "(None)"; // Default background image for the UI.
        
        // Level data configuration including level names and abbreviations.
        // Note: There are duplicate keys (e.g., several entries for key 3626007); only the last assignment will persist.
        public static class LEVEL_DATA {
            public static final int[] HAS_NO_WATER = {9, 24, 4, 22, 8, 14, 15, 27, 31, 29, 18, 17, 30, 19}; // Currently unused.
            public static final Map<Integer, String[]> LOCATION_MAP = new HashMap<>();
            static {
                LOCATION_MAP.put(0, new String[]{"", ""});
                LOCATION_MAP.put(1, new String[]{"Menu", "Menu"});
                LOCATION_MAP.put(10, new String[]{"Snowman's Land", "SL"});
                LOCATION_MAP.put(11, new String[]{"Wet Dry World", "WDW"});
                LOCATION_MAP.put(12, new String[]{"Jolly Roger Bay", "JRB"});
                LOCATION_MAP.put(13, new String[]{"Tiny Huge Island", "THI"});
                LOCATION_MAP.put(14, new String[]{"Tick Tock Clock", "TTC"});
                LOCATION_MAP.put(15, new String[]{"Rainbow Ride", "RR"});
                LOCATION_MAP.put(16, new String[]{"Outside Castle", "Outside"});
                LOCATION_MAP.put(17, new String[]{"Bowser in the Dark World", "BitDW"});
                LOCATION_MAP.put(18, new String[]{"Vanish Cap Under the Moat", "Vanish"});
                LOCATION_MAP.put(19, new String[]{"Bowser in the Fire Sea", "BitFS"});
                LOCATION_MAP.put(20, new String[]{"Secret Aquarium", "SA"});
                LOCATION_MAP.put(22, new String[]{"Lethal Lava Land", "LLL"});
                LOCATION_MAP.put(23, new String[]{"Dire Dire Docks", "DDD"});
                LOCATION_MAP.put(24, new String[]{"Whomp's Fortress", "WF"});
                LOCATION_MAP.put(26, new String[]{"Garden", "Garden"});
                LOCATION_MAP.put(27, new String[]{"Peach's Slide", "PSS"});
                LOCATION_MAP.put(28, new String[]{"Cavern of the Metal Cap", "Metal"});
                LOCATION_MAP.put(29, new String[]{"Tower of the Wing Cap", "Wing"});
                LOCATION_MAP.put(30, new String[]{"Bowser Fight 1", "Bowser1"});
                LOCATION_MAP.put(31, new String[]{"Wing Mario Over the Rainbow", "WMotR"});
                LOCATION_MAP.put(36, new String[]{"Tall Tall Mountain", "TTM"});
                // Duplicate keys commented out; only the last assignment for key 3626007 will be used.
                // LOCATION_MAP.put(3626007, new String[]{"Basement", "B1F"});
                // LOCATION_MAP.put(3626007, new String[]{"Second Floor", "2F"});
                // LOCATION_MAP.put(3626007, new String[]{"Third Floor", "3F"});
                LOCATION_MAP.put(3626007, new String[]{"Bowser in the Sky", "BitS"});
                LOCATION_MAP.put(4, new String[]{"Big Boo's Haunt", "BBH"});
                LOCATION_MAP.put(5, new String[]{"Cool Cool Mountain", "CCM"});
                LOCATION_MAP.put(6, new String[]{"Castle", "Castle"});
                LOCATION_MAP.put(7, new String[]{"Hazy Maze Cave", "HMC"});
                LOCATION_MAP.put(8, new String[]{"Shifting Sand Land", "SSL"});
                LOCATION_MAP.put(9, new String[]{"Bob-Omb Battlefield", "BoB"});
            }
        }
        
        // Music data mapping song IDs to a pair: game title and track name.
        public static class MUSIC_DATA {
            public static final Map<Integer, String[]> SONG_MAP = new HashMap<>();
            static {
                // The following song_map entries are commented out:
                // SONG_MAP.put(0, new String[]{ "nothing", "nothing" });
                // SONG_MAP.put(1, new String[]{ "Super Mario 64", "Collect a Star" });
                // SONG_MAP.put(2, new String[]{ "Super Mario 64", "Course Select" });
                // SONG_MAP.put(3, new String[]{ "Super Mario 64", "Koopa Message" });
                // SONG_MAP.put(4, new String[]{ "Super Mario 64", "Credits" });
                // SONG_MAP.put(5, new String[]{ "Super Mario 64", "Puzzle Solved" });
                // SONG_MAP.put(6, new String[]{ "Super Mario 64", "Toad Message" });
                // SONG_MAP.put(7, new String[]{ "Super Mario 64", "Victory Theme" });
                // SONG_MAP.put(8, new String[]{ "Super Mario 64", "Ending" });
                // SONG_MAP.put(9, new String[]{ "Super Mario 64", "Key Collection" });
                SONG_MAP.put(12, new String[]{"Super Mario 64", "Endless Stairs"});
                SONG_MAP.put(13, new String[]{"Super Mario 64", "Merry Go Round"});
                SONG_MAP.put(14, new String[]{"Super Mario 64", "Title Screen"});
                SONG_MAP.put(15, new String[]{"Super Mario 64", "Bob-omb Battlefield"});
                SONG_MAP.put(16, new String[]{"Super Mario 64", "Inside Castle"});
                SONG_MAP.put(17, new String[]{"Super Mario 64", "Dire Dire Docks"});
                SONG_MAP.put(18, new String[]{"Super Mario 64", "Lethal Lava Land"});
                SONG_MAP.put(19, new String[]{"Super Mario 64", "Title"});
                SONG_MAP.put(20, new String[]{"Super Mario 64", "Snowman's Land"});
                SONG_MAP.put(21, new String[]{"Super Mario 64", "Cool Cool Mountain Slide"});
                SONG_MAP.put(22, new String[]{"Super Mario 64", "Big Boo's Haunt"});
                SONG_MAP.put(23, new String[]{"Super Mario 64", "Piranha Plant Lullaby"});
                SONG_MAP.put(24, new String[]{"Super Mario 64", "Hazy Maze Cave"});
                SONG_MAP.put(25, new String[]{"Super Mario 64", "Power-up"});
                SONG_MAP.put(26, new String[]{"Super Mario 64", "Metal Cap"});
                SONG_MAP.put(27, new String[]{"Super Mario 64", "Koopa Road"});
                SONG_MAP.put(28, new String[]{"Super Mario 64", "Race"});
                SONG_MAP.put(29, new String[]{"Super Mario 64", "Boss Battle"});
                SONG_MAP.put(30, new String[]{"Super Mario 64", "Bowser Battle"});
                SONG_MAP.put(31, new String[]{"Super Mario 64", "File Select"});
                SONG_MAP.put(32, new String[]{"Super Mario 64", "Shell Power-up"});
                SONG_MAP.put(33, new String[]{"Super Mario 64", "Start Menu"});
                SONG_MAP.put(34, new String[]{"Bomberman 64", "Green Garden"});
                SONG_MAP.put(35, new String[]{"Bomberman 64", "Blue Resort"});
                SONG_MAP.put(36, new String[]{"Bomberman Hero", "Redial"});
                SONG_MAP.put(37, new String[]{"Wii", "Shop Channel"});
                SONG_MAP.put(38, new String[]{"Chrono Trigger", "Spekkio's Theme"});
                SONG_MAP.put(39, new String[]{"Castlevania: Order of Ecclesia", "A Prologue"});
                SONG_MAP.put(40, new String[]{"Diddy Kong Racing", "Credits (Port)"});
                SONG_MAP.put(41, new String[]{"Diddy Kong Racing", "Frosty Village"});
                SONG_MAP.put(42, new String[]{"Diddy Kong Racing", "Spacedust Alley"});
                SONG_MAP.put(43, new String[]{"Donkey Kong Country", "Aquatic Ambience"});
                SONG_MAP.put(44, new String[]{"Donkey Kong Country 2", "Forest Interlude"});
                SONG_MAP.put(45, new String[]{"Donkey Kong Country 2", "Stickerbrush Symphony"});
                SONG_MAP.put(46, new String[]{"Diddy Kong Racing", "Greenwood Village"});
                SONG_MAP.put(47, new String[]{"Donkey Kong Country 2", "In a Snow-Bound Land"});
                SONG_MAP.put(48, new String[]{"EarthBound", "Home Sweet Home"});
                SONG_MAP.put(49, new String[]{"EarthBound", "Onett Theme"});
                SONG_MAP.put(50, new String[]{"The Legend of Zelda: Ocarina of Time", "Gerudo Valley"});
                SONG_MAP.put(51, new String[]{"Super Mario 64", "Hard Puzzle"});
                SONG_MAP.put(52, new String[]{"Super Mario 64", "Inside Castle Walls (Remix)"});
                SONG_MAP.put(53, new String[]{"Kirby: Nightmare in Dream Land", "Butter Building"});
                SONG_MAP.put(54, new String[]{"Kirby 64: The_Crystal Shards", "Shiver Star"});
                SONG_MAP.put(55, new String[]{"Kirby's Adventure", "Yogurt Yard"});
                SONG_MAP.put(56, new String[]{"Kirby Super Star", "Mine Cart"});
                SONG_MAP.put(57, new String[]{"The Legend of Zelda: Majora's Mask", "Clock Town Day 1"});
                SONG_MAP.put(58, new String[]{"Mario & Luigi: Partners in Time", "Thwomp Caverns"});
                SONG_MAP.put(59, new String[]{"Mario Kart 8", "Rainbow Road"});
                SONG_MAP.put(60, new String[]{"Mario Kart 64", "Koopa Beach"});
                SONG_MAP.put(61, new String[]{"Mario Kart Wii", "Maple Treeway"});
                SONG_MAP.put(62, new String[]{"Mega Man 3", "Spark Man Stage"});
                SONG_MAP.put(63, new String[]{"Mega Man Battle Network 5", "Hero Theme"});
                SONG_MAP.put(64, new String[]{"Mario Kart 64", "Moo Moo Farm"});
                SONG_MAP.put(65, new String[]{"New Super Mario Bros.", "Athletic Theme"});
                SONG_MAP.put(66, new String[]{"New Super Mario Bros.", "Desert Theme"});
                SONG_MAP.put(67, new String[]{"New Super Mario Bros. U", "Overworld"});
                SONG_MAP.put(68, new String[]{"New Super Mario Bros. Wii", "Forest"});
                SONG_MAP.put(69, new String[]{"The Legend of Zelda: Ocarina of Time", "Lost Woods"});
                SONG_MAP.put(70, new String[]{"Pilotwings", "Light Plane"});
                SONG_MAP.put(71, new String[]{"Pokémon Diamond & Pearl", "Eterna Forest"});
                SONG_MAP.put(72, new String[]{"Pokémon HeartGold & SoulSilver", "Lavender Town"});
                SONG_MAP.put(73, new String[]{"Super Mario 64", "Rainbow Castle"});
                SONG_MAP.put(74, new String[]{"Bomberman 64", "Red Mountain"});
                SONG_MAP.put(75, new String[]{"Deltarune", "Rude Buster"});
                SONG_MAP.put(76, new String[]{"Super Mario 3D World", "Overworld"});
                SONG_MAP.put(77, new String[]{"Super Mario Sunshine", "No-Pack/Puzzle Level"});
                SONG_MAP.put(78, new String[]{"Snowboard Kids", "Big Snowman"});
                SONG_MAP.put(79, new String[]{"Sonic Adventure", "Emerald Coast"});
                SONG_MAP.put(80, new String[]{"Sonic the Hedgehog", "Green Hill Zone"});
                SONG_MAP.put(81, new String[]{"Super Castlevania IV", "Underwater City"});
                SONG_MAP.put(82, new String[]{"Super Mario Land", "Birabuto Kingdom"});
                SONG_MAP.put(83, new String[]{"Super Mario RPG", "Inside the Forest Maze"});
                SONG_MAP.put(84, new String[]{"Super Mario Sunshine", "Delfino Plaza"});
                SONG_MAP.put(85, new String[]{"Super Mario Sunshine", "Gelato Beach"});
                SONG_MAP.put(86, new String[]{"Yoshi's Island (SNES)", "Caves"});
                SONG_MAP.put(87, new String[]{"The Legend of Zelda: Ocarina of Time", "Water Temple"});
                SONG_MAP.put(88, new String[]{"Wave Race 64", "Sunny Beach"});
                SONG_MAP.put(89, new String[]{"Final Fantasy VII", "WFH"});
                SONG_MAP.put(90, new String[]{"The Legend of Zelda: Ocarina of Time", "Kokiri Forest"});
                SONG_MAP.put(91, new String[]{"The Legend of Zelda: Ocarina of Time", "Zora's Domain"});
                SONG_MAP.put(92, new String[]{"The Legend of Zelda: Ocarina of Time", "Kakariko Village"});
                SONG_MAP.put(93, new String[]{"???", "A Morning Jog"});
                SONG_MAP.put(94, new String[]{"The Legend of Zelda: The Wind Waker", "Outset Island"});
                SONG_MAP.put(95, new String[]{"Super Paper Mario", "Flipside"});
                SONG_MAP.put(96, new String[]{"Super Mario Galaxy", "Ghostly Galaxy"});
                SONG_MAP.put(97, new String[]{"Super Mario RPG", "Nimbus Land"});
                SONG_MAP.put(98, new String[]{"Super Mario Galaxy", "Battlerock Galaxy"});
                SONG_MAP.put(99, new String[]{"Sonic Adventure", "Windy Hill"});
                SONG_MAP.put(100, new String[]{"Super Paper Mario", "The Overthere Stair"});
                SONG_MAP.put(101, new String[]{"Super Mario Sunshine", "Secret Course"});
                SONG_MAP.put(102, new String[]{"Super Mario Sunshine", "Bianco Hills"});
                SONG_MAP.put(103, new String[]{"Super Paper Mario", "Lineland Road"});
                SONG_MAP.put(104, new String[]{"Paper Mario: The Thousand-Year Door", "X-Naut Fortress"});
                SONG_MAP.put(105, new String[]{"Mario & Luigi: Bowser's Inside Story", "Bumpsy Plains"});
                SONG_MAP.put(106, new String[]{"Super Mario World", "Athletic Theme"});
                SONG_MAP.put(107, new String[]{"The Legend of Zelda: Skyward Sword", "Skyloft"});
                SONG_MAP.put(108, new String[]{"Super Mario World", "Castle"});
                SONG_MAP.put(109, new String[]{"Super Mario Galaxy", "Comet Observatory"});
                SONG_MAP.put(110, new String[]{"Banjo-Kazooie", "Freezeezy Peak"});
                SONG_MAP.put(111, new String[]{"Mario Kart DS", "Waluigi Pinball"});
                SONG_MAP.put(112, new String[]{"Kirby 64: The Crystal Shards", "Factory Inspection"});
                SONG_MAP.put(113, new String[]{"Donkey Kong 64", "Creepy Castle"});
                SONG_MAP.put(114, new String[]{"Paper Mario", "Forever Forest"});
                SONG_MAP.put(115, new String[]{"Super Mario Bros.", "Bowser Theme (Remix)"});
                SONG_MAP.put(116, new String[]{"The Legend of Zelda: Twilight Princess", "Gerudo Desert"});
                SONG_MAP.put(117, new String[]{"Yoshi's Island", "Overworld"});
                SONG_MAP.put(118, new String[]{"Mario & Luigi: Partners in Time", "Gritzy Desert"});
                SONG_MAP.put(119, new String[]{"Donkey Kong 64", "Angry Aztec"});
                SONG_MAP.put(120, new String[]{"Mario & Luigi: Partners in Time", "Yoshi's Village"});
                SONG_MAP.put(121, new String[]{"Touhou", "Youkai Mountain"});
                SONG_MAP.put(122, new String[]{"Mario & Luigi: Bowser's Inside Story", "Deep Castle"});
                SONG_MAP.put(123, new String[]{"Paper Mario: The Thousand-Year Door", "Petal Meadows"});
                SONG_MAP.put(124, new String[]{"Mario Party", "Yoshi's Tropical Island"});
                SONG_MAP.put(125, new String[]{"Super Mario 3D World", "Piranha Creek"});
                SONG_MAP.put(126, new String[]{"Final Fantasy VII", "Temple of the Ancients"});
                SONG_MAP.put(127, new String[]{"Paper Mario", "Dry Dry Desert"});
                SONG_MAP.put(128, new String[]{"Rayman", "Band Land"});
                SONG_MAP.put(129, new String[]{"Donkey Kong 64", "Hideout Helm"});
                SONG_MAP.put(130, new String[]{"Donkey Kong 64", "Frantic Factory"});
                SONG_MAP.put(131, new String[]{"Super Paper Mario", "Sammer's Kingdom"});
                SONG_MAP.put(132, new String[]{"Super Mario Galaxy", "Purple Comet"});
                SONG_MAP.put(133, new String[]{"The Legend of Zelda: Majora's Mask", "Stone Tower Temple"});
                SONG_MAP.put(134, new String[]{"Banjo-Kazooie", "Treasure Trove Cove (Port)"});
                SONG_MAP.put(135, new String[]{"Banjo-Kazooie", "Gobi's Valley"});
                SONG_MAP.put(136, new String[]{"Super Mario 64: Last Impact", "Unknown"});
                SONG_MAP.put(137, new String[]{"Donkey Kong 64", "Fungi Forest"});
                SONG_MAP.put(138, new String[]{"Paper Mario: The Thousand-Year Door", "Palace of Shadow"});
                SONG_MAP.put(139, new String[]{"Paper Mario: The Thousand-Year Door", "Rogueport Sewers"});
                SONG_MAP.put(140, new String[]{"Super Mario Galaxy 2", "Honeybloom Galaxy"});
                SONG_MAP.put(141, new String[]{"Pokémon Mystery Dungeon", "Sky Tower"});
                SONG_MAP.put(142, new String[]{"Super Mario Bros. 3", "Overworld"});
                SONG_MAP.put(143, new String[]{"Super Mario RPG", "Mario's Pad"});
                SONG_MAP.put(144, new String[]{"Super Mario RPG", "Sunken Ship"});
                SONG_MAP.put(145, new String[]{"Super Mario Galaxy", "Buoy Base Galaxy"});
                SONG_MAP.put(146, new String[]{"Donkey Kong 64", "Crystal Caves"});
                SONG_MAP.put(147, new String[]{"Super Paper Mario", "Floro Caverns"});
                SONG_MAP.put(148, new String[]{"Ys", "Title Theme"});
                SONG_MAP.put(149, new String[]{"The Legend of Zelda: Twilight Princess", "Lake Hylia"});
                SONG_MAP.put(150, new String[]{"Mario Kart 64", "Frappe Snowland"});
                SONG_MAP.put(151, new String[]{"Donkey Kong 64", "Gloomy Galleon"});
                SONG_MAP.put(152, new String[]{"Mario Kart 64", "Bowser's Castle"});
                SONG_MAP.put(153, new String[]{"Mario Kart 64", "Rainbow Road"});
                SONG_MAP.put(154, new String[]{"Donkey Kong Country 2", "Rigging Jib-Jig"});
                SONG_MAP.put(155, new String[]{"Donkey Kong Country 2", "Crocodile Isle"});
                SONG_MAP.put(156, new String[]{"The Legend of Zelda: The Wind Waker", "Dragon Roost Island"});
                SONG_MAP.put(157, new String[]{"Pokémon Black & White", "Accumula Town"});
                SONG_MAP.put(158, new String[]{"Pokémon HeartGold & SoulSilver", "Vermilion City"});
                SONG_MAP.put(159, new String[]{"Undertale", "Snowdin Town"});
                SONG_MAP.put(160, new String[]{"Undertale", "Bonetrousle"});
                SONG_MAP.put(161, new String[]{"Undertale", "Death by Glamour"});
                SONG_MAP.put(162, new String[]{"Undertale", "Home"});
                SONG_MAP.put(163, new String[]{"Undertale", "Ruins"});
                SONG_MAP.put(164, new String[]{"Undertale", "Spider Dance"});
                SONG_MAP.put(165, new String[]{"Undertale", "Waterfall"});
            }
        }
    }
    
    // ----------------------------
    // MEMORY SIMULATION / UTILITY CLASS
    // ----------------------------
    public static class Memory {
        // Sets the memory domain; for simulation purposes, this is a no-op.
        public static void usememorydomain(String domain) {
            // In an emulator environment, this would switch the memory domain.
        }
        
        // Reads a sequence of bytes from memory starting at the given address.
        public static byte[] read_bytes_as_array(int address, int count) {
            // Dummy implementation: return an array of zero bytes.
            byte[] arr = new byte[count];
            Arrays.fill(arr, (byte)0);
            return arr;
        }
        
        // Reads a float (4 bytes) from memory at the given address.
        public static float readfloat(int address, boolean bigEndian) {
            // Dummy implementation returns 0.0f.
            return 0.0f;
        }
        
        // Reads a 16-bit unsigned integer from memory at the given address in big-endian format.
        public static int read_u16_be(int address) {
            // Dummy implementation returns 0.
            return 0;
        }
        
        // Reads a 32-bit unsigned integer from memory at the given address in big-endian format.
        public static long read_u32_be(int address) {
            // Dummy implementation returns 0.
            return 0;
        }
    }
    
    // ----------------------------
    // STATE STRUCTURES
    // ----------------------------
    // Define possible run states.
    public static class run_state {
        public static final int INACTIVE = 0; // Run has not started.
        public static final int ACTIVE = 1;   // Run is in progress.
        public static final int PENDING = 2;  // Run has ended; data pending write.
        public static final int COMPLETE = 3; // Run data has been fully processed.
    }
    
    // Input state structure.
    public static class InputState {
        public boolean music_toggle_pressed = false; // Flag to track toggling of song title display.
        
        public InputState() {}
        
        public InputState(InputState other) {
            this.music_toggle_pressed = other.music_toggle_pressed;
        }
    }
    
    // Mario state structure.
    public static class MarioState {
        public long action; // Using long to hold unsigned 32-bit.
        public long flags;  // Using long to hold unsigned 32-bit.
        public int hp;      // 16-bit value.
        public int input;   // Duplicate read; ensure the correct width.
        
        public MarioState() {}
        
        public MarioState(MarioState other) {
            this.action = other.action;
            this.flags = other.flags;
            this.hp = other.hp;
            this.input = other.input;
        }
    }
    
    // Run state structure.
    public static class RunState {
        public int status = run_state.INACTIVE; // Current run state.
        public int stars = 0; // Total stars collected during the run.
        public Map<Integer, Integer> warp_map = new HashMap<>(); // Map of intended warp destinations to actual warp outcomes.
        public Map<Integer, Integer> star_map = new HashMap<>(); // Mapping of levels to star counts collected.
        public int start_time = (int)(System.currentTimeMillis() / 1000); // Timestamp for when the run started.
        public int last_updated_time = (int)(System.currentTimeMillis() / 1000); // Last time the state was updated.
        public int end_time = (int)(System.currentTimeMillis() / 1000); // Timestamp for when the run ended (initially same as start).
        public long seed; // Seed read from memory.
        
        public RunState() {}
        
        public RunState(RunState other) {
            this.status = other.status;
            this.stars = other.stars;
            this.warp_map = new HashMap<>(other.warp_map);
            this.star_map = new HashMap<>(other.star_map);
            this.start_time = other.start_time;
            this.last_updated_time = other.last_updated_time;
            this.end_time = other.end_time;
            this.seed = other.seed;
        }
    }
    
    // Game state structure.
    public static class GameState {
        public int delayed_warp_op; // delayed warp op code from memory.
        public long intended_level_id; // Intended level after a warp.
        public int level_id = 1; // Current level ID; default value.
        public int song; // Current song ID.
        
        public GameState() {}
        
        public GameState(GameState other) {
            this.delayed_warp_op = other.delayed_warp_op;
            this.intended_level_id = other.intended_level_id;
            this.level_id = other.level_id;
            this.song = other.song;
        }
    }
    
    // Main state table that stores runtime data for input, Mario, run metrics, and game info.
    public static class State {
        public InputState input = new InputState();
        public MarioState mario = new MarioState();
        public RunState run = new RunState();
        public GameState game = new GameState();
        public int last_updated_time = (int)(System.currentTimeMillis() / 1000);
        
        public State() {}
        
        // Copy constructor for deep copy.
        public State(State other) {
            this.input = new InputState(other.input);
            this.mario = new MarioState(other.mario);
            this.run = new RunState(other.run);
            this.game = new GameState(other.game);
            this.last_updated_time = other.last_updated_time;
        }
    }
    
    // Global state variables.
    public static State state = new State();
    public static State last_state = new State();
    
    // Background images.
    public static final String[] BACKGROUND_IMAGES = {"(None)", "Cave", "City", "Desert", "Fire", "Forest", "Mountains", "Ocean", "Pattern", "Sky",
                           "Storm"};
    
    // Placeholder for the configuration form.
    public static Object config_form = null;
    
    // ----------------------------
    // UTILITY FUNCTIONS
    // ----------------------------
    
    // Initialize the attempt data file if it doesn't exist by writing a CSV header.
    public static void init_attempt_data_file() {
        File file = new File(Config.FILES.ATTEMPT_DATA);
        if (file.exists()) {
            // File exists, so do nothing.
            return;
        }
        
        BufferedWriter writer = null;
        try {
            writer = new BufferedWriter(new FileWriter(file));
            writer.write("AttemptNumber,SeedKey,TimeStamp,Stars,TimeTaken,EndLevel,EndCause,StarsCollected\n");
        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (writer != null) {
                try { writer.close(); } catch (IOException e) { e.printStackTrace(); }
            }
        }
    }
    
    // Read the attempt count from file; if file is missing or empty, default to 0.
    public static void read_attempts_file() {
        File file = new File(Config.FILES.ATTEMPT_COUNT);
        if (file.exists()) {
            BufferedReader reader = null;
            try {
                reader = new BufferedReader(new FileReader(file));
                String content = reader.readLine();
                if (content != null && !content.trim().isEmpty()) {
                    Config.USER.ATTEMPTS = Integer.parseInt(content.trim());
                } else {
                    Config.USER.ATTEMPTS = 0;
                }
            } catch (IOException | NumberFormatException e) {
                Config.USER.ATTEMPTS = 0;
            } finally {
                if (reader != null) {
                    try { reader.close(); } catch (IOException e) { e.printStackTrace(); }
                }
            }
        } else {
            Config.USER.ATTEMPTS = 0;
        }
    }
    
    // Read the personal best stars count from file.
    public static void read_pb_stars_file() {
        File file = new File(Config.FILES.PB_COUNT);
        if (file.exists()) {
            BufferedReader reader = null;
            try {
                reader = new BufferedReader(new FileReader(file));
                String content = reader.readLine();
                if (content != null && !content.trim().isEmpty()) {
                    Config.USER.PB_STARS = Integer.parseInt(content.trim());
                } else {
                    Config.USER.PB_STARS = 0;
                }
            } catch (IOException | NumberFormatException e) {
                Config.USER.PB_STARS = 0;
            } finally {
                if (reader != null) {
                    try { reader.close(); } catch (IOException e) { e.printStackTrace(); }
                }
            }
        } else {
            Config.USER.PB_STARS = 0;
        }
    }
    
    // Write the current attempt count to its file.
    public static void write_attempts_file() {
        BufferedWriter writer = null;
        try {
            writer = new BufferedWriter(new FileWriter(Config.FILES.ATTEMPT_COUNT));
            writer.write(String.valueOf(Config.USER.ATTEMPTS));
        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (writer != null) {
                try { writer.close(); } catch (IOException e) { e.printStackTrace(); }
            }
        }
    }
    
    // Write the personal best stars count to file.
    public static void write_pb_stars_file() {
        BufferedWriter writer = null;
        try {
            writer = new BufferedWriter(new FileWriter(Config.FILES.PB_COUNT));
            writer.write(String.valueOf(Config.USER.PB_STARS));
        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (writer != null) {
                try { writer.close(); } catch (IOException e) { e.printStackTrace(); }
            }
        }
    }
    
    // Retrieve the full song name based on the song ID.
    public static String get_song_name(int song_id) {
        String[] song_info = Config.MUSIC_DATA.SONG_MAP.get(song_id);
        if (song_info != null) {
            return song_info[0] + " - " + song_info[1];
        }
        return "Unknown";
    }
    
    // Utility function to read three consecutive floats from a given memory address.
    public static float[] read3float(int base) {
        float[] arr = new float[3];
        for (int i = 0; i < 3; i++) {
            arr[i] = Memory.readfloat(base + 4 * i, true);
        }
        return arr;
    }
    
    // Get the full level name based on the level ID using LOCATION_MAP.
    public static String get_level_name(int level_id) {
        if (Config.LEVEL_DATA.LOCATION_MAP.containsKey(level_id)) {
            return Config.LEVEL_DATA.LOCATION_MAP.get(level_id)[0];
        } else {
            return "Unknown";
        }
    }
    
    // Get the abbreviated level name based on the level ID.
    public static String get_level_abbr(int level_id) {
        if (Config.LEVEL_DATA.LOCATION_MAP.containsKey(level_id)) {
            return Config.LEVEL_DATA.LOCATION_MAP.get(level_id)[1];
        } else {
            return "Unknown";
        }
    }
    
    // Update the game state by reading from memory and updating our state tables.
    public static void update_game_state() {
        // Store the previous state for later comparison.
        last_state = new State(state); // deep copy using copy constructor.
        
        state.last_updated_time = (int)(System.currentTimeMillis() / 1000); // Update the timestamp.
        state.game.delayed_warp_op = Memory.read_u16_be(Config.MEM.DELAYED_WARP_OP);
        state.game.intended_level_id = Memory.read_u32_be(Config.MEM.INTENDED_LEVEL_ID);
        state.game.level_id = Memory.read_u16_be(Config.MEM.CURRENT_LEVEL_ID);
        state.game.song = Memory.read_u16_be(Config.MEM.CURRENT_SONG_ID);
        state.mario.action = Memory.read_u32_be(Config.MEM.MARIO.ACTION);
        state.mario.flags = Memory.read_u32_be(Config.MEM.MARIO.INPUT); // Read flags from the same address.
        state.mario.hp = Memory.read_u16_be(Config.MEM.HUD.HEALTH);
        state.mario.input = Memory.read_u16_be(Config.MEM.MARIO.INPUT); // Duplicate read; ensure the correct width.
        state.run.seed = Memory.read_u32_be(Config.MEM.CURRENT_SEED);
        // The next line is truncated in the original Lua source:
        // state.run.stars = memory.read_u16_be(C
        // We preserve the truncated line as a comment.
        // state.run.stars = Memory.read_u16_be(C...
    }
    
    // Main method for demonstration purposes.
    public static void main(String[] args) {
        // Set the memory domain to "ROM"
        Memory.usememorydomain("ROM");
        
        // Read the ROM signature.
        byte[] rom_signature_bytes = Memory.read_bytes_as_array(0x20, 12); // Read 12 bytes from ROM.
        StringBuilder romSignatureBuilder = new StringBuilder();
        for (byte b : rom_signature_bytes) {
            romSignatureBuilder.append((char) b);
        }
        String rom_signature = romSignatureBuilder.toString(); // Convert bytes to string.
        
        Boolean VALID_ROM_VERSION;
        if (rom_signature.equals("IronMario 64")) {
            VALID_ROM_VERSION = true;
        } else {
            VALID_ROM_VERSION = false;
        }
        
        // Initialize attempt data file.
        init_attempt_data_file();
        
        // Further code would continue here...
        
        // For demonstration, update game state.
        update_game_state();
        
        // Display some values.
        System.out.println("ROM valid: " + VALID_ROM_VERSION);
        System.out.println("Current level: " + get_level_name(state.game.level_id));
        System.out.println("Song: " + get_song_name(state.game.song));
    }
}
 
// ----------------------------
// TABLEX UTILITY (for deep copy)
// ----------------------------
class Tablex {
    // In this translation, deep copy for the state is performed by copy constructors.
    // Additional deep copy methods can be defined here if needed.
}
 
