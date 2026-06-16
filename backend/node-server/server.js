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

// ============================================
// CONFIGURACAO - CAMINHOS 
// ============================================

// Caminho absoluto para o projeto
const projectRoot = path.join(__dirname, '../..');
const dbPath = path.join(projectRoot, 'database', 'bancoreservas_v2.db');
const frontendPath = path.join(projectRoot, 'frontend', 'webapp');

console.log('\n========================================');
console.log(' INICIANDO SERVIDOR');
console.log('========================================');
console.log(` Projeto: ${projectRoot}`);
console.log(` Banco: ${dbPath}`);
console.log(` Frontend: ${frontendPath}`);

// Verificar se o banco existe
if (!fs.existsSync(dbPath)) {
    console.error(` Banco nao encontrado em: ${dbPath}`);
    console.log(' Verificando banco na raiz...');
    
    // Tentar encontrar o banco em outros lugares
    const fallbackPaths = [
        path.join(projectRoot, 'bancoreservas_v2.db'),
        path.join(projectRoot, 'database', 'bancoreservas_v2.db'),
        path.join(projectRoot, 'backend', 'node-server', 'bancoreservas_v2.db')
    ];
    
    let found = false;
    for (const tryPath of fallbackPaths) {
        if (fs.existsSync(tryPath)) {
            console.log(` Banco encontrado em: ${tryPath}`);
            // Atualizar dbPath para o encontrado
            // Como dbPath é const, precisamos de uma variavel separada
            break;
        }
    }
    
    if (!found) {
        console.error(' Banco nao encontrado em nenhum local!');
        process.exit(1);
    }
}

// Conectar ao banco
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error(' Erro ao conectar:', err.message);
        process.exit(1);
    } else {
        console.log(' Conectado ao banco SQLite');
        
        // Verificar tabelas existentes
        db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
            if (!err && tables) {
                const tableNames = tables.map(t => t.name).join(', ');
                console.log(` Tabelas: ${tableNames || 'Nenhuma tabela encontrada'}`);
            }
        });
    }
});

// Servir frontend
if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath));
    console.log(` Frontend servido de: ${frontendPath}`);
} else {
    console.warn(` Frontend nao encontrado em: ${frontendPath}`);
    // Tentar caminho alternativo
    const altPath = path.join(projectRoot, 'webapp');
    if (fs.existsSync(altPath)) {
        app.use(express.static(altPath));
        console.log(` Frontend servido de: ${altPath}`);
    }
}

// ============================================
// ROTAS DA API
// ============================================

// Rota de teste
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'online', 
        timestamp: new Date().toISOString(),
        database: dbPath
    });
});

// Verificar se é admin
app.get('/api/user/:email/isadmin', (req, res) => {
    const email = req.params.email;
    console.log(` Verificando admin para: ${email}`);
    
    const sql = 'SELECT tipo FROM cadastro WHERE email = ?';
    
    db.get(sql, [email], (err, row) => {
        if (err) {
            console.error(' Erro na consulta:', err.message);
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            console.log(` Usuario nao encontrado: ${email}`);
            res.json({ isAdmin: false, exists: false });
            return;
        }
        const isAdmin = row.tipo && row.tipo.toUpperCase() === 'ADMIN';
        console.log(` Usuario ${email} e admin? ${isAdmin}`);
        res.json({ 
            isAdmin: isAdmin,
            tipo: row.tipo,
            exists: true 
        });
    });
});

// SALAS
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

// RESERVAS
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

app.post('/api/reservations', (req, res) => {
    const { id, dataReserva, horaInicio, horaFim, localizacao, idSala, identificacaoCadastro } = req.body;
    
    const salaLocalizacao = localizacao || idSala;
    
    if (!dataReserva || !horaInicio || !horaFim || !salaLocalizacao || !identificacaoCadastro) {
        return res.status(400).json({ error: 'Todos os campos sao obrigatorios' });
    }
    
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
                return res.status(409).json({ error: 'Horario ja reservado para esta sala' });
            }
            
            const reservationId = id || `RES${Date.now()}`;
            
            const insertSql = `INSERT INTO reserva (id, dataReserva, horaInicio, horaFim, localizacao, identificacaoCadastro) 
                              VALUES (?, ?, ?, ?, ?, ?)`;
            
            db.run(insertSql, [reservationId, dataReserva, horaInicio, horaFim, salaLocalizacao, identificacaoCadastro], 
                function(err) {
                    if (err) {
                        console.error('Erro ao criar reserva:', err);
                        return res.status(500).json({ error: err.message });
                    }
                    
                    res.json({ 
                        success: true, 
                        message: 'Reserva realizada com sucesso',
                        id: reservationId
                    });
                });
        });
});

app.delete('/api/reservations/:id', (req, res) => {
    const sql = 'DELETE FROM reserva WHERE id = ?';
    
    db.run(sql, [req.params.id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (this.changes === 0) {
            res.status(404).json({ error: 'Reserva nao encontrada' });
            return;
        }
        
        res.json({ success: true, message: 'Reserva cancelada com sucesso' });
    });
});

// ROTAS DE ADMIN
app.get('/api/admin/users', (req, res) => {
    const adminEmail = req.query.email;
    console.log('Listando usuarios para:', adminEmail);
    
    if (!adminEmail) {
        return res.status(400).json({ error: 'Email do administrador e obrigatorio' });
    }
    
    const checkSql = 'SELECT tipo FROM cadastro WHERE email = ?';
    
    db.get(checkSql, [adminEmail], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row || row.tipo !== 'ADMIN') {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
        }
        
        const sql = 'SELECT email, nome, tipo FROM cadastro ORDER BY nome';
        db.all(sql, [], (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        });
    });
});

app.post('/api/admin/promote', (req, res) => {
    const { adminEmail, userEmail } = req.body;
    
    const checkSql = 'SELECT tipo FROM cadastro WHERE email = ?';
    
    db.get(checkSql, [adminEmail], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row || row.tipo !== 'ADMIN') {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
        }
        
        const sql = 'UPDATE cadastro SET tipo = "ADMIN" WHERE email = ?';
        db.run(sql, [userEmail], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Usuario nao encontrado' });
            }
            res.json({ success: true, message: 'Usuario promovido a administrador' });
        });
    });
});

app.delete('/api/admin/users/:email', (req, res) => {
    const adminEmail = req.query.adminEmail;
    const userEmail = req.params.email;
    
    const checkSql = 'SELECT tipo FROM cadastro WHERE email = ?';
    
    db.get(checkSql, [adminEmail], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row || row.tipo !== 'ADMIN') {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
        }
        
        if (userEmail === adminEmail) {
            return res.status(400).json({ error: 'Voce nao pode remover a si mesmo' });
        }
        
        const sql = 'DELETE FROM cadastro WHERE email = ?';
        db.run(sql, [userEmail], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Usuario nao encontrado' });
            }
            res.json({ success: true, message: 'Usuario removido com sucesso' });
        });
    });
});

// Tratamento de erros
app.use((err, req, res, next) => {
    console.error('Erro nao tratado:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
});

// ============================================
// INICIAR SERVIDOR
// ============================================

function startServer(port) {
    const server = app.listen(port, () => {
        console.log('\n========================================');
        console.log(' SERVIDOR INICIADO COM SUCESSO!');
        console.log('========================================');
        console.log(` URL: http://localhost:${port}`);
        console.log(` Banco: ${dbPath}`);
        console.log(` Frontend: ${frontendPath}`);
        console.log('========================================\n');
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(` Porta ${port} ocupada. Tentando porta ${port + 1}...`);
            startServer(port + 1);
        } else {
            console.error(' Erro ao iniciar servidor:', err);
        }
    });
}

startServer(PORT);