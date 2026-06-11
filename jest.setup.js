// Permite certificados SSL corporativos/auto-firmados en el entorno de tests.
// Necesario cuando hay un proxy corporativo con CA personalizada no reconocida por Node.js.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
