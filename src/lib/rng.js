// Generador pseudoaleatorio con semilla fija: los datos ficticios salen siempre iguales.
export function createRng(seed = 20261021) {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    weighted(arr, weightOf) {
      const total = arr.reduce((s, x) => s + weightOf(x), 0)
      let r = next() * total
      for (const x of arr) {
        r -= weightOf(x)
        if (r <= 0) return x
      }
      return arr[arr.length - 1]
    },
    normal(mean, sd) {
      const u = 1 - next()
      const v = next()
      return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
    },
  }
}
