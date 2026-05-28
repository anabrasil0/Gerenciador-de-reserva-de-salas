const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuração do projeto
const projectRoot = __dirname;
const dbPath = path.join(projectRoot, 'bancoreservas_v2.db');
const frontendPath = path.join(projectRoot, 'webapp');

console.log('\n========================================');
console.log('INICIANDO SERVIDOR');
console.log('========================================');

// Verificar banco
if (!fs.existsSync(dbPath)) {
    console.error('Banco de dados não encontrado!');
    process.exit(1);
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar:', err.message);
        process.exit(1);
    } else {
        console.log('Conectado ao banco SQLite');
    }
});

// Criar tabela reserva se não existir
db.run(`CREATE TABLE IF NOT EXISTS reserva (
    id TEXT PRIMARY KEY,
    dataReserva TEXT NOT NULL,
    horaInicio TEXT NOT NULL,
    horaFim TEXT NOT NULL,
    localizacao TEXT NOT NULL,
    identificacaoCadastro TEXT NOT NULL
)`, (err) => {
    if (err) {
        console.error('Erro ao criar tabela reserva:', err.message);
    } else {
        console.log('Tabela reserva verificada/criada');
    }
});

// Servir frontend
if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath));
    console.log(`Frontend: ${frontendPath}`);
} else {
    console.warn(` Frontend não encontrado`);
}

// ROTAS DA API

// Rota de teste
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'online', 
        timestamp: new Date().toISOString()
    });
});

// SALAS - GET
app.get('/api/rooms', (req, res) => {
    const sql = 'SELECT id, localizacao, tipo, possuiComputadores FROM sala ORDER BY localizacao';
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar salas:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        
        const adaptedRows = rows.map(row => ({
            id: row.id.toString(),
            nome: row.localizacao,
            localizacao: row.localizacao,
            tipo: row.tipo,
            possuiComputadores: row.possuiComputadores === 1
        }));
        
        res.json(adaptedRows);
    });
});

// SALAS - POST
app.post('/api/rooms', (req, res) => {
    const { nome, localizacao, tipo, possuiComputadores } = req.body;
    
    const salaLocalizacao = localizacao || nome;
    
    if (!salaLocalizacao) {
        res.status(400).json({ error: 'Localização da sala é obrigatória' });
        return;
    }
    
    db.get('SELECT MAX(id) as maxId FROM sala', [], (err, result) => {
        const novoId = (result?.maxId || 0) + 1;
        
        const sql = `INSERT INTO sala (id, localizacao, tipo, possuiComputadores) 
                     VALUES (?, ?, ?, ?)`;
        
        db.run(sql, [novoId, salaLocalizacao, tipo || 'sala de aula', possuiComputadores ? 1 : 0], function(err) {
            if (err) {
                console.error('Erro ao cadastrar sala:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ success: true, message: 'Sala cadastrada com sucesso', id: novoId.toString() });
        });
    });
});

// RESERVAS - GET
app.get('/api/reservations', (req, res) => {
    const sql = 'SELECT * FROM reserva ORDER BY dataReserva DESC, horaInicio';
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// RESERVAS - GET por usuário
app.get('/api/reservations/user/:email', (req, res) => {
    const sql = 'SELECT * FROM reserva WHERE identificacaoCadastro = ? ORDER BY dataReserva DESC, horaInicio';
    
    db.all(sql, [req.params.email], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

//ORGANIZAÇÃO CALENDÁRIO
//pega reservas para mês/sala específico
app.get('/api/calendar/reservations', (req, res) => {
    const { ano, mes, idSala} = req.query;

    if (!ano || !mes) {
        return res.status(400).json({erro: 'ano e mês são obrigatórios'});
    }

    //constrói dados mês
    const startDate = `${ano}-${String(mes).padStart(2, '0')}-01`;
    const lastDate = new Date(parseInt(ano), parseInt(mes), 0).getDate();
    const endDate = `${ano}-${String(mes).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    let query =
    `
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

    if(idSala && idSala != 'all') {
        query += ` AND s.id = ?`;
        params.push(idSala);
    }

    query += ' ORDER BY r.dataReserva, r.horaInicio';

    db.all(query, params, (err, rows) => {
        if(err) {
            console.error('Erro na busca de informações do calendário', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
});

//busca reservas para sala e dia específico
app.get('/api/calendar/day/:date', (req, res) => {
    const { date } = req.params;
    const {idSala} = res.query;

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

    if(idSala && idSala != 'all') {
        query += ' AND s.id = ?';
        params.push(idSala);
    }

    query += ' ORDER BY r.horaInicio';

    db.all(query, params, (err, rows) => {
        if(err) {
            console.error('Erro na busca de informações do calendário', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
});

//busca disponibilidade de sala para uma data específica
app.get('/api/rooms/:idSala/disponivel', (res, res) => {
    const { idSala } = req.params;
    const { date } = req.query;

    if(!date) {
        return res.status(400).json({ error: 'Data é obrigatória'});
    }

    const query = `
        SELECT horaInicio, horaFim
        FROM reservas r
        JOIN salas s ON r.localizacao = s.localizacao
        WHERE s.id = ? AND r.dataReserva = ?
        ORDER BY r.horaInicio
    `;

    db.all(query, [idSala, date], (err, rows) => {
        if(err) {
            console.error('Erro na busca por disponibilidade', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
});
//FIM CALENDÁRIO


// RESERVAS - POST
app.post('/api/reservations', (req, res) => {
    console.log('\nRecebida requisição de reserva:');
    console.log('Body:', req.body);
    
    const { id, dataReserva, horaInicio, horaFim, localizacao, idSala, identificacaoCadastro } = req.body;
    
    // Compatibilidade: pode vir como localizacao ou idSala
    const salaLocalizacao = localizacao || idSala;
    
    // Validação completa
    if (!dataReserva) {
        return res.status(400).json({ error: 'Data da reserva é obrigatória' });
    }
    if (!horaInicio) {
        return res.status(400).json({ error: 'Hora de início é obrigatória' });
    }
    if (!horaFim) {
        return res.status(400).json({ error: 'Hora de fim é obrigatória' });
    }
    if (!salaLocalizacao) {
        return res.status(400).json({ error: 'Sala/localização é obrigatória' });
    }
    if (!identificacaoCadastro) {
        return res.status(400).json({ error: 'Identificação do usuário é obrigatória' });
    }
    
    // Validar formato da data (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dataReserva)) {
        return res.status(400).json({ error: 'Formato de data inválido. Use YYYY-MM-DD' });
    }
    
    // Validar formato da hora (HH:MM)
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(horaInicio) || !timeRegex.test(horaFim)) {
        return res.status(400).json({ error: 'Formato de hora inválido. Use HH:MM' });
    }
    
    // Validar que horaFim > horaInicio
    if (horaInicio >= horaFim) {
        return res.status(400).json({ error: 'Horário de fim deve ser maior que horário de início' });
    }
    
    // Verificar se a sala existe
    db.get('SELECT * FROM sala WHERE localizacao = ?', [salaLocalizacao], (err, sala) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!sala) {
            return res.status(404).json({ error: `Sala "${salaLocalizacao}" não encontrada` });
        }
        
        // Verificar conflito de horário
        const conflictSql = `SELECT COUNT(*) as count FROM reserva 
                            WHERE localizacao = ? 
                            AND dataReserva = ? 
                            AND (
                                (horaInicio < ? AND horaFim > ?) OR
                                (horaInicio >= ? AND horaInicio < ?) OR
                                (horaFim > ? AND horaFim <= ?)
                            )`;
        
        db.get(conflictSql, [salaLocalizacao, dataReserva, horaFim, horaInicio, horaInicio, horaFim, horaInicio, horaFim], 
            (err, result) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                if (result.count > 0) {
                    return res.status(409).json({ error: 'Horário já reservado para esta sala' });
                }
                
                // Gerar ID único
                const reservationId = id || `RES${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
                
                const insertSql = `INSERT INTO reserva (id, dataReserva, horaInicio, horaFim, localizacao, identificacaoCadastro) 
                                  VALUES (?, ?, ?, ?, ?, ?)`;
                
                db.run(insertSql, [reservationId, dataReserva, horaInicio, horaFim, salaLocalizacao, identificacaoCadastro], 
                    function(err) {
                        if (err) {
                            console.error('Erro ao criar reserva:', err);
                            return res.status(500).json({ error: err.message });
                        }
                        
                        console.log(`✅ Reserva criada: ${reservationId}`);
                        res.json({ 
                            success: true, 
                            message: 'Reserva realizada com sucesso',
                            id: reservationId
                        });
                    });
            });
    });
});

// RESERVAS - DELETE
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

// Tratamento de erros
app.use((err, req, res, next) => {
    console.error('Erro não tratado:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log('\n========================================');
    console.log('SERVIDOR INICIADO COM SUCESSO!');
    console.log('========================================');
    console.log(`URL: http://localhost:${PORT}`);
    console.log(` Banco: ${dbPath}`);
    console.log(`Frontend: ${frontendPath}`);
    console.log('========================================\n');
    
    // Mostrar salas disponíveis
    db.all('SELECT id, localizacao, tipo FROM sala', [], (err, rows) => {
        if (!err && rows && rows.length > 0) {
            console.log('Salas disponíveis:');
            rows.forEach(row => {
                console.log(`   ${row.id}. ${row.localizacao} (${row.tipo})`);
            });
        } else {
            console.log('Nenhuma sala cadastrada ainda');
        }
        console.log('');
    });
});