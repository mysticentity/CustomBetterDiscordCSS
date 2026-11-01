import { getModules } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { instead } from '@valenced/patcher'


const roots = new Set<any>()
const byValue = new Map<string, Set<string>>()  // real resolved value -> tokens
const byPaint = new Map<string, string>()       // painted hex -> token (PAINT mode)
const rawByValue = new Map<string, Set<string>>()

const COLOR_KEY = /colou?r$/i

function installFiberHook() {
    const g = globalThis as any
    const prior = g.__REACT_DEVTOOLS_GLOBAL_HOOK__
    if (prior) {
        const orig = prior.onCommitFiberRoot
        prior.onCommitFiberRoot = function (id: any, root: any, ...rest: any[]) {
            roots.add(root)
            return orig?.call(this, id, root, ...rest)
        }
        return () => { prior.onCommitFiberRoot = orig }
    }
    let rid = 0
    g.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
        supportsFiber: true, isDisabled: false, renderers: new Map(),
        inject(r: any) { const id = ++rid; this.renderers.set(id, r); return id },
        onCommitFiberRoot(_id: any, root: any) { roots.add(root) },
        onCommitFiberUnmount() {}, onPostCommitFiberRoot() {}, checkDCE() {},
    }
    return () => { delete g.__REACT_DEVTOOLS_GLOBAL_HOOK__ }
}

function flatStyle(s: any, out: Record<string, any> = {}) {
    if (Array.isArray(s)) s.forEach(x => flatStyle(x, out))
    else if (s && typeof s === 'object') Object.assign(out, s)
    return out
}

function lookup(c: unknown): string | undefined {
    if (typeof c !== 'string') return
    const k = c.toLowerCase()
    const p = byPaint.get(k)
    if (p) return p
    const t = byValue.get(k)
    if (t) return [...t].slice(0, 6).join(' | ') + (t.size > 1 ? '  (ambiguous)' : '')
    const r = rawByValue.get(k)
    if (r) return 'raw:' + [...r].slice(0, 4).join(' | ')
}

function chainOf(f: any, n = 5) {
    const out: string[] = []
    for (let p = f.return; p && out.length < n; p = p.return) {
        const t = p.type
        const nm = typeof t === 'function' ? (t.displayName || t.name)
            : t?.displayName || t?.render?.displayName || t?.render?.name || t?.type?.name
        if (nm) out.unshift(nm)
    }
    return out.join(' > ')
}
const PAINT = false     // true: return a unique color per semantic token (reload to apply)
const TRACK_RAW = true  // log RawColor reads and which semantic token caused them

interface Hit { seq: number; token: string; theme: string; value: string; painted?: string; stack?: string }
const hits: Hit[] = []
const rawReads = new Map<string, number>()
const watched = new Set<string>()
const names = new Map<unknown, string>() // token object -> name
let seq = 0
let current: string | null = null
let L: { log(...a: any[]): void } | undefined

const label = (x: any) => (typeof x === 'string' ? x : x?.name ?? x?.key ?? typeof x)
const nameOf = (c: any): string =>
    names.get(c) ?? (typeof c === 'string' ? c : c?.name ?? c?.token ?? '(unknown token)')

function paint(name: string): string {
    let h = 0
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
    const hue = h % 360, s = 0.85, l = 0.4 + ((h >>> 9) % 30) / 100
    const f = (n: number) => {
        const k = (n + hue / 30) % 12
        const a = s * Math.min(l, 1 - l)
        return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))))
    }
    return '#' + [f(0), f(8), f(4)].map(x => x.toString(16).padStart(2, '0')).join('')
}

function record(token: string, theme: unknown, value: unknown, painted?: string) {
    const hit: Hit = { seq: ++seq, token, theme: label(theme), value: String(value), painted }
    if (watched.has(token)) hit.stack = (new Error().stack ?? '').split('\n').slice(3, 11).join('\n')
    const rv = String(value).toLowerCase();(byValue.get(rv) ?? byValue.set(rv, new Set()).get(rv)!).add(token)
if (painted) byPaint.set(painted.toLowerCase(), token)
    hits.push(hit)
    if (hits.length > 20000) hits.splice(0, 5000)
}

function patchTokens(mod: any, cleanup: (...f: Array<() => void>) => void) {
    const dflt = mod?.default
    const internal = mod?.internal ?? dflt?.internal
    const Semantic = mod?.SemanticColor ?? dflt?.SemanticColor
    const Raw = mod?.RawColor ?? dflt?.RawColor
    if (typeof internal?.resolveSemanticColor !== 'function') {
        console.warn('[ColorCap] resolveSemanticColor not found. keys:', Object.keys(mod ?? {}), Object.keys(dflt ?? {}))
        return
    }
    for (const [k, v] of Object.entries(Semantic ?? {})) names.set(v, k)
        for (const [k, v] of Object.entries(Raw ?? {})) {
            if (typeof v !== 'string') continue
            const rv = v.toLowerCase()
            ;(rawByValue.get(rv) ?? rawByValue.set(rv, new Set()).get(rv)!).add(k)
        }

    if (TRACK_RAW && Raw) {
        const restore: Array<() => void> = []
        for (const key of Object.keys(Raw)) {
            const d = Object.getOwnPropertyDescriptor(Raw, key)
            if (!d || !d.configurable || !('value' in d)) continue
            let val = d.value
            Object.defineProperty(Raw, key, {
                configurable: true, enumerable: d.enumerable,
                get() {
                    const k2 = `${current ?? '(direct)'} <- ${key}`
                    rawReads.set(k2, (rawReads.get(k2) ?? 0) + 1)
                    return val
                },
                set(v) { val = v },
            })
            restore.push(() => Object.defineProperty(Raw, key, { configurable: true, enumerable: d.enumerable, writable: true, value: val }))
        }
        cleanup(() => restore.forEach(r => r()))
    }

    cleanup(instead(internal, 'resolveSemanticColor', (args: any[], original: (...a: any[]) => any) => {
        const token = nameOf(args[1])
        const prev = current
        current = token
        let real: any
        try { real = original(...args) } finally { current = prev }
        const painted = PAINT ? paint(token) : undefined
        record(token, args[0], real, painted)
        return painted ?? real
    }))
}

export default plugin({
    
    preInit({ cleanup }) {
        cleanup(installFiberHook())
        cleanup(getModules(withProps('RawColor', 'SemanticColor'), mod => patchTokens(mod, cleanup)))

        const api = {
            scan(opts: { match?: string; token?: string; max?: number } = {}) {
                const { match, token, max = 80 } = opts
                const out: string[] = []
                for (const root of roots) {
                    const stack = [root.current]
                    while (stack.length && out.length < max) {
                        const f = stack.pop()
                        if (!f) continue
                        if (f.sibling) stack.push(f.sibling)
                        if (f.child) stack.push(f.child)
                        const props = f.memoizedProps
                        if (!props || typeof props !== 'object') continue
                        const isHost = typeof f.type === 'string'
                        const kids = props.children
                        const text = typeof kids === 'string' ? kids
                            : Array.isArray(kids) ? kids.filter((x: any) => typeof x === 'string').join('') : ''
                        const head = `${chainOf(f)} > <${isHost ? f.type : (f.type?.displayName || f.type?.name || '?')}>`
                            + (text ? ` "${text.slice(0, 30)}"` : '')
                            + (props.testID ? ` #${props.testID}` : '')
                        if (match && !head.toLowerCase().includes(match.toLowerCase())) continue
            
                        const found: Array<[string, string]> = []
                        if (isHost) {
                            for (const [k, v] of Object.entries(flatStyle(props.style)))
                                if (COLOR_KEY.test(k)) { const t = lookup(v); if (t) found.push([`${k}=${v}`, t]) }
                        } else {
                            for (const [k, v] of Object.entries(props))
                                if (k !== 'style' && COLOR_KEY.test(k) && (typeof v === 'string' || (v && typeof v === 'object')))
                                    found.push([`prop ${k}`, typeof v === 'string' ? v : nameOf(v)])
                        }
                        for (const [what, t] of found)
                            if (!token || t.toUpperCase().includes(token.toUpperCase())) out.push(`${head}\n    ${what}  <-  ${t}`)
                    }
                }
                return out
            },
            clear() { hits.length = 0; rawReads.clear(); return 'cleared' },
            watch(...t: string[]) { t.forEach(x => watched.add(x)); return [...watched] },
            // token -> { theme: value }, in first-resolved order
            tokens(filter = '') {
                const out: Record<string, Record<string, string>> = {}
                for (const h of hits)
                    if (h.token.includes(filter.toUpperCase()))
                        (out[h.token] ??= {})[h.theme] = h.painted ? `${h.value} (painted ${h.painted})` : h.value
                return out
            },
            // which tokens resolved to this color (match the format you see, hex or rgba)
            find(color: string) {
                const q = color.toLowerCase()
                return [...new Set(hits.filter(h => h.value.toLowerCase() === q || h.painted?.toLowerCase() === q).map(h => h.token))]
            },
            raw() { return [...rawReads].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${n}x ${k}`) },
            stacks(token: string) { return hits.filter(h => h.token === token && h.stack).map(h => h.stack) },
            report() { // phone-friendly: writes to Settings > Valenced > Developer > Debug Logs
                for (const [t, v] of Object.entries(api.tokens())) L?.log(t, JSON.stringify(v))
                for (const line of api.raw()) L?.log('raw', line)
            },
        }
        ;(globalThis as any).colorCap = api
        cleanup(() => { delete (globalThis as any).colorCap })
    },
    init({ logger }) { L = logger },
})