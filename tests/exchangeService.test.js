const { calcularBrecha, ordenarParaComprar, obtenerSenial } = require('../src/services/exchangeService')

// Umbrales por defecto: SPREAD_ALTO=2.5, SPREAD_BAJO=1.5, BRECHA_ALTA=8, BRECHA_BAJA=3

const cotizacionesBase = [
  { casa: 'oficial', nombre: 'Oficial', compra: 1000, venta: 1010, fechaActualizacion: '2026-01-01' },
  { casa: 'blue',    nombre: 'Blue',    compra: 1150, venta: 1200, fechaActualizacion: '2026-01-01' },
  { casa: 'bolsa',   nombre: 'Bolsa',   compra: 1080, venta: 1100, fechaActualizacion: '2026-01-01' },
]

describe('calcularBrecha', () => {
  test('calcula la brecha porcentual correcta vs tipo oficial', () => {
    const resultado = calcularBrecha(cotizacionesBase)
    const blue = resultado.find(c => c.casa === 'blue')
    // (1200 - 1010) / 1010 * 100 ≈ 18.81
    expect(blue.brecha).toBeCloseTo(18.81, 1)
  })

  test('el tipo oficial tiene brecha 0', () => {
    const resultado = calcularBrecha(cotizacionesBase)
    const oficial = resultado.find(c => c.casa === 'oficial')
    expect(oficial.brecha).toBe(0)
  })

  test('devuelve brecha null para todos si no hay tipo oficial', () => {
    const sinOficial = cotizacionesBase.filter(c => c.casa !== 'oficial')
    const resultado = calcularBrecha(sinOficial)
    expect(resultado.every(c => c.brecha === null)).toBe(true)
  })
})

describe('ordenarParaComprar', () => {
  test('ordena por precio de venta ascendente', () => {
    const resultado = ordenarParaComprar(cotizacionesBase)
    for (let i = 0; i < resultado.length - 1; i++) {
      expect(resultado[i].venta).toBeLessThanOrEqual(resultado[i + 1].venta)
    }
  })

  test('no muta el array original', () => {
    const ordenOriginal = cotizacionesBase.map(c => c.casa)
    ordenarParaComprar(cotizacionesBase)
    expect(cotizacionesBase.map(c => c.casa)).toEqual(ordenOriginal)
  })
})

describe('obtenerSenial', () => {
  test('devuelve "comprar" cuando spread y brecha están por debajo del umbral bajo', () => {
    const cotizaciones = [{ casa: 'oficial', nombre: 'Oficial', spread: 1.0, brecha: 1.0 }]
    const [resultado] = obtenerSenial(cotizaciones)
    expect(resultado.senial).toBe('comprar')
  })

  test('devuelve "esperar" cuando el spread supera el umbral alto', () => {
    const cotizaciones = [{ casa: 'blue', nombre: 'Blue', spread: 3.0, brecha: 2.0 }]
    const [resultado] = obtenerSenial(cotizaciones)
    expect(resultado.senial).toBe('esperar')
  })

  test('devuelve "esperar" cuando la brecha supera el umbral alto', () => {
    const cotizaciones = [{ casa: 'blue', nombre: 'Blue', spread: 1.0, brecha: 10.0 }]
    const [resultado] = obtenerSenial(cotizaciones)
    expect(resultado.senial).toBe('esperar')
  })

  test('devuelve "neutral" cuando los valores están en rango medio', () => {
    const cotizaciones = [{ casa: 'bolsa', nombre: 'Bolsa', spread: 2.0, brecha: 5.0 }]
    const [resultado] = obtenerSenial(cotizaciones)
    expect(resultado.senial).toBe('neutral')
  })

  test('devuelve la señal correcta para múltiples tipos simultáneamente', () => {
    const cotizaciones = [
      { casa: 'oficial', nombre: 'Oficial', spread: 1.0, brecha: 1.0 },
      { casa: 'blue',    nombre: 'Blue',    spread: 3.5, brecha: 9.0 },
    ]
    const resultado = obtenerSenial(cotizaciones)
    expect(resultado[0].senial).toBe('comprar')
    expect(resultado[1].senial).toBe('esperar')
  })
})
