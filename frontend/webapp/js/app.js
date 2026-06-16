// Configuração do servidor
const API_BASE_URL = '/api';

// Estado da app
let currentUser = null;
let isAdmin = false;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log('Frontend iniciado');
    checkLoginStatus();
    loadRooms();
    setupEventListeners();

    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('reservationDate');
    if (dateInput) {
        dateInput.value = today;
        dateInput.min = today;
    }
});

// Event listeners
function setupEventListeners() {
    const loginEmail = document.getElementById('loginEmail');
    if (loginEmail) {
        loginEmail.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') login();
        });
    }

    const reservationForm = document.getElementById('reservationForm');
    if (reservationForm) {
        reservationForm.addEventListener('submit', (e) => {
            e.preventDefault();
            createReservation();
        });
    }

    const roomForm = document.getElementById('roomForm');
    if (roomForm) {
        roomForm.addEventListener('submit', (e) => {
            e.preventDefault();
            registerRoom();
        });
    }

    const modal = document.getElementById('loginModal');
    if (modal) {
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeLoginModal();
            }
        });
    }
}

// Funções de login
function checkLoginStatus() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUIForLoggedUser();
        
        // Verifica se é admin
        checkAdminStatus(currentUser.email);
    }
}

function login() {
    const email = document.getElementById('loginEmail').value.trim();

    if (!email) {
        showToast('Digite um email valido', 'warning');
        return;
    }

    if (!email.includes('@') || !email.includes('.')) {
        showToast('Digite um email valido (ex: nome@dominio.com)', 'warning');
        return;
    }

    currentUser = { email: email };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    updateUIForLoggedUser();
    closeLoginModal();
    
    const userName = email.split('@')[0];
    showToast('Bem-vindo(a), ' + userName + '!', 'success');
    
    // Verifica se é admin
    checkAdminStatus(email);
    
    loadMyReservations();
}

function logout() {
    currentUser = null;
    isAdmin = false;
    localStorage.removeItem('currentUser');
    updateUIForLoggedUser();
    updateUIForAdmin();
    showToast('Logout realizado com sucesso', 'info');

    const container = document.getElementById('myReservationsContainer');
    if (container) {
        container.innerHTML = '<p class="text-muted">Faça login para ver suas reservas</p>';
    }
}

function updateUIForLoggedUser() {
    const userNameSpan = document.getElementById('userName');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (currentUser) {
        if (userNameSpan) {
            userNameSpan.textContent = 'Ola, ' + currentUser.email.split('@')[0] + '!';
            userNameSpan.style.display = 'inline';
        }
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
    } else {
        if (userNameSpan) userNameSpan.style.display = 'none';
        if (loginBtn) loginBtn.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'none';
    }
}

// ============================================
// FUNCOES DE ADMIN
// ============================================

async function checkAdminStatus(email) {
    console.log('Verificando admin para:', email);
    
    try {
        var response = await fetch(API_BASE_URL + '/user/' + encodeURIComponent(email) + '/isadmin');
        
        if (!response.ok) {
            console.error('Erro na resposta:', response.status);
            isAdmin = false;
            updateUIForAdmin();
            return false;
        }
        
        var data = await response.json();
        console.log('Resposta do servidor:', data);
        
        // VERIFICAÇÃO EXPLÍCITA
        if (data.isAdmin === true) {
            isAdmin = true;
            console.log('USUARIO E ADMIN!');
        } else {
            isAdmin = false;
            console.log('USUARIO NAO E ADMIN');
        }
        
        updateUIForAdmin();
        return isAdmin;
    } catch (error) {
        console.error('Erro ao verificar admin:', error);
        isAdmin = false;
        updateUIForAdmin();
        return false;
    }
}

function updateUIForAdmin() {
    console.log('Atualizando UI para admin:', isAdmin);
    
    // Procura todos os elementos com classe admin-only
    var adminElements = document.querySelectorAll('.admin-only');
    console.log('Elementos admin-only encontrados:', adminElements.length);
    
    adminElements.forEach(function(el) {
        if (isAdmin) {
            el.style.display = 'block';
            el.style.visibility = 'visible';
        } else {
            el.style.display = 'none';
            el.style.visibility = 'hidden';
        }
    });
}

function mostrarAbaAdminSeNecessario() {
    if (!isAdmin) return;
    
    console.log('Forcando exibicao da aba admin');
    
    // Tenta encontrar e mostrar o botão admin
    var adminBtn = document.querySelector('[data-tab="admin"]');
    if (adminBtn) {
        adminBtn.style.display = 'block';
        adminBtn.style.visibility = 'visible';
    }
    
    // Tenta encontrar e mostrar qualquer elemento admin-only
    var adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(function(el) {
        el.style.display = 'block';
        el.style.visibility = 'visible';
    });
}

// Função para mostrar o painel admin
function showAdminPanel() {
    if (!isAdmin) {
        showToast('Acesso negado!', 'error');
        return;
    }
    showTab('admin');
    listUsers();
}

// ============================================
// FUNCOES DE ADMIN - LISTAR USUARIOS
// ============================================

async function listUsers() {
    console.log('Listando usuarios...');
    
    if (!isAdmin) {
        showToast('Acesso negado!', 'error');
        return;
    }
    
    var container = document.getElementById('usersContainer');
    if (!container) {
        console.error('Container usersContainer nao encontrado');
        return;
    }
    
    container.innerHTML = '<div class="text-center"><div class="spinner"></div><p>Carregando usuarios...</p></div>';
    
    try {
        var response = await fetch(API_BASE_URL + '/admin/users?email=' + encodeURIComponent(currentUser.email));
        
        if (!response.ok) {
            var error = await response.json();
            showToast(error.error || 'Erro ao listar usuarios', 'error');
            container.innerHTML = '<p class="text-danger">Erro ao carregar</p>';
            return;
        }
        
        var users = await response.json();
        console.log('Usuarios encontrados:', users.length);
        
        if (users.length === 0) {
            container.innerHTML = '<p class="text-muted">Nenhum usuario cadastrado.</p>';
            return;
        }
        
        var html = '<div class="table-responsive"><table class="reservations-table"><thead><tr>';
        html += '<th>Nome</th><th>Email</th><th>Tipo</th><th>Acoes</th>';
        html += '</tr></thead><tbody>';
        
        users.forEach(function(user) {
            var nome = user.nome || user.email;
            var tipo = user.tipo || 'ALUNO';
            var tipoDisplay = tipo;
            if (tipo === 'ADMIN') tipoDisplay = 'Admin';
            else if (tipo === 'PROFESSOR') tipoDisplay = 'Professor';
            else tipoDisplay = 'Aluno';
            
            html += '<tr>';
            html += '<td>' + escapeHtml(nome) + '</td>';
            html += '<td>' + escapeHtml(user.email) + '</td>';
            html += '<td>' + tipoDisplay + '</td>';
            html += '<td>';
            
            if (tipo !== 'ADMIN') {
                html += '<button onclick="promoteUser(\'' + user.email + '\')" class="btn btn-primary btn-sm">Promover</button> ';
            }
            if (user.email !== currentUser.email) {
                html += '<button onclick="removeUser(\'' + user.email + '\')" class="btn btn-danger btn-sm">Remover</button>';
            }
            
            html += '</td></tr>';
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Erro ao listar usuarios:', error);
        container.innerHTML = '<p class="text-danger">Erro de conexao</p>';
        showToast('Erro de conexao ao listar usuarios', 'error');
    }
}

async function promoteUser(email) {
    if (!confirm('Promover ' + email + ' a administrador?')) return;
    
    try {
        var response = await fetch(API_BASE_URL + '/admin/promote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                adminEmail: currentUser.email,
                userEmail: email
            })
        });
        
        var result = await response.json();
        
        if (response.ok && result.success) {
            showToast('Usuario promovido com sucesso!', 'success');
            listUsers();
        } else {
            showToast(result.error || 'Erro ao promover', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro de conexao', 'error');
    }
}

async function removeUser(email) {
    if (!confirm('Tem certeza que deseja remover o usuario ' + email + '?')) return;
    
    try {
        var response = await fetch(API_BASE_URL + '/admin/users/' + encodeURIComponent(email) + '?adminEmail=' + encodeURIComponent(currentUser.email), {
            method: 'DELETE'
        });
        
        var result = await response.json();
        
        if (response.ok && result.success) {
            showToast('Usuario removido com sucesso!', 'success');
            listUsers();
        } else {
            showToast(result.error || 'Erro ao remover', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro de conexao', 'error');
    }
}

// ============================================
// FUNCOES DE SALAS (adaptadas)
// ============================================

async function loadRooms() {
    var container = document.getElementById('roomsContainer');
    if (!container) {
        console.error('Container roomsContainer nao encontrado');
        return;
    }

    container.innerHTML = '<div class="col-12 text-center"><div class="spinner"></div><p>Carregando salas...</p></div>';

    try {
        console.log('Buscando salas em:', API_BASE_URL + '/rooms');
        
        var response = await fetch(API_BASE_URL + '/rooms');

        if (!response.ok) {
            var errorText = await response.text();
            console.error('Erro HTTP:', response.status, errorText);
            throw new Error('HTTP ' + response.status + ': ' + response.statusText);
        }

        var rooms = await response.json();
        console.log('Salas carregadas:', rooms.length);

        if (!rooms || rooms.length === 0) {
            container.innerHTML = '<div class="col-12"><div class="alert alert-warning text-center">Nenhuma sala cadastrada ainda!</div></div>';
            return;
        }

        // Gerar HTML dos cards 
        var html = '';
        rooms.forEach(function(room) {
            var badgeClass = room.possuiComputadores ? 'badge-computer' : 'badge-no-computer';
            var badgeText = room.possuiComputadores ? 'Com Computadores' : 'Sem Computadores';
            
            html += '<div class="room-card-wrapper">';
            html += '  <div class="room-card">';
            html += '    <h4>' + escapeHtml(room.nome || 'Sala ' + room.id) + '</h4>';
            html += '    <div class="room-details">';
            html += '      <p><strong>Localizacao:</strong> ' + escapeHtml(room.localizacao || 'Nao informada') + '</p>';
            html += '      <p><strong>Tipo:</strong> ' + escapeHtml(room.tipo || 'Sala de Aula') + '</p>';
            html += '      <p><strong>ID:</strong> ' + escapeHtml(room.id) + '</p>';
            html += '    </div>';
            html += '    <div class="room-badge ' + badgeClass + '">' + badgeText + '</div>';
            
            if (currentUser) {
                html += '    <button class="btn btn-primary btn-sm w-100 mt-3" onclick="prepareReservation(\'' + room.id + '\')">Reservar</button>';
            } else {
                html += '    <button class="btn btn-secondary btn-sm w-100 mt-3" onclick="showLoginModal()">Faça login para reservar</button>';
            }
            
            html += '  </div>';
            html += '</div>';
        });
        
        container.innerHTML = html;

    } catch (error) {
        console.error('Erro ao carregar salas:', error);
        container.innerHTML = '<div class="col-12"><div class="alert alert-danger text-center">' +
                              'Erro ao conectar com o servidor<br>' +
                              '<small>Detalhe: ' + error.message + '</small><br><br>' +
                              '<button class="btn btn-primary btn-sm" onclick="loadRooms()">Tentar novamente</button>' +
                              '</div></div>';
    }
}

async function registerRoom() {
    var roomData = {
        id: document.getElementById('roomId').value.trim(),
        nome: document.getElementById('roomName').value.trim(),
        localizacao: document.getElementById('roomLocation').value.trim(),
        tipo: document.getElementById('roomType').value,
        possuiComputadores: document.getElementById('roomHasComputers').checked
    };

    if (!roomData.id || !roomData.nome || !roomData.localizacao) {
        showToast('Preencha ID, nome e localizacao da sala', 'warning');
        return;
    }

    try {
        var response = await fetch(API_BASE_URL + '/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(roomData)
        });

        var result = await response.json();

        if (response.ok && result.success) {
            showToast('Sala cadastrada com sucesso', 'success');
            document.getElementById('roomForm').reset();
            loadRooms();
            showTab('rooms');
        } else {
            showToast('ERRO: ' + (result.error || 'Falha ao cadastrar'), 'error');
        }

    } catch (error) {
        console.error('Erro: ', error);
        showToast('Erro de conexão com o servidor', 'error');
    }
}

// ============================================
// FUNCOES DE RESERVAS
// ============================================

function prepareReservation(roomId) {
    if (!currentUser) {
        showToast('Faça login para reservar uma sala', 'warning');
        showLoginModal();
        return;
    }

    var select = document.getElementById('reservationRoomId');
    if (select) {
        select.value = roomId;
    }

    showTab('newReservation');
}

async function loadRoomsForSelect() {
    var select = document.getElementById('reservationRoomId');
    if (!select) {
        console.warn('Select reservationRoomId nao encontrado');
        return;
    }

    select.innerHTML = '<option value="">Carregando...</option>';
    select.disabled = true;

    try {
        var response = await fetch(API_BASE_URL + '/rooms');
        
        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }
        
        var rooms = await response.json();
        
        if (!rooms || rooms.length === 0) {
            select.innerHTML = '<option value="">Nenhuma sala disponivel</option>';
            return;
        }

        select.innerHTML = '<option value="">Selecione uma sala...</option>';
        rooms.forEach(function(room) {
            var option = document.createElement('option');
            option.value = room.localizacao || room.id;
            option.textContent = room.nome + ' (' + (room.localizacao || room.id) + ')';
            select.appendChild(option);
        });

    } catch (error) {
        console.error('Erro ao carregar salas:', error);
        select.innerHTML = '<option value="">Erro ao carregar salas</option>';
    } finally {
        select.disabled = false;
    }
}

// ============================================
// FUNCOES DO CALENDARIO
// ============================================

async function loadCalendar() {
    var container = document.getElementById('calendarContainer');
    if (!container) {
        console.error('Container do calendario nao encontrado');
        return;
    }
    
    container.innerHTML = '<div class="text-center"><div class="spinner"></div><p>Carregando calendario...</p></div>';
    
    try {
        // Buscar todas as reservas
        var response = await fetch(API_BASE_URL + '/reservations');
        if (!response.ok) {
            throw new Error('Erro ao buscar reservas: ' + response.status);
        }
        
        var reservations = await response.json();
        console.log('Reservas carregadas:', reservations.length);
        
        // Buscar salas para o filtro
        var roomsResponse = await fetch(API_BASE_URL + '/rooms');
        var rooms = await roomsResponse.json();
        console.log('Salas carregadas:', rooms.length);
        
        // Popular filtro de salas
        var roomFilter = document.getElementById('calendarRoomFilter');
        if (roomFilter) {
            var currentValue = roomFilter.value;
            roomFilter.innerHTML = '<option value="">Todas as salas</option>';
            rooms.forEach(function(room) {
                var selected = (room.localizacao === currentValue) ? 'selected' : '';
                roomFilter.innerHTML += '<option value="' + room.localizacao + '" ' + selected + '>' + 
                                        room.nome + ' (' + room.localizacao + ')</option>';
            });
        }
        
        // Aplicar filtros
        var filteredReservations = reservations;
        
        // Filtro por sala
        var roomFilterValue = document.getElementById('calendarRoomFilter')?.value || '';
        if (roomFilterValue) {
            filteredReservations = filteredReservations.filter(function(r) {
                return r.localizacao === roomFilterValue || r.idSala === roomFilterValue;
            });
        }
        
        // Filtro por data
        var dateFilterValue = document.getElementById('calendarDateFilter')?.value || '';
        if (dateFilterValue) {
            filteredReservations = filteredReservations.filter(function(r) {
                return r.dataReserva === dateFilterValue;
            });
        }
        
        // Ordenar por data
        filteredReservations.sort(function(a, b) {
            return a.dataReserva.localeCompare(b.dataReserva) || a.horaInicio.localeCompare(b.horaInicio);
        });
        
        if (filteredReservations.length === 0) {
            container.innerHTML = '<div class="alert alert-info text-center">Nenhuma reserva encontrada para os filtros selecionados.</div>';
            return;
        }
        
        // Agrupar reservas por data
        var groupedReservations = {};
        filteredReservations.forEach(function(res) {
            var data = res.dataReserva;
            if (!groupedReservations[data]) {
                groupedReservations[data] = [];
            }
            groupedReservations[data].push(res);
        });
        
        // Gerar HTML do calendário
        var html = '';
        var datas = Object.keys(groupedReservations).sort();
        
        datas.forEach(function(data) {
            var reservasDoDia = groupedReservations[data];
            var dataFormatada = formatDate(data);
            var diaSemana = new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long' });
            
            html += '<div class="calendar-day">';
            html += '<div class="calendar-day-header">';
            html += '<h5>' + dataFormatada + ' - ' + diaSemana + '</h5>';
            html += '<span class="badge bg-primary">' + reservasDoDia.length + ' reserva(s)</span>';
            html += '</div>';
            html += '<div class="calendar-day-body">';
            
            // Ordenar reservas por hora
            reservasDoDia.sort(function(a, b) {
                return a.horaInicio.localeCompare(b.horaInicio);
            });
            
            reservasDoDia.forEach(function(res) {
                var sala = res.localizacao || res.idSala || 'Sala nao informada';
                var usuario = res.identificacaoCadastro || 'Usuario nao informado';
                
                html += '<div class="calendar-event">';
                html += '<div class="calendar-event-time">' + res.horaInicio + ' - ' + res.horaFim + '</div>';
                html += '<div class="calendar-event-info">';
                html += '<strong>' + sala + '</strong>';
                html += ' <span class="text-muted">por ' + usuario + '</span>';
                html += '</div>';
                html += '</div>';
            });
            
            html += '</div>';
            html += '</div>';
        });
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Erro ao carregar calendario:', error);
        container.innerHTML = '<div class="alert alert-danger">Erro ao carregar calendario: ' + error.message + '</div>';
    }
}

// Função para exibir a aba do calendário
function showCalendar() {
    showTab('calendar');
    // Aguardar um pouco para garantir que a aba foi renderizada
    setTimeout(function() {
        loadCalendar();
    }, 100);
}

async function createReservation() {
    if (!currentUser) {
        showToast('Faça login antes', 'warning');
        showLoginModal();
        return;
    }

    var roomId = document.getElementById('reservationRoomId').value;
    var date = document.getElementById('reservationDate').value;
    var startTime = document.getElementById('reservationStartTime').value;
    var endTime = document.getElementById('reservationEndTime').value;

    if (!roomId || !date || !startTime || !endTime) {
        showToast('Preencha todos os campos', 'warning');
        return;
    }

    if (startTime >= endTime) {
        showToast('O horário de inicio deve ser menor que o horario final', 'warning');
        return;
    }

    var reservation = {
        dataReserva: date,
        horaInicio: startTime,
        horaFim: endTime,
        localizacao: roomId,
        identificacaoCadastro: currentUser.email
    };

    var submitBtn = document.querySelector('#reservationForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Processando...';
    }

    try {
        var response = await fetch(API_BASE_URL + '/reservations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reservation)
        });

        var result = await response.json();

        if (response.ok && result.success) {
            showToast('Reserva realizada com sucesso!', 'success');
            resetReservationForm();
            loadMyReservations();
            loadRooms();
        } else {
            showToast(result.error || 'Falha na reserva', 'error');
        }
    } catch (error) {
        console.error('ERRO: ', error);
        showToast('Erro de conexão com o servidor', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Confirmar reserva';
        }
    }
}

async function loadMyReservations() {
    var container = document.getElementById('myReservationsContainer');

    if (!container) return;

    if (!currentUser) {
        container.innerHTML = '<p class="text-muted">Faça login para ver suas reservas</p>';
        return;
    }

    container.innerHTML = '<div class="text-center"><div class="spinner"></div><p>Carregando suas reservas...</p></div>';

    try {
        var response = await fetch(API_BASE_URL + '/reservations/user/' + encodeURIComponent(currentUser.email));
        var reservations = await response.json();

        if (!reservations || reservations.length === 0) {
            container.innerHTML = '<div class="alert alert-info text-center">Voce nao tem nenhuma reserva ainda.</div>';
            return;
        }

        reservations.sort(function(a, b) {
            return b.dataReserva.localeCompare(a.dataReserva);
        });

        var html = '<div class="table-responsive"><table class="reservations-table"><thead><tr>';
        html += '<th>Sala</th><th>Data</th><th>Horario</th><th>Status</th><th>Acoes</th>';
        html += '</tr></thead><tbody>';
        
        reservations.forEach(function(res) {
            html += '<tr>';
            html += '<td><strong>' + escapeHtml(res.localizacao || res.idSala) + '</strong></td>';
            html += '<td>' + formatDate(res.dataReserva) + '</td>';
            html += '<td>' + res.horaInicio + ' - ' + res.horaFim + '</td>';
            html += '<td><span class="status-active">Ativa</span></td>';
            html += '<td><button class="btn-cancel" onclick="cancelReservation(\'' + res.id + '\')">Cancelar</button></td>';
            html += '</tr>';
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('ERRO: ', error);
        container.innerHTML = '<p class="text-danger">Erro ao carregar reservas</p>';
    }
}

async function cancelReservation(reservationId) {
    if (!confirm('Tem certeza que deseja cancelar sua reserva?')) return;

    try {
        var response = await fetch(API_BASE_URL + '/reservations/' + reservationId, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast('Reserva cancelada com sucesso!', 'success');
            loadMyReservations();
            loadRooms();
        } else {
            var result = await response.json();
            showToast(result.error || 'Erro ao cancelar reserva', 'error');
        }
    } catch (error) {
        console.error('ERRO: ', error);
        showToast('Erro de conexão com o servidor', 'error');
    }
}

function resetReservationForm() {
    var form = document.getElementById('reservationForm');
    if (form) form.reset();
    var today = new Date().toISOString().split('T')[0];
    var dateInput = document.getElementById('reservationDate');
    if (dateInput) dateInput.value = today;
    var roomSelect = document.getElementById('reservationRoomId');
    if (roomSelect) roomSelect.value = '';
}

// ============================================
// FUNCOES DE UI
// ============================================

function showTab(tabName) {
    var tabMap = {
        'rooms': 'roomsTab',
        'myReservations': 'myReservationsTab',
        'newReservation': 'newReservationTab',
        'newRoom': 'newRoomTab',
        'calendar': 'calendarTab',  // ADICIONE ESTA LINHA
        'admin': 'adminTab'
    };

    // Esconder todas as abas
    for (var key in tabMap) {
        var element = document.getElementById(tabMap[key]);
        if (element) element.style.display = 'none';
    }

    // Mostrar a aba selecionada
    var selectedTab = document.getElementById(tabMap[tabName]);
    if (selectedTab) selectedTab.style.display = 'block';

    // Acoes especificas
    if (tabName === 'myReservations') {
        loadMyReservations();
    } else if (tabName === 'newReservation') {
        loadRoomsForSelect();
    } else if (tabName === 'calendar') {
        loadCalendar();  // ADICIONE ESTA LINHA
    } else if (tabName === 'admin') {
        if (isAdmin) {
            listUsers();
        } else {
            showToast('Acesso negado!', 'error');
            showTab('rooms');
        }
    }
}

function showLoginModal() {
    var modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'block';
        var emailInput = document.getElementById('loginEmail');
        if (emailInput) emailInput.focus();
    }
}

function closeLoginModal() {
    var modal = document.getElementById('loginModal');
    if (modal) modal.style.display = 'none';
}

function showToast(message, type) {
    type = type || 'info';
    
    var toast = document.getElementById('customToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'customToast';
        toast.className = 'toast-notification';
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.className = 'toast-notification toast-' + type;
    toast.style.display = 'block';

    setTimeout(function() {
        toast.style.display = 'none';
    }, 3000);
}

// ============================================
// FUNCOES UTILITARIAS
// ============================================

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    var parts = dateStr.split('-');
    if (parts.length === 3) {
        return parts[2] + '/' + parts[1] + '/' + parts[0];
    }
    return dateStr;
}

async function checkServerHealth() {
    try {
        var response = await fetch(API_BASE_URL + '/health');
        var data = await response.json();
        console.log('Servidor:', data);
        return data.status === 'online';
    } catch (error) {
        console.error('Servidor offline:', error);
        return false;
    }
}

// Verificar servidor ao carregar
setTimeout(function() {
    checkServerHealth().then(function(isOnline) {
        if (!isOnline) {
            showToast('Servidor nao esta online. Execute node server.js', 'warning');
        }
    });
}, 1000);