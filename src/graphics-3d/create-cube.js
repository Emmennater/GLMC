const TXMIN = 0.001,
  TXMAX = 0.999;
const CUBE_VERTICES = [ // X, Y, Z           U, V
  // Top
  -1.0, 1.0, -1.0, TXMIN, TXMIN,
  -1.0, 1.0, 1.0, TXMIN, TXMAX,
  1.0, 1.0, 1.0, TXMAX, TXMAX,
  1.0, 1.0, -1.0, TXMAX, TXMIN,

  // Left
  -1.0, 1.0, 1.0, TXMAX, TXMIN,
  -1.0, -1.0, 1.0, TXMAX, TXMAX,
  -1.0, -1.0, -1.0, TXMIN, TXMAX,
  -1.0, 1.0, -1.0, TXMIN, TXMIN,

  // Right
  1.0, 1.0, 1.0, TXMIN, TXMIN,
  1.0, -1.0, 1.0, TXMIN, TXMAX,
  1.0, -1.0, -1.0, TXMAX, TXMAX,
  1.0, 1.0, -1.0, TXMAX, TXMIN,

  // Front
  1.0, 1.0, 1.0, TXMAX, TXMIN,
  1.0, -1.0, 1.0, TXMAX, TXMAX,
  -1.0, -1.0, 1.0, TXMIN, TXMAX,
  -1.0, 1.0, 1.0, TXMIN, TXMIN,

  // Back
  1.0, 1.0, -1.0, TXMIN, TXMIN,
  1.0, -1.0, -1.0, TXMIN, TXMAX,
  -1.0, -1.0, -1.0, TXMAX, TXMAX,
  -1.0, 1.0, -1.0, TXMAX, TXMIN,

  // Bottom
  -1.0, -1.0, -1.0, TXMAX, TXMAX,
  -1.0, -1.0, 1.0, TXMAX, TXMIN,
  1.0, -1.0, 1.0, TXMIN, TXMIN,
  1.0, -1.0, -1.0, TXMIN, TXMAX,
];

const CUBE_INDICES = [
  // Top
  0, 1, 2,
  0, 2, 3,

  // Left
  5, 4, 6,
  6, 4, 7,

  // Right
  8, 9, 10,
  8, 10, 11,

  // Front
  13, 12, 14,
  15, 14, 12,

  // Back
  16, 17, 18,
  16, 18, 19,

  // Bottom
  21, 20, 22,
  22, 20, 23
];

checkedBlocks = [];

function createBlock(x, y, z, type = "smooth_stone") {
  let info = {
    type: type,
    x: x,
    y: y,
    z: z
  };
  info.transparent = isTransparent(type);
  info.solid = isSolid(type);
  return info;
}

function getTextureArray(block) {

  // TOP, LEFT, RIGHT, FRONT, BACK, BOTTOM
  switch (block) {
    case "void_block":
      return [0, 12];
    case "heaven_block":
      return [0, 13];
    case "red_glow_block":
      return [0, 16];
    case "orange_glow_block":
      return [1, 16];
    case "yellow_glow_block":
      return [2, 16];
    case "green_glow_block":
      return [3, 16];
    case "light_blue_glow_block":
      return [4, 16];
    case "blue_glow_block":
      return [5, 16];
    case "purple_glow_block":
      return [6, 16];
    case "magenta_glow_block":
      return [7, 16];
    case "pink_glow_block":
      return [8, 16];
    case "white_outline_block":
      return [0, 14];
    case "black_outline_block":
      return [3, 14];
    case "o7q":
      return [2, 14];
    case "o7q2":
      return [3, 13];
    case "white_swirly_block":
      return [4, 14];
    case "black_swirly_block":
      return [5, 14];
    case "white_grid_block":
      return [6, 14];
    case "black_grid_block":
      return [7, 14];
    case "smooth_stone":
      return [18, 59];
    case "tinted_glass":
      return [1, 1];
    case "grass":
      return [0, 0, 12, 52, 12, 52, 12, 52, 12, 52, 2, 0];
    case "dirt":
      return [2, 0];
    case "stone":
      return [23, 77];
    case "bedrock":
      return [320 / 16, 816 / 16];
    case "crafting_table":
      return [2, 64, 1, 64, 1, 64, 0, 64, 0, 64, 22, 77];
    case "bricks":
      return [288 / 16, 928 / 16];
    case "cobblestone":
      return [32 / 16, 832 / 16];
    case "oak_planks":
      return [22, 77];
    case "log":
      return [8, 54, 7, 54, 7, 54, 7, 54, 7, 54, 8, 54];
    case "birch_log":
      return [23, 53, 22, 53, 22, 53, 22, 53, 22, 53, 23, 53];
    case "leaves":
      return [144 / 16, 1136 / 16];
    case "birch_leaves":
      return [3, 71];
    case "glass":
      return [2, 63];
    case "black_concrete":
      return [13, 26];
    case "white_concrete":
      return [16, 416 / 16];
    case "sponge":
      return [0, 1040 / 16];
    case "we_sponge":
      return [112 / 16, 1040 / 16];
    case "obsidian":
      return [112 / 16, 1024 / 16];
    case "coal_block":
      return [4, 928 / 16];
    case "diamond_block":
      return [5, 928 / 16];
    case "emerald_block":
      return [6, 928 / 16];
    case "gold_block":
      return [7, 928 / 16];
    case "iron_block":
      return [8, 928 / 16];
    case "lapis_block":
      return [9, 928 / 16];
    case "redstone_block":
      return [10, 928 / 16];
    case "nether_portal_frame":
      return [320 / 16, 1];
    case "sand": return [5, 53];
    case "red_sand": return [1, 53];
    case "sea_lantern": return [0, 20];
    case "dark_oak_log": return [2, 54, 0, 54, 0, 54, 0, 54, 0, 54, 2, 54];
    case "spruce_log": return [11, 54, 10, 54, 10, 54, 10, 54, 10, 54, 11, 54];
    case "acacia_log": return [20, 53, 19, 53, 19, 53, 19, 53, 19, 53, 20, 53];
    case "netherrack": return [19, 52];
    case "packed_ice": return [21, 52];
    case "bone_block": return [22, 51, 21, 51, 21, 51, 21, 51, 21, 51, 22, 51];
    case "andesite": return [19, 51];
    case "magma_block": return [15, 52];
    case "gravel": return [13, 52];
    case "granite": return [11, 52];
    case "end_stone": return [8, 52];
    case "diorite": return [6, 52];
    case "smooth_sandstone": return [8, 53, 5, 52, 5, 52, 5, 52, 5, 52, 8, 53];
    case "smooth_red_sandstone": return [4, 53, 4, 52, 4, 52, 4, 52, 4, 52, 4, 53];
    case "mossy_cobblestone": return [16, 52];
    case "stone_bricks": return [11, 60];
    case "mossy_stone_bricks": return [10, 60];
    case "end_stone_bricks": return [9, 60];
    case "cracked_stone_bricks": return [7, 60];
    case "chisled_stone_bricks": return [6, 60];
    case "polished_andesite": return [19, 56];
    case "polished_diorite": return [20, 56];
    case "polished_granite": return [21, 56];
    case "white_wool": return [0, 4];
    case "black_wool": return [1, 7];
    case "red_wool": return [1, 8];
    case "green_wool": return [1, 9];
    case "brown_wool": return [1, 10];
    case "blue_wool": return [1, 11];
    case "purple_wool": return [1, 12];
    case "cyan_wool": return [1, 13];
    case "light_grey_wool":
    case "light_gray_wool": return [1, 14];
    case "grey_wool":
    case "gray_wool": return [2, 7];
    case "pink_wool": return [2, 8];
    case "lime_wool": return [2, 9];
    case "yellow_wool": return [2, 10];
    case "light_blue_wool": return [2, 11];
    case "magenta_wool": return [2, 12];
    case "orange_wool": return [2, 13];
    case "redstone_lamp_off": return [22, 75];
    case "redstone_lamp_on": return [21, 74];
    case "jack_o_lantern_lit": return [0, 73, 23, 72, 23, 72, 23, 72, 23, 72, 0, 73];
    case "jack_o_lantern_lit": return [0, 73, 0, 72, 0, 72, 0, 72, 0, 72, 0, 73];
    case "jack_o_lantern": return [0, 73, 11, 72, 11, 72, 11, 72, 11, 72, 0, 73];
    case "copper_block": return [8, 0];
    case "cut_copper_block": return [13, 0];
    case "coal_ore": return [20, 57];
    case "diamond_ore": return [21, 57];
    case "emerald_ore": return [22, 57];
    case "goal_ore": return [23, 57];
    case "iron_ore": return [0, 58];
    case "lapis_ore": return [1, 58];
    case "quartz_ore": return [2, 58];
    case "redstone_ore": return [3, 58];
    case "furnace": return [23, 58, 0, 59, 0, 59, 1, 59, 0, 59, 23, 58];
    case "bookshelf": return [14, 58, 17, 58, 17, 58, 17, 58, 17, 58, 14, 58];
    case "acacia_planks": return [11, 58];
    case "dark_oak_planks": return [12, 58];
    case "jungle_planks": return [13, 58];
    case "birch_planks": return [14, 53];
    case "spruce_planks": return [15, 58];
    case "note_block": return [14, 64];
    case "spruce_leaves": return [11, 71];
    case "jungle_leaves": return [7, 71];
    case "acacia_leaves": return [5, 71];
    case "barrel": return [5, 42, 3, 42, 3, 42, 3, 42, 3, 42, 4, 42];
    case "blast_furnace": return [8, 42, 7, 42, 7, 42, 6, 42, 7, 42, 8, 42];
    case "glowing_obsidian": return [23, 10];
    case "nether_reactor_core": return [22, 10];
    case "quartz_block": return [3, 63];
    case "smooth_quartz_block": return [4, 63];
    case "chisled_quartz_block": return [6, 63, 5, 63, 5, 63, 5, 63, 5, 63, 6, 63];
    case "quartz_pillar": return [9, 63, 7, 63, 7, 63, 7, 63, 7, 63, 9, 63];
    case "quartz_bricks": return [12, 91];
    case "tnt": return [5, 65, 3, 65, 3, 65, 3, 65, 3, 65, 4, 65];
    case "usb_port": return [17, 18, 19, 18, 19, 18, 18, 18, 18, 18, 17, 18];
    case "test":
      return [0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0];
    default:
      return null;
  }

}

function getTexture(block) {
  let arr = getTextureArray(block);
  if (arr == null) {
    console.error(block + " is not a valid type");
    return getTexture("dirt");
  }

  if (arr.length == 2) {
    let txu = arr[0];
    let txv = arr[1];
    for (let i = 2; i < 12; i += 2) {
      arr[i] = txu;
      arr[i + 1] = txv;
    }
  }
  return arr;
}

function getColor(block) {
  let color = [1, 1, 1];

  switch (block) {
    case "birch_leaves":
      color = [0.8, 0.9, 0.8];
      break;
    case "leaves":
      // color = [0.7, 0.7, 0.7];
      // from: (67, 170, 22)
      // to: (66,88,36)
      color = [66 / 67, 88 / 170, 36 / 22];
      break;
    case "dirt":
    case "grass":
      // from: (85,   133,    72)
      // to:   (83,   107,    50)
      // color =  [83/85,107/133,50/72];

      // from: (70,108,59)
      // to: (51,39,23)
      color = [53 / 70, 90 / 108, 37 / 59];
      break;
    case "birch_log":
    case "log":
      // from: (57,46,28)
      // to: (87,72,50)
      color = [0.8, 0.8, 0.8];
  }

  // Color balancing
  color = [
    (color[0] + 1) / 2,
    (color[1] + 1) / 2,
    (color[2] + 1) / 2
  ];

  return color;
}

function getShadow(block) {
  let v = 0.5;
  switch (block) {
    case "void_block":
      return {
        r: 0.5, g: 0.5, b: 0.5
      };
    case "heaven_block":
      return {
        r: 1 + v, g: 1 + v, b: 1 + v
      };
    case "redstone_block":
      return {
        r: 1 + v, g: 1, b: 1
      };

      // Glow blocks
    case "red_glow_block":
      return {
        r: 1 + v, g: 1, b: 1
      };
    case "orange_glow_block":
      return {
        r: 1 + v, g: 1 + v / 2, b: 1
      };
    case "yellow_glow_block":
      return {
        r: 1 + v, g: 1 + v, b: 1
      };
    case "green_glow_block":
      return {
        r: 1, g: 1 + v, b: 1
      };
    case "light_blue_glow_block":
      return {
        r: 1, g: 1 + v, b: 1 + v
      };
    case "blue_glow_block":
      return {
        r: 1, g: 1, b: 1 + v
      };
    case "purple_glow_block":
      return {
        r: 1 + v * 0.5, g: 1, b: 1 + v
      };
    case "magenta_glow_block":
      return {
        r: 1 + v * 0.7, g: 1, b: 1 + v
      };
    case "pink_glow_block":
      return {
        r: 1 + v, g: 1, b: 1 + v
      };

    default:
      return null;
  }
}

function isTransparent(block) {
  switch (block) {
    case "glass":
      return true;
    case "leaves":
      return true;
    case "birch_leaves":
      return true;
    default:
      return false;
  }
}

function isSolid(block) {
  switch (block) {
    case "leaves":
      return false;
    case "birch_leaves":
      return false;
    default:
      return true;
  }
}

function calcShadow(block, x, y, z, side, vt, glow) {

  checkedBlocks = [];

  let shadow = 1;
  let color = {
    r: 1,
    g: 1,
    b: 1
  };
  let count = 0;
  // let amt = 0.75;
  // let diff = 0.4;

  // if (!block.transparent)
  switch (side) {
    // TOP  RED
    case 0:
      // color.g -= diff;
      // color.b -= diff;

      switch (vt) {
        case 0: // - + (0, -) and 0 + -
          count += checkOffset(block, x, y, z, -1, 1, 0);
          count += checkOffset(block, x, y, z, -1, 1, -1);
          count += checkOffset(block, x, y, z, 0, 1, -1);
          count += checkOffset(block, x, y, z, 0, 1, 0);
          break;
        case 1: // - + (0, +) and 0 + +
          count += checkOffset(block, x, y, z, -1, 1, 0);
          count += checkOffset(block, x, y, z, -1, 1, 1);
          count += checkOffset(block, x, y, z, 0, 1, 1);
          count += checkOffset(block, x, y, z, 0, 1, 0);
          break;
        case 2: // + + (0, +) and 0 + +
          count += checkOffset(block, x, y, z, 1, 1, 0);
          count += checkOffset(block, x, y, z, 1, 1, 1);
          count += checkOffset(block, x, y, z, 0, 1, 1);
          count += checkOffset(block, x, y, z, 0, 1, 0);
          break;
        case 3: // + + (0, -) and 0 + -
          count += checkOffset(block, x, y, z, 1, 1, 0);
          count += checkOffset(block, x, y, z, 1, 1, -1);
          count += checkOffset(block, x, y, z, 0, 1, -1);
          count += checkOffset(block, x, y, z, 0, 1, 0);
          break;
      }

      break;
      // LEFT  ORANGE - [- +]
    case 1:
      // color.g -= diff / 2;
      // color.b -= diff;

      switch (vt) {
        case 0: // - + (0, +) and - 0 +
          count += checkOffset(block, x, y, z, -1, 1, 0);
          count += checkOffset(block, x, y, z, -1, 1, 1);
          count += checkOffset(block, x, y, z, -1, 0, 1);
          count += checkOffset(block, x, y, z, -1, 0, 0);
          break;
        case 2: // - - (0, -) and - 0 -
          count += checkOffset(block, x, y, z, -1, -1, 0);
          count += checkOffset(block, x, y, z, -1, -1, -1);
          count += checkOffset(block, x, y, z, -1, 0, -1);
          count += checkOffset(block, x, y, z, -1, 0, 0);
          break;
        case 1: // - - (0, +) and - 0 +
          count += checkOffset(block, x, y, z, -1, -1, 0);
          count += checkOffset(block, x, y, z, -1, -1, 1);
          count += checkOffset(block, x, y, z, -1, 0, 1);
          count += checkOffset(block, x, y, z, -1, 0, 0);
          break;
        case 3: // - + (0, -) and - 0 -
          count += checkOffset(block, x, y, z, -1, 1, 0);
          count += checkOffset(block, x, y, z, -1, 1, -1);
          count += checkOffset(block, x, y, z, -1, 0, -1);
          count += checkOffset(block, x, y, z, -1, 0, 0);
          break;
      }
      break;
      // RIGHT  YELLOW
    case 2:
      // color.b -= diff;

      switch (vt) {
        case 0: // + + (0, +) and + 0 +
          count += checkOffset(block, x, y, z, 1, 1, 0);
          count += checkOffset(block, x, y, z, 1, 1, 1);
          count += checkOffset(block, x, y, z, 1, 0, 1);
          count += checkOffset(block, x, y, z, 1, 0, 0);
          break;
        case 1: // + - (0, +) and + 0 +
          count += checkOffset(block, x, y, z, 1, -1, 0);
          count += checkOffset(block, x, y, z, 1, -1, 1);
          count += checkOffset(block, x, y, z, 1, 0, 1);
          count += checkOffset(block, x, y, z, 1, 0, 0);
          break;
        case 2: // + - (0, -) and + 0 -
          count += checkOffset(block, x, y, z, 1, -1, 0);
          count += checkOffset(block, x, y, z, 1, -1, -1);
          count += checkOffset(block, x, y, z, 1, 0, -1);
          count += checkOffset(block, x, y, z, 1, 0, 0);
          break;
        case 3: // + + (0, -) and + 0 -
          count += checkOffset(block, x, y, z, 1, 1, 0);
          count += checkOffset(block, x, y, z, 1, 1, -1);
          count += checkOffset(block, x, y, z, 1, 0, -1);
          count += checkOffset(block, x, y, z, 1, 0, 0);
          break;
      }

      break;
      // FRONT  GREEN [- +] +
    case 3:
      // color.r -= diff;
      // color.b -= diff;

      switch (vt) {
        case 0: // (0, +) + + and + 0 +
          count += checkOffset(block, x, y, z, 0, 1, 1);
          count += checkOffset(block, x, y, z, 1, 1, 1);
          count += checkOffset(block, x, y, z, 1, 0, 1);
          count += checkOffset(block, x, y, z, 0, 0, 1);
          break;
        case 1: // (0, +) - + and + 0 +
          count += checkOffset(block, x, y, z, 0, -1, 1);
          count += checkOffset(block, x, y, z, 1, -1, 1);
          count += checkOffset(block, x, y, z, 1, 0, 1);
          count += checkOffset(block, x, y, z, 0, 0, 1);
          break;
        case 2: // (0, -) - + and - 0 +
          count += checkOffset(block, x, y, z, 0, -1, 1);
          count += checkOffset(block, x, y, z, -1, -1, 1);
          count += checkOffset(block, x, y, z, -1, 0, 1);
          count += checkOffset(block, x, y, z, 0, 0, 1);
          break;
        case 3: // (0, -) + + and - 0 +
          count += checkOffset(block, x, y, z, 0, 1, 1);
          count += checkOffset(block, x, y, z, -1, 1, 1);
          count += checkOffset(block, x, y, z, -1, 0, 1);
          count += checkOffset(block, x, y, z, 0, 0, 1);
          break;
      }

      break;
      // BACK  BLUE
    case 4:
      // color.r -= diff;
      // color.g -= diff;

      switch (vt) {
        case 0: // (0, +) + - and + 0 -
          count += checkOffset(block, x, y, z, 0, 1, -1);
          count += checkOffset(block, x, y, z, 1, 1, -1);
          count += checkOffset(block, x, y, z, 1, 0, -1);
          count += checkOffset(block, x, y, z, 0, 0, -1);
          break;
        case 1: // (0, +) - - and + 0 -
          count += checkOffset(block, x, y, z, 0, -1, -1);
          count += checkOffset(block, x, y, z, 1, -1, -1);
          count += checkOffset(block, x, y, z, 1, 0, -1);
          count += checkOffset(block, x, y, z, 0, 0, -1);
          break;
        case 2: // (0, -) - - and - 0 -
          count += checkOffset(block, x, y, z, 0, -1, -1);
          count += checkOffset(block, x, y, z, -1, -1, -1);
          count += checkOffset(block, x, y, z, -1, 0, -1);
          count += checkOffset(block, x, y, z, 0, 0, -1);
          break;
        case 3: // (0, -) + - and - 0 -
          count += checkOffset(block, x, y, z, 0, 1, -1);
          count += checkOffset(block, x, y, z, -1, 1, -1);
          count += checkOffset(block, x, y, z, -1, 0, -1);
          count += checkOffset(block, x, y, z, 0, 0, -1);
          break;
      }

      break;
      // BOTTOM  PURPLE
    case 5:
      // color.g -= diff;

      switch (vt) {
        case 0: // - - (0, -) and 0 - -
          count += checkOffset(block, x, y, z, -1, -1, 0);
          count += checkOffset(block, x, y, z, -1, -1, -1);
          count += checkOffset(block, x, y, z, 0, -1, -1);
          count += checkOffset(block, x, y, z, 0, -1, 0);
          break;
        case 1: // - - (0, +) and 0 - +
          count += checkOffset(block, x, y, z, -1, -1, 0);
          count += checkOffset(block, x, y, z, -1, -1, 1);
          count += checkOffset(block, x, y, z, 0, -1, 1);
          count += checkOffset(block, x, y, z, 0, -1, 0);
          break;
        case 2: // + - (0, +) and 0 - +
          count += checkOffset(block, x, y, z, 1, -1, 0);
          count += checkOffset(block, x, y, z, 1, -1, 1);
          count += checkOffset(block, x, y, z, 0, -1, 1);
          count += checkOffset(block, x, y, z, 0, -1, 0);
          break;
        case 3: // + - (0, -) and 0 - -
          count += checkOffset(block, x, y, z, 1, -1, 0);
          count += checkOffset(block, x, y, z, 1, -1, -1);
          count += checkOffset(block, x, y, z, 0, -1, -1);
          count += checkOffset(block, x, y, z, 0, -1, 0);
          break;
      }

      break;
  }

  // if (vt == 0) shadow -= amt/4*4;
  // if (vt == 1) shadow -= amt/4*2;
  // if (vt == 2) shadow -= amt/4*3;
  // if (vt == 3) shadow -= amt/4*1;
  
  // Color balancing
  shadow -= count / 5 / 2;

  shadow = constrain(shadow, 0, 1);
  // if (count < 0) shadow = 2;

  let col = {
    r: color.r * shadow,
    g: color.g * shadow,
    b: color.b * shadow
  };

  // Apply glow
  for (let i = 0; i < checkedBlocks.length; i++) {
    let glow = getShadow(checkedBlocks[i].type);
    if (glow == null) continue;
    col.r *= glow.r;
    col.g *= glow.g;
    col.b *= glow.b;
  }

  if (glow != null) {
    col.r = (col.r + glow.r) / 2;
    col.g = (col.g + glow.g) / 2;
    col.b = (col.b + glow.b) / 2;
  }

  return col;
}

function checkOffset(b1, x, y, z, xo, yo, zo) {
  let block = getBlock(x + xo, y + yo, z + zo);
  if (block == null) return 0;
  checkedBlocks.push(block);
  if (!block.transparent || (!block.solid && block.transparent)) {
    return 1;
  } else {
    return 0.5;
  }
  // return 1;
}

/*























*/