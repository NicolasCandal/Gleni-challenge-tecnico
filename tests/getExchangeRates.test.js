jest.mock('../src/infrastructure/dolarapiClient')

const { fetchExchangeRates } = require('../src/infrastructure/dolarapiClient')
const { manejador } = require('../src/tools/getExchangeRates')

const datosValidos = [
  { casa: 'oficial', nombre: 'Oficial', compra: 1000, venta: 1010, fechaActualizacion: '2026-01-01T00:00:00.000Z' },
  { casa: 'blue',    nombre: 'Blue',    compra: 1150, venta: 1200, fechaActualizacion: '2026-01-01T00:00:00.000Z' },
]

beforeEach(() => {
  fetchExchangeRates.mockResolvedValue({ datos: datosValidos, fuente: 'dolarapi.com', esFallback: false })
})

describe('manejador — validación de inputs', () => {
  test('acepta llamada sin parámetros', async () => {
    await expect(manejador({})).resolves.toBeDefined()
  })

  test('rechaza rate_types con valores fuera del enum', async () => {
    await expect(manejador({ rate_types: ['invalido'] })).rejects.toThrow()
  })

  test('acepta rate_types con valores válidos', async () => {
    await expect(manejador({ rate_types: ['blue', 'oficial'] })).resolves.toBeDefined()
  })
})

describe('manejador — transformación correcta', () => {
  test('devuelve cotizaciones con spread, brecha y señal calculados', async () => {
    const resultado = await manejador({})
    expect(resultado.cotizaciones.length).toBeGreaterThan(0)
    expect(resultado.cotizaciones[0]).toHaveProperty('spread')
    expect(resultado.cotizaciones[0]).toHaveProperty('brecha')
    expect(resultado.cotizaciones[0]).toHaveProperty('senial')
  })

  test('filtra por rate_types cuando se especifica', async () => {
    const resultado = await manejador({ rate_types: ['blue'] })
    expect(resultado.cotizaciones).toHaveLength(1)
    expect(resultado.cotizaciones[0].casa).toBe('blue')
  })

  test('conversion es null cuando no se pasa amount', async () => {
    const resultado = await manejador({})
    expect(resultado.conversion).toBeNull()
  })

  // Con los datos mock, ordenarParaComprar ordena por venta ascendente:
  // oficial (venta 1010) queda primero.
  test('USD_A_ARS: referencia usa venta y operacion usa compra del tipo más barato', async () => {
    const resultado = await manejador({ amount: 100, direction: 'USD_A_ARS' })
    const conv = resultado.conversion
    expect(conv).not.toBeNull()
    expect(conv.monto).toBe(100)
    expect(conv.direccion).toBe('USD_A_ARS')
    expect(conv.referencia.tipoCambio).toBe(1010)     // venta oficial
    expect(conv.referencia.resultado).toBe(101000)    // 100 * 1010
    expect(conv.operacion.lado).toBe('compra')
    expect(conv.operacion.tipoCambio).toBe(1000)      // compra oficial
    expect(conv.operacion.resultado).toBe(100000)     // 100 * 1000
  })

  test('ARS_A_USD: referencia y operacion coinciden (ambas usan venta)', async () => {
    const resultado = await manejador({ amount: 101000, direction: 'ARS_A_USD' })
    const conv = resultado.conversion
    expect(conv).not.toBeNull()
    expect(conv.direccion).toBe('ARS_A_USD')
    expect(conv.operacion.lado).toBe('venta')
    expect(conv.referencia.tipoCambio).toBe(conv.operacion.tipoCambio)
    expect(conv.referencia.resultado).toBe(100)       // 101000 / 1010
    expect(conv.operacion.resultado).toBe(100)        // 101000 / 1010
  })

  test('incluye fuente y timestamp en la respuesta', async () => {
    const resultado = await manejador({})
    expect(resultado.fuente).toBe('dolarapi.com')
    expect(resultado.timestamp).toBeDefined()
  })
})

describe('manejador — guard mayorista en conversión', () => {
  const datosConMayorista = [
    { casa: 'mayorista', nombre: 'Mayorista', compra: 900,  venta: 950,  fechaActualizacion: '2026-01-01T00:00:00.000Z' },
    { casa: 'oficial',   nombre: 'Oficial',   compra: 1000, venta: 1010, fechaActualizacion: '2026-01-01T00:00:00.000Z' },
    { casa: 'blue',      nombre: 'Blue',      compra: 1150, venta: 1200, fechaActualizacion: '2026-01-01T00:00:00.000Z' },
  ]

  beforeEach(() => {
    fetchExchangeRates.mockResolvedValue({ datos: datosConMayorista, fuente: 'dolarapi.com', esFallback: false })
  })

  test('conversión SIN rate_types no usa el mayorista aunque tenga venta más baja', async () => {
    const resultado = await manejador({ amount: 100 })
    expect(resultado.conversion.tipoUsado).not.toBe('Mayorista')
    expect(resultado.conversion.tipoUsado).toBe('Oficial')
  })

  test('conversión CON rate_types: [mayorista] respeta la elección explícita', async () => {
    const resultado = await manejador({ amount: 100, rate_types: ['mayorista'] })
    expect(resultado.conversion.tipoUsado).toBe('Mayorista')
  })

  test('cotizaciones devueltas incluyen mayorista sin rate_types', async () => {
    const resultado = await manejador({ amount: 100 })
    const casas = resultado.cotizaciones.map(c => c.casa)
    expect(casas).toContain('mayorista')
  })

  test('cotizaciones devueltas incluyen mayorista con rate_types: [mayorista]', async () => {
    const resultado = await manejador({ amount: 100, rate_types: ['mayorista'] })
    const casas = resultado.cotizaciones.map(c => c.casa)
    expect(casas).toContain('mayorista')
  })
})

describe('manejador — respuestas malformadas de la API', () => {
  test('filtra cotizaciones sin compra o venta en lugar de romper', async () => {
    fetchExchangeRates.mockResolvedValue({
      datos: [{ casa: 'oficial', nombre: 'Oficial', compra: null, venta: null, fechaActualizacion: '2026-01-01T00:00:00.000Z' }],
      fuente: 'dolarapi.com',
      esFallback: false
    })
    const resultado = await manejador({})
    expect(resultado.cotizaciones).toHaveLength(0)
    expect(resultado.omitidos).toContain('Oficial')
  })

  test('lanza error cuando la API falla', async () => {
    fetchExchangeRates.mockRejectedValue(new Error('API no disponible'))
    await expect(manejador({})).rejects.toThrow('API no disponible')
  })
})
