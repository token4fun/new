// server.js
require('./monitor.js'); // <-- Importa e executa o monitoramento
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve os arquivos estáticos da pasta "public"
app.use(express.static(path.join(__dirname, 'public')));

// Rota padrão: serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota para telegram.html
app.get('/telegram', (req, res) => {
  res.sendFile(path.join(__dirname, 'telegram.html'));
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});
