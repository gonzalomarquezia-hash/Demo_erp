import { useMemo, useState } from 'react'
import { useStore } from '../store.jsx'
import { Card, Tabs, Badge, usePaged, Kpi } from '../components/ui.jsx'
import { Entry, JournalHeader } from '../components/Impact.jsx'
import { ACCOUNTS, accName } from '../engine/accounts.js'
import { money, fdate, num, dec2, monthKey, monthLong, pct } from '../lib/format.js'

export default function Accounting() {
  const [tab, setTab] = useState('diario')
  return (
    <div className="page">
      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'diario', label: 'Libro diario' },
        { id: 'mayor', label: 'Libro mayor' },
        { id: 'sumas', label: 'Balance de sumas y saldos' },
        { id: 'estados', label: 'Estados contables' },
        { id: 'plan', label: 'Plan de cuentas' },
      ]} />
      {tab === 'diario' && <Journal />}
      {tab === 'mayor' && <Ledger />}
      {tab === 'sumas' && <TrialBalance />}
      {tab === 'estados' && <Statements />}
      {tab === 'plan' && <Chart />}
    </div>
  )
}

function useSums(from, to) {
  const { db } = useStore()
  return useMemo(() => {
    const s = {}
    for (const e of db.journal) {
      if ((from && e.date < from) || (to && e.date > to)) continue
      for (const l of e.lines) {
        const a = (s[l.account] ||= { debit: 0, credit: 0 })
        a.debit += l.debit
        a.credit += l.credit
      }
    }
    return s
  }, [db.journal, from, to])
}

function Journal() {
  const { db } = useStore()
  const [mod, setMod] = useState('todos')
  const [q, setQ] = useState('')
  const rows = useMemo(() => db.journal.filter((e) => (mod === 'todos' || e.module === mod) && (!q || e.concept.toLowerCase().includes(q.toLowerCase()))).slice().reverse(), [db.journal, mod, q])
  const { slice, pager } = usePaged(rows, 8)
  const totals = db.journal.reduce((a, e) => { for (const l of e.lines) { a.d += l.debit; a.c += l.credit } return a }, { d: 0, c: 0 })
  const modules = [...new Set(db.journal.map((e) => e.module))]

  return (
    <>
      <div className="grid g-3">
        <Kpi label="Asientos registrados" value={num(db.journal.length)} foot={<span>Todos generados automáticamente por las operaciones</span>} />
        <Kpi label="Total Debe" value={money(totals.d)} />
        <Kpi label="Total Haber" value={money(totals.c)} foot={Math.abs(totals.d - totals.c) < 1 ? <Badge tone="good">Partida doble verificada</Badge> : <Badge tone="bad">Diferencia</Badge>} />
      </div>
      <Card title="Libro diario" sub="Del más reciente al más antiguo. Cada operación registrada en un módulo genera su asiento en el momento." tour="journal">
        <div className="toolbar" style={{ padding: '0 0 12px' }}>
          <input className="input" style={{ width: 280 }} placeholder="Buscar por concepto o comprobante" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="select" value={mod} onChange={(e) => setMod(e.target.value)}>
            <option value="todos">Todos los módulos de origen</option>
            {modules.map((x) => <option key={x}>{x}</option>)}
          </select>
        </div>
        <JournalHeader />
        {slice.map((e) => (
          <div key={e.id}>
            <div className="small muted" style={{ margin: '10px 0 4px' }}>Origen: módulo {e.module} · comprobante {e.doc}</div>
            <Entry entry={e} />
          </div>
        ))}
      </Card>
      <div className="card">{pager}</div>
    </>
  )
}

function Ledger() {
  const { db } = useStore()
  const [acc, setAcc] = useState('1.1.04')
  const lines = useMemo(() => {
    const out = []
    let bal = 0
    for (const e of db.journal) {
      for (const l of e.lines) {
        if (l.account !== acc) continue
        bal += l.debit - l.credit
        out.push({ e, l, bal })
      }
    }
    return out
  }, [db.journal, acc])
  const shown = lines.slice(-60).reverse()
  const last = lines[lines.length - 1]
  const a = ACCOUNTS.find((x) => x.code === acc)
  return (
    <Card title={`Mayor de ${a.code} ${a.name}`} sub={`${a.group} · ${num(lines.length)} movimientos · se muestran los últimos 60`} flush
      right={<select className="select" value={acc} onChange={(e) => setAcc(e.target.value)}>{ACCOUNTS.map((x) => <option key={x.code} value={x.code}>{x.code} {x.name}</option>)}</select>}
    >
      <div style={{ padding: '0 16px 12px' }} className="text-2">
        Saldo actual: <strong>{money(Math.abs(last?.bal || 0))}</strong> {last && (last.bal >= 0 ? 'deudor' : 'acreedor')}
      </div>
      <table className="t">
        <thead><tr><th>Fecha</th><th className="num">Asiento</th><th>Concepto</th><th className="num">Debe</th><th className="num">Haber</th><th className="num">Saldo</th></tr></thead>
        <tbody>
          {shown.map(({ e, l, bal }, i) => (
            <tr key={`${e.id}-${i}`}>
              <td className="nowrap">{fdate(e.date)}</td>
              <td className="num">{num(e.number)}</td>
              <td className="small">{e.concept}</td>
              <td className="num">{l.debit ? dec2(l.debit) : ''}</td>
              <td className="num">{l.credit ? dec2(l.credit) : ''}</td>
              <td className="num strong">{dec2(Math.abs(bal))} {bal >= 0 ? 'D' : 'A'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function TrialBalance() {
  const sums = useSums()
  const rows = ACCOUNTS.filter((a) => sums[a.code]).map((a) => {
    const s = sums[a.code]
    const bal = s.debit - s.credit
    return { a, ...s, deudor: bal > 0 ? bal : 0, acreedor: bal < 0 ? -bal : 0 }
  })
  const t = rows.reduce((x, r) => ({ debit: x.debit + r.debit, credit: x.credit + r.credit, deudor: x.deudor + r.deudor, acreedor: x.acreedor + r.acreedor }), { debit: 0, credit: 0, deudor: 0, acreedor: 0 })
  return (
    <Card title="Balance de sumas y saldos" sub="Ejercicio en curso, a la fecha del sistema" flush right={Math.abs(t.deudor - t.acreedor) < 1 ? <Badge tone="good">Saldos deudores = saldos acreedores</Badge> : <Badge tone="bad">No balancea</Badge>}>
      <table className="t">
        <thead><tr><th>Código</th><th>Cuenta</th><th>Rubro</th><th className="num">Sumas Debe</th><th className="num">Sumas Haber</th><th className="num">Saldo deudor</th><th className="num">Saldo acreedor</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.a.code}>
              <td className="mono">{r.a.code}</td>
              <td>{r.a.name}</td>
              <td className="text-2 small">{r.a.group}</td>
              <td className="num">{money(r.debit)}</td>
              <td className="num">{money(r.credit)}</td>
              <td className="num">{r.deudor ? money(r.deudor) : ''}</td>
              <td className="num">{r.acreedor ? money(r.acreedor) : ''}</td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr><td colSpan={3}>Totales</td><td className="num">{money(t.debit)}</td><td className="num">{money(t.credit)}</td><td className="num">{money(t.deudor)}</td><td className="num">{money(t.acreedor)}</td></tr></tfoot>
      </table>
    </Card>
  )
}

function Statements() {
  const { db } = useStore()
  const cur = monthKey(db.today)
  const [period, setPeriod] = useState('ejercicio')
  const from = period === 'ejercicio' ? null : `${period}-01`
  const to = period === 'ejercicio' ? null : `${period}-31`
  const sums = useSums(from, to)
  const all = useSums()
  const res = (code) => { const s = sums[code]; return s ? s.debit - s.credit : 0 }
  const bal = (code) => { const s = all[code]; return s ? s.debit - s.credit : 0 }
  const ventas = -res('4.1.01')
  const cmv = res('5.1.01')
  const gastos = ['5.2.01', '5.2.02', '5.2.03', '5.2.04'].map((c) => ({ c, v: res(c) }))
  const gTotal = gastos.reduce((a, g) => a + g.v, 0)
  const resultado = ventas - cmv - gTotal
  const resultadoEj = -['4.1.01', '5.1.01', '5.2.01', '5.2.02', '5.2.03', '5.2.04'].reduce((a, c) => a + bal(c), 0)
  const months = [...new Set(db.journal.map((e) => monthKey(e.date)))].sort().reverse()

  const group = (g) => ACCOUNTS.filter((a) => a.group === g).map((a) => ({ a, v: a.nature === 'D' ? bal(a.code) : -bal(a.code) })).filter((x) => Math.abs(x.v) > 0.5)
  const ac = group('Activo corriente'), anc = group('Activo no corriente'), pc = group('Pasivo corriente'), pn = group('Patrimonio neto')
  const tot = (arr) => arr.reduce((s, x) => s + x.v, 0)
  const activo = tot(ac) + tot(anc)
  const pasivo = tot(pc)
  const patrimonio = tot(pn) + resultadoEj

  const Row = ({ label, value, strong, indent }) => (
    <tr><td style={{ paddingLeft: indent ? 32 : undefined }} className={strong ? 'strong' : ''}>{label}</td><td className={`num ${strong ? 'strong' : ''}`}>{money(value)}</td></tr>
  )

  return (
    <div className="grid g-2">
      <Card title="Estado de resultados" sub={period === 'ejercicio' ? 'Ejercicio en curso' : monthLong(period)} flush
        right={<select className="select" value={period} onChange={(e) => setPeriod(e.target.value)}><option value="ejercicio">Ejercicio completo</option>{months.map((k) => <option key={k} value={k}>{monthLong(k)}{k === cur ? ' (en curso)' : ''}</option>)}</select>}
      >
        <table className="t">
          <tbody>
            <Row label="Ventas netas" value={ventas} strong />
            <Row label="Costo de mercaderías vendidas" value={-cmv} indent />
            <Row label={`Resultado bruto (margen ${pct(ventas ? (ventas - cmv) / ventas : 0)})`} value={ventas - cmv} strong />
            {gastos.map((g) => <Row key={g.c} label={accName(g.c)} value={-g.v} indent />)}
            <Row label="Total gastos de comercialización y administración" value={-gTotal} />
          </tbody>
          <tfoot><tr><td>Resultado del período</td><td className={`num ${resultado < 0 ? 'bad' : 'good'}`}>{money(resultado)}</td></tr></tfoot>
        </table>
      </Card>
      <Card title="Estado de situación patrimonial" sub={`Al ${fdate(db.today)}`} flush right={Math.abs(activo - pasivo - patrimonio) < 1 ? <Badge tone="good">Activo = Pasivo + PN</Badge> : <Badge tone="bad">Diferencia</Badge>}>
        <table className="t">
          <tbody>
            <tr><td className="section-title" colSpan={2}>Activo corriente</td></tr>
            {ac.map((x) => <Row key={x.a.code} label={x.a.name} value={x.v} indent />)}
            <tr><td className="section-title" colSpan={2}>Activo no corriente</td></tr>
            {anc.map((x) => <Row key={x.a.code} label={x.a.name} value={x.v} indent />)}
            <Row label="Total del activo" value={activo} strong />
            <tr><td className="section-title" colSpan={2}>Pasivo corriente</td></tr>
            {pc.map((x) => <Row key={x.a.code} label={x.a.name} value={x.v} indent />)}
            <Row label="Total del pasivo" value={pasivo} strong />
            <tr><td className="section-title" colSpan={2}>Patrimonio neto</td></tr>
            {pn.map((x) => <Row key={x.a.code} label={x.a.name} value={x.v} indent />)}
            <Row label="Resultado del ejercicio" value={resultadoEj} indent />
            <Row label="Total del patrimonio neto" value={patrimonio} strong />
          </tbody>
          <tfoot><tr><td>Pasivo + Patrimonio neto</td><td className="num">{money(pasivo + patrimonio)}</td></tr></tfoot>
        </table>
      </Card>
    </div>
  )
}

function Chart() {
  return (
    <Card title="Plan de cuentas" sub="Estructura codificada utilizada por los asientos automáticos" flush>
      <table className="t">
        <thead><tr><th>Código</th><th>Cuenta</th><th>Rubro</th><th>Saldo habitual</th></tr></thead>
        <tbody>
          {ACCOUNTS.map((a) => (
            <tr key={a.code}><td className="mono">{a.code}</td><td>{a.name}</td><td className="text-2">{a.group}</td><td>{a.nature === 'D' ? 'Deudor' : 'Acreedor'}</td></tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}
