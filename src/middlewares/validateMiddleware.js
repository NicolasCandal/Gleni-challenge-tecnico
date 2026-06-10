function validar(esquema) {
  return (req, res, next) => {
    const resultado = esquema.safeParse(req.body)
    if (!resultado.success) {
      return res.status(400).json({ error: resultado.error.errors })
    }
    req.body = resultado.data
    next()
  }
}

module.exports = validar
