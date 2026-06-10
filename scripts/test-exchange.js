require('dotenv').config({ path: require('path').join(__dirname, '../src/.env') })

const { fetchExchangeRates } = require('../src/infrastructure/dolarapiClient')
const { rawACotizaciones } = require('../src/mappers/exchangeMapper')
const { calcularSpreads, calcularBrecha, ordenarParaComprar, obtenerSenial } = require('../src/services/exchangeService')

async function main() {
  console.log('Obteniendo cotizaciones...\n')

  const { datos, fuente, esFallback } = await fetchExchangeRates()
  const resultado = rawACotizaciones(datos, fuente, esFallback)

  console.log(`Fuente: ${resultado.fuente}`)
  console.log(`Timestamp: ${resultado.timestamp}`)

  if (resultado.advertencia) {
    console.log(`⚠️  ${resultado.advertencia}`)
  }

  if (resultado.omitidos.length > 0) {
    console.log(`Omitidos (sin precio completo): ${resultado.omitidos.join(', ')}`)
  }

  const conSpreads = calcularSpreads(resultado.cotizaciones)
  const conBrecha = calcularBrecha(conSpreads)
  const ordenados = ordenarParaComprar(conBrecha)
  const seniales = obtenerSenial(conBrecha)

  console.log('\n--- Cotizaciones ---')
  ordenados.forEach(c => {
    const senial = seniales.find(s => s.casa === c.casa)?.senial ?? 'neutral'
    console.log(`${c.nombre.padEnd(25)} compra: $${c.compra}  venta: $${c.venta}  spread: ${c.spread}%  brecha: ${c.brecha}%  señal: ${senial}`)
  })
}

main().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
