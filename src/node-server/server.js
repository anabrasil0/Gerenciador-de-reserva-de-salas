const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Configuração inicial
const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'webapp')));

// MÚLTIPLOS CAMINHOS PARA O BANCO DE DADOS
const possibleDbPaths = [
    path.join(__dirname, '..', '..', 'bancoreservas_v2.db'),  // Raiz do projeto
    path.join(__dirname, '..', 'bancoreservas_v2.db'),       // Pasta src
    path.join(__dirname, '..', '..', 'src', 'bancoreservas_v2.db'),
    path.join(__dirname, 'bancoreservas_v2.db'),
    '/home/leticialemes/Gerenciador-de-reserva-de-salas/bancoreservas_v2.db',
    '/home/leticialemes/Gerenciador-de-reserva-de-salas/src/bancoreservas_v2.db'
];

let dbPath = null;
let db = null;  // Declarar UMA ÚNICA VEZ aqui

// Procurar o banco em todos os possíveis lugares
for (const possiblePath of possibleDbPaths) {
    if (fs.existsSync(possiblePath)) {
        dbPath = possiblePath;
        console.log(`✅ Banco encontrado em: ${dbPath}`);
        break;
    }
}

if (!dbPath) {
    console.error('\nBanco de dados não encontrado!');
    console.log('Locais procurados:');
    possibleDbPaths.forEach(p => console.log(`   - ${p}`));
    console.log('\n🔧 Soluções:');
    console.log('1. Coloque o arquivo bancoreservas_v2.db na RAIZ do projeto');
    console.log('2. Ou execute: cp src/bancoreservas_v2.db .');
    process.exit(1);
}

console.log(`Conectando ao banco: ${dbPath}`);

// Criar a conexão com o banco (APENAS UMA VEZ)
db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco:', err.message);
        process.exit(1);
    } else {
        console.log('Conectado ao banco SQLite com sucesso!');
        
        // Verificar se as tabelas existem
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='sala'", (err, row) => {
            if (err) {
                console.error('Erro ao verificar tabelas:', err.message);
            } else if (!row) {
                console.warn('Tabela "sala" não encontrada. Execute o programa Java para criar as tabelas.');
            } else {
                console.log('Tabelas verificadas com sucesso');
            }
        });
    }
});

// ENDPOINTS DA API

// SALAS
// GET /api/rooms - Listar todas as salas
app.get('/api/rooms', (req, res) => {
    const sql = 'SELECT * FROM sala';
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar salas:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// GET /api/rooms/:id - Buscar sala por ID
app.get('/api/rooms/:id', (req, res) => {
    const sql = 'SELECT * FROM sala WHERE id = ?';
    
    db.get(sql, [req.params.id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Sala não encontrada' });
            return;
        }
        res.json(row);
    });
});

// POST /api/rooms - Cadastrar nova sala
app.post('/api/rooms', (req, res) => {
    const { id, nome, localizacao, tipo, possuiComputadores } = req.body;
    
    // Validação
    if (!id || !nome || !localizacao) {
        res.status(400).json({ error: 'ID, Nome e Localização são obrigatórios' });
        return;
    }
    
    const sql = `INSERT INTO sala (id, nome, localizacao, tipo, possuiComputadores) 
                 VALUES (?, ?, ?, ?, ?)`;
    
    db.run(sql, [id, nome, localizacao, tipo, possuiComputadores ? 1 : 0], function(err) {
        if (err) {
            console.error('Erro ao cadastrar sala:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ 
            success: true, 
            message: 'Sala cadastrada com sucesso',
            id: id 
        });
    });
});

// RESERVAS
// GET /api/reservations - Listar todas as reservas
app.get('/api/reservations', (req, res) => {
    const sql = 'SELECT * FROM reserva ORDER BY dataReserva DESC';
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// GET /api/reservations/user/:email - Buscar reservas por usuário
app.get('/api/reservations/user/:email', (req, res) => {
    const sql = 'SELECT * FROM reserva WHERE identificacaoCadastro = ? ORDER BY dataReserva DESC';
    
    db.all(sql, [req.params.email], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// GET /api/reservations/room/:roomId - Buscar reservas por sala
app.get('/api/reservations/room/:roomId', (req, res) => {
    const sql = 'SELECT * FROM reserva WHERE idSala = ? ORDER BY dataReserva DESC';
    
    db.all(sql, [req.params.roomId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// POST /api/reservations - Criar nova reserva (com verificação de conflito)
app.post('/api/reservations', (req, res) => {
    const { id, dataReserva, horaInicio, horaFim, idSala, identificacaoCadastro } = req.body;
    
    // Validação
    if (!dataReserva || !horaInicio || !horaFim || !idSala || !identificacaoCadastro) {
        res.status(400).json({ error: 'Todos os campos são obrigatórios' });
        return;
    }
    
    // Verificar se a sala existe
    db.get('SELECT * FROM sala WHERE id = ?', [idSala], (err, sala) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!sala) {
            res.status(404).json({ error: 'Sala não encontrada' });
            return;
        }
        
        // Verificar conflito de horário
        const conflictSql = `SELECT COUNT(*) as count FROM reserva 
                            WHERE idSala = ? 
                            AND dataReserva = ? 
                            AND (
                                (horaInicio < ? AND horaFim > ?) OR
                                (horaInicio >= ? AND horaInicio < ?) OR
                                (horaFim > ? AND horaFim <= ?)
                            )`;
        
        db.get(conflictSql, [idSala, dataReserva, horaFim, horaInicio, horaInicio, horaFim, horaInicio, horaFim], 
            (err, result) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                
                if (result.count > 0) {
                    res.status(409).json({ error: 'Horário já reservado para esta sala' });
                    return;
                }
                
                // Gerar ID automático se não fornecido
                const reservationId = id || 'RES' + Date.now();
                
                const insertSql = `INSERT INTO reserva (id, dataReserva, horaInicio, horaFim, idSala, identificacaoCadastro) 
                                  VALUES (?, ?, ?, ?, ?, ?)`;
                
                db.run(insertSql, [reservationId, dataReserva, horaInicio, horaFim, idSala, identificacaoCadastro], 
                    function(err) {
                        if (err) {
                            console.error('Erro ao criar reserva:', err);
                            res.status(500).json({ error: err.message });
                            return;
                        }
                        res.json({ 
                            success: true, 
                            message: 'Reserva realizada com sucesso',
                            id: reservationId
                        });
                    });
            });
    });
});

// DELETE /api/reservations/:id - Cancelar reserva
app.delete('/api/reservations/:id', (req, res) => {
    const sql = 'DELETE FROM reserva WHERE id = ?';
    
    db.run(sql, [req.params.id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (this.changes === 0) {
            res.status(404).json({ error: 'Reserva não encontrada' });
            return;
        }
        
        res.json({ success: true, message: 'Reserva cancelada com sucesso' });
    });
});

// Rota de teste de conexão
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'online', 
        timestamp: new Date().toISOString(),
        database: fs.existsSync(dbPath) ? 'connected' : 'not found'
    });
});

// Tratamento erros globais
app.use((err, req, res, next) => {
    console.error('Erro não tratado:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
});

// Inicia servidor
app.listen(PORT, () => {
    console.log('\n========================================');
    console.log('SERVIDOR NODE INICIADO COM SUCESSO!');
    console.log('========================================');
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`Banco: ${dbPath}`);
    console.log(`Frontend: ${path.join(__dirname, '..', 'webapp')}`);
    console.log('========================================\n');
    
    // Mostrar alguns dados iniciais
    if (db) {
        db.get('SELECT COUNT(*) as count FROM sala', [], (err, result) => {
            if (err) {
                console.log(`Erro ao consultar salas: ${err.message}`);
            } else {
                console.log(`Salas cadastradas: ${result ? result.count : 0}`);
            }
        });
    }
});