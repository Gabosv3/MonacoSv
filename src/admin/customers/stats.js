// Lo que cada cliente compra y lo que cotiza, calculado desde sus pedidos y cotizaciones.

// "9PM (10 ml)" y "9PM" son el mismo producto base
export const baseName = (name) => String(name ?? '').replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase()

export const QUOTE_STATUS = {
  abierta: { label: 'Abierta', tone: 'amber' },
  enviada: { label: 'Enviada', tone: 'blue' },
  ganada: { label: 'Ganada', tone: 'green' },
  perdida: { label: 'Perdida', tone: 'red' },
}

export function customerStats(customer, sales, quotes) {
  const mySales = sales.filter((s) => s.customer_id === customer.id)
  const valid = mySales.filter((s) => s.status !== 'cancelada')
  const myQuotes = quotes.filter((q) => q.customer_id === customer.id)

  // productos que compra
  const bought = new Map()
  valid.forEach((s) =>
    (s.sale_items ?? []).forEach((i) => {
      const cur = bought.get(i.product_name) ?? { name: i.product_name, units: 0, total: 0, last: s.created_at }
      cur.units += i.quantity
      cur.total += Number(i.subtotal)
      if (s.created_at > cur.last) cur.last = s.created_at
      bought.set(i.product_name, cur)
    })
  )
  const boughtBases = new Set([...bought.keys()].map(baseName))

  // productos que cotiza (las cotizaciones vienen de la más nueva a la más antigua)
  const quoted = new Map()
  myQuotes.forEach((q) =>
    (q.quote_items ?? []).forEach((i) => {
      const cur = quoted.get(i.product_name) ?? {
        name: i.product_name, times: 0, units: 0, lastPrice: Number(i.unit_price), lastDate: q.created_at, lastStatus: q.status,
      }
      cur.times += 1
      cur.units += i.quantity
      quoted.set(i.product_name, cur)
    })
  )
  const quotedList = [...quoted.values()]
    .map((q) => ({ ...q, purchased: boughtBases.has(baseName(q.name)) }))
    .sort((a, b) => b.times - a.times)

  const spent = valid.reduce((n, s) => n + Number(s.total), 0)
  return {
    orders: valid.length,
    spent,
    avg: valid.length ? spent / valid.length : 0,
    last: valid[0]?.created_at ?? null,
    boughtList: [...bought.values()].sort((a, b) => b.units - a.units),
    quotedList,
    quoteCount: myQuotes.length,
    openQuotes: myQuotes.filter((q) => q.status === 'abierta' || q.status === 'enviada').length,
    orderList: mySales,
    quoteList: myQuotes,
  }
}
