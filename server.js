const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Conectar ao banco de dados SQLite
const db = new sqlite3.Database('./reservas.db', (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco:', err.message);
    } else {
        console.log('Conectado ao banco SQLite');
        criarTabelas();
    }
});

// Criar tabelas
function criarTabelas() {
    // Tabela de salas
    db.run(`CREATE TABLE IF NOT EXISTS salas (
        id TEXT PRIMARY KEY,
        localizacao TEXT NOT NULL,
        tipo TEXT,
        possuiComputadores INTEGER DEFAULT 0
    )`);

    // Tabela de reservas
    db.run(`CREATE TABLE IF NOT EXISTS reservas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        localizacao TEXT NOT NULL,
        dataReserva TEXT NOT NULL,
        horaInicio TEXT NOT NULL,
        horaFim TEXT NOT NULL,
        identificacaoCadastro TEXT NOT NULL,
        FOREIGN KEY (localizacao) REFERENCES salas(localizacao)
    )`, (err) => {
        if (err) {
            console.error('Erro ao criar tabela reservas:', err);
        } else {
            console.log('Tabelas criadas/verificadas com sucesso');
        }
    });
}

// ========== ROTAS DE SALAS ==========

// Listar todas as salas
app.get('/api/rooms', (req, res) => {
    db.all('SELECT * FROM salas ORDER BY id', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Buscar sala por ID
app.get('/api/rooms/:id', (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM salas WHERE id = ?', [id], (err, row) => {
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

// Cadastrar nova sala
app.post('/api/rooms', (req, res) => {
    const { id, localizacao, tipo, possuiComputadores } = req.body;
    
    console.log('Recebendo requisição para cadastrar sala:', req.body);
    
    // Validações
    if (!id || !localizacao) {
        console.log('Erro: ID ou localização faltando');
        return res.status(400).json({ 
            success: false, 
            error: 'ID e localização são obrigatórios' 
        });
    }

    // Verificar se a sala já existe
    db.get('SELECT id FROM salas WHERE id = ?', [id], (err, existingRoom) => {
        if (err) {
            console.error('Erro ao verificar sala existente:', err);
            return res.status(500).json({ 
                success: false, 
                error: err.message 
            });
        }
        
        if (existingRoom) {
            console.log('Sala já existe:', id);
            return res.status(409).json({ 
                success: false, 
                error: 'Já existe uma sala com este ID' 
            });
        }
        
        // Inserir nova sala
        const query = `INSERT INTO salas (id, localizacao, tipo, possuiComputadores) 
                       VALUES (?, ?, ?, ?)`;
        const params = [id, localizacao, tipo || 'Sala de Aula', possuiComputadores === true || possuiComputadores === 1 ? 1 : 0];
        
        db.run(query, params, function(err) {
            if (err) {
                console.error('Erro ao inserir sala:', err);
                return res.status(500).json({ 
                    success: false, 
                    error: err.message 
                });
            }
            
            console.log('Sala cadastrada com sucesso:', id);
            res.json({ 
                success: true, 
                id: id,
                message: 'Sala cadastrada com sucesso!'
            });
        });
    });
});

// Verificar disponibilidade de sala (CORRIGIDO - estava com (res, res))
app.get('/api/rooms/:idSala/disponivel', (req, res) => {
    const { idSala } = req.params;
    const { data, horaInicio, horaFim } = req.query;
    
    const query = `
        SELECT COUNT(*) as count FROM reservas r
        JOIN salas s ON r.localizacao = s.localizacao
        WHERE s.id = ? AND r.dataReserva = ? 
        AND ((r.horaInicio < ? AND r.horaFim > ?) OR
             (r.horaInicio >= ? AND r.horaInicio < ?))
    `;
    
    db.get(query, [idSala, data, horaFim, horaInicio, horaInicio, horaFim], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ disponivel: row.count === 0 });
    });
});

// ========== ROTAS DE RESERVAS ==========

// Listar todas as reservas
app.get('/api/reservations', (req, res) => {
    db.all(`SELECT r.*, s.id as sala_id, s.tipo as sala_tipo 
            FROM reservas r
            JOIN salas s ON r.localizacao = s.localizacao
            ORDER BY r.dataReserva DESC, r.horaInicio`, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Buscar reservas por usuário
app.get('/api/reservations/user/:email', (req, res) => {
    const { email } = req.params;
    db.all(`SELECT r.*, s.id as sala_id, s.tipo as sala_tipo 
            FROM reservas r
            JOIN salas s ON r.localizacao = s.localizacao
            WHERE r.identificacaoCadastro = ?
            ORDER BY r.dataReserva DESC, r.horaInicio`, [email], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Criar nova reserva
app.post('/api/reservations', (req, res) => {
    const { localizacao, dataReserva, horaInicio, horaFim, identificacaoCadastro } = req.body;
    
    if (!localizacao || !dataReserva || !horaInicio || !horaFim || !identificacaoCadastro) {
        res.status(400).json({ error: 'Todos os campos são obrigatórios' });
        return;
    }
    
    // Verificar se a sala existe
    db.get('SELECT localizacao FROM salas WHERE localizacao = ?', [localizacao], (err, sala) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!sala) {
            res.status(404).json({ error: 'Sala não encontrada' });
            return;
        }
        
        // Verificar conflito de horário
        const checkQuery = `SELECT COUNT(*) as count FROM reservas 
                           WHERE localizacao = ? AND dataReserva = ? 
                           AND ((horaInicio < ? AND horaFim > ?) OR
                                (horaInicio >= ? AND horaInicio < ?))`;
        
        db.get(checkQuery, [localizacao, dataReserva, horaFim, horaInicio, horaInicio, horaFim], (err, row) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            if (row.count > 0) {
                res.status(409).json({ error: 'Horário já reservado para esta sala' });
                return;
            }
            
            const insertQuery = `INSERT INTO reservas (localizacao, dataReserva, horaInicio, horaFim, identificacaoCadastro)
                                VALUES (?, ?, ?, ?, ?)`;
            
            db.run(insertQuery, [localizacao, dataReserva, horaInicio, horaFim, identificacaoCadastro], function(err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({ success: true, id: this.lastID });
            });
        });
    });
});

// Cancelar reserva
app.delete('/api/reservations/:id', (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM reservas WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Reserva não encontrada' });
            return;
        }
        res.json({ success: true });
    });
});

// ========== ROTAS DO CALENDÁRIO ==========

// Get reservations for calendar view
app.get('/api/calendar/reservations', (req, res) => {
    const { year, month, roomId } = req.query;
    
    if (!year || !month) {
        return res.status(400).json({ error: 'Year and month are required' });
    }
    
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    
    let query = `
        SELECT 
            r.id,
            r.dataReserva,
            r.horaInicio,
            r.horaFim,
            r.identificacaoCadastro,
            s.id as sala_id,
            s.localizacao,
            s.tipo as sala_tipo
        FROM reservas r
        JOIN salas s ON r.localizacao = s.localizacao
        WHERE r.dataReserva BETWEEN ? AND ?
    `;
    let params = [startDate, endDate];
    
    if (roomId && roomId !== 'all') {
        query += ` AND s.id = ?`;
        params.push(roomId);
    }
    
    query += ` ORDER BY r.dataReserva, r.horaInicio`;
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error fetching calendar reservations:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
});

// Get reservations for a specific day
app.get('/api/calendar/day/:date', (req, res) => {
    const { date } = req.params;
    const { roomId } = req.query;
    
    let query = `
        SELECT 
            r.id,
            r.dataReserva,
            r.horaInicio,
            r.horaFim,
            r.identificacaoCadastro,
            s.id as sala_id,
            s.localizacao,
            s.tipo as sala_tipo
        FROM reservas r
        JOIN salas s ON r.localizacao = s.localizacao
        WHERE r.dataReserva = ?
    `;
    let params = [date];
    
    if (roomId && roomId !== 'all') {
        query += ` AND s.id = ?`;
        params.push(roomId);
    }
    
    query += ` ORDER BY r.horaInicio`;
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error fetching day reservations:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'online', timestamp: new Date().toISOString() });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
});