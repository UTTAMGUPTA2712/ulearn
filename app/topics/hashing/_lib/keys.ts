/**
 * Short, readable keys for the simulation — words a reader can recognize at
 * a glance in an 8-character chip. Every key is unique across both lists, so
 * the table never has to handle "insert a key that's already there".
 */

/** A spread of first letters and lengths — what "ordinary" data looks like. */
const GENERAL_KEYS = [
  "apple", "banana", "cherry", "grape", "lemon", "mango", "peach", "pear", "plum", "kiwi",
  "lime", "olive", "fig", "date", "guava", "papaya", "quince", "tiger", "zebra", "panda",
  "koala", "otter", "eagle", "falcon", "hawk", "heron", "raven", "robin", "wolf", "fox",
  "bear", "lynx", "bison", "llama", "horse", "yak", "gecko", "iguana", "newt", "oslo",
  "paris", "rome", "tokyo", "lima", "cairo", "delhi", "dubai", "berlin", "vienna", "quito",
  "kyoto", "nairobi", "hanoi", "amber", "azure", "ivory", "jade", "ruby", "onyx", "pearl",
  "topaz", "opal", "river", "ocean", "forest", "valley", "desert", "island", "glacier", "tundra",
  "violin", "piano", "drum", "flute", "guitar", "harp", "banjo", "oboe", "nova", "orbit",
  "pixel", "vector", "kernel", "packet", "token", "queue", "ember", "frost", "blaze", "breeze",
  "alice", "bob", "dave", "erin", "frank", "grace", "heidi", "ivan", "judy", "oscar",
  "peggy", "rupert", "trent", "victor", "walter", "yuki", "zara", "uma", "xena", "nina",
  "leo", "kai", "hugo", "iris", "juno", "ophelia", "quinn", "ursula", "wendy", "yara",
];

/**
 * Keys that all start with s, c or m. Under the "first letter" hash every
 * key here lands in one of at most three buckets whatever m is — and for
 * m = 8 or 16, 's' (115) and 'c' (99) even share one — so "Plug in a bad
 * hash" draws from here to make a single chain explode.
 */
export const CROWDED_KEYS = [
  "salt", "sand", "sage", "seal", "shark", "snake", "snow", "sun", "star", "stone",
  "silk", "silver", "sparrow", "spoon", "spice", "swan", "sky", "soup", "sofa", "sock",
  "candle", "canoe", "carrot", "castle", "cedar", "chalk", "chess", "cloud", "clover", "cobra",
  "cocoa", "copper", "crane", "crow", "cup", "comet", "cache", "coral", "cello", "camel",
  "maple", "marble", "meteor", "mint", "mirror", "mole", "moon", "moss", "mouse", "mud",
  "muffin", "mule", "melon", "moose", "meadow",
];

export const ALL_KEYS = [...GENERAL_KEYS, ...CROWDED_KEYS];
