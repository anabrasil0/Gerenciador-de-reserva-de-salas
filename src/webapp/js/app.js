// Configuração do servidor
const API_BASE_URL = 'http://localhost:3000/api';

// Estado da app
let currentUser = null;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log('Frontend iniciado');
    checkLoginStatus();
    loadRooms();
    setupEventListeners();

    // Data mínima para reserva (hoje)
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('reservationDate');
    if (dateInput) {
        dateInput.value = today;
        dateInput.min = today;
    }
});

// Event listeners
function setupEventListeners() {
    // Login com enter
    const loginEmail = document.getElementById('loginEmail');
    if (loginEmail) {
        loginEmail.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') login();
        });
    }

    // Formulário de reserva
    const reservationForm = document.getElementById('reservationForm');
    if (reservationForm) {
        reservationForm.addEventListener('submit', (e) => {
            e.preventDefault();
            createReservation();
        });
    }

    // Formulário de cadastro de sala
    const roomForm = document.getElementById('roomForm');
    if (roomForm) {
        roomForm.addEventListener('submit', (e) => {
            e.preventDefault();
            registerRoom();
        });
    }

    // Fechar modal ao clicar fora
    const modal = document.getElementById('loginModal');
    if (modal) {
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeLoginModal();
            }
        });
    }
}

// Funções de login com localStorage
function checkLoginStatus() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUIForLoggedUser();

        if (document.getElementById('myReservationsTab') && 
            document.getElementById('myReservationsTab').style.display !== 'none') {
            loadMyReservations();
        }
    }
}

function login() {
    const email = document.getElementById('loginEmail').value.trim();

    if (!email) {
        showToast('Digite um email válido', 'warning');
        return;
    }

    // Validação de email corrigida
    if (!email.includes('@') || !email.includes('.')) {
        showToast('Digite um email válido (ex: nome@dominio.com)', 'warning');
        return;
    }

    currentUser = { email: email };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    updateUIForLoggedUser();
    closeLoginModal();
    const userName = email.split('@')[0];
    showToast(`Bem-vindo(a), ${userName}!`, 'success');

    loadMyReservations();
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    updateUIForLoggedUser();
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
            userNameSpan.textContent = `Olá, ${currentUser.email.split('@')[0]}!`;
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

// Funções de salas com API node
async function loadRooms() {
    const container = document.getElementById('roomsContainer');
    if (!container) return;

    container.innerHTML = `
        <div class="col-12 text-center">
            <div class="spinner"></div>
            <p>Carregando salas...</p>
        </div>`;

    try {
        console.log(`Buscando salas em: ${API_BASE_URL}/rooms`);

        const response = await fetch(`${API_BASE_URL}/rooms`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const rooms = await response.json();
        console.log(`Recebidas ${rooms.length} salas`);

        if (!rooms || rooms.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-warning text-center">
                        Nenhuma sala cadastrada ainda!
                        <br><br>
                        <button class="btn btn-primary btn-sm" onclick="showTab('newRoom')">
                            Cadastrar Primeira Sala
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = rooms.map(room => `
            <div class="col-md-4 col-lg-3">
                <div class="room-card">
                    <h4>${escapeHtml(room.nome || 'Sala ' + room.id)}</h4>
                    <p><strong>Localização:</strong> ${escapeHtml(room.localizacao || 'Não informada')}</p>
                    <p><strong>Tipo:</strong> ${escapeHtml(room.tipo || 'Sala de Aula')}</p>
                    <p><strong>ID:</strong> ${escapeHtml(room.id)}</p>
                    <div class="mb-2">
                        <span class="room-badge ${room.possuiComputadores ? 'badge-computer' : 'badge-no-computer'}">
                            ${room.possuiComputadores ? 'Com Computadores' : 'Sem Computadores'}
                        </span>
                    </div>
                    ${currentUser ? `
                        <button class="btn btn-primary btn-sm w-100 mt-2" onclick="prepareReservation('${room.id}')">
                            Reservar
                        </button>
                    ` : `
                        <button class="btn btn-secondary btn-sm w-100 mt-2" onclick="showLoginModal()">
                            Faça login para reservar
                        </button>
                    `}
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Erro ao carregar salas:', error);
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger text-center">
                    Erro ao conectar com o servidor<br>
                    <small>Detalhe: ${error.message}</small>
                    <br><br>
                    <button class="btn btn-primary btn-sm" onclick="loadRooms()">
                        Tentar novamente
                    </button>
                </div>
            </div>
        `;
    }
}

async function registerRoom() {
    const roomData = {
        id: document.getElementById('roomId').value.trim(),
        nome: document.getElementById('roomName').value.trim(),
        localizacao: document.getElementById('roomLocation').value.trim(),
        tipo: document.getElementById('roomType').value,
        possuiComputadores: document.getElementById('roomHasComputers').checked
    };

    if (!roomData.id || !roomData.nome || !roomData.localizacao) {
        showToast('Preencha ID, nome e localização da sala', 'warning');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/rooms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(roomData)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showToast('Sala cadastrada com sucesso', 'success');
            document.getElementById('roomForm').reset();
            loadRooms();
            showTab('rooms'); // Volta para a aba de salas
        } else {
            showToast('ERRO: ' + (result.error || 'Falha ao cadastrar'), 'error');
        }

    } catch (error) {
        console.error('Erro: ', error);
        showToast('Erro de conexão com o servidor', 'error');
    }
}

// Funções de reservas
function prepareReservation(roomId) {
    if (!currentUser) {
        showToast('Faça login para reservar uma sala', 'warning');
        showLoginModal();
        return;
    }

    const select = document.getElementById('reservationRoomId');
    if (select) {
        select.value = roomId;
    }

    showTab('newReservation');
    document.getElementById('newReservationTab').scrollIntoView({ behavior: 'smooth' });
}

async function loadRoomsForSelect() {
    try {
        const response = await fetch(`${API_BASE_URL}/rooms`);
        const rooms = await response.json();
        const select = document.getElementById('reservationRoomId');

        if (select) {
            select.innerHTML = '<option value="">Selecione uma sala...</option>';
            rooms.forEach(room => {
                select.innerHTML += `<option value="${room.id}">${room.nome} (${room.localizacao})</option>`;
            });
        }
    } catch (error) {
        console.error('Erro ao carregar salas', error);
    }
}

async function createReservation() {
    if (!currentUser) {
        showToast('Faça login antes', 'warning');
        showLoginModal();
        return;
    }

    const roomId = document.getElementById('reservationRoomId').value;
    const date = document.getElementById('reservationDate').value;
    const startTime = document.getElementById('reservationStartTime').value;
    const endTime = document.getElementById('reservationEndTime').value;

    if (!roomId || !date || !startTime || !endTime) {
        showToast('Preencha todos os campos', 'warning');
        return;
    }

    if (startTime >= endTime) {
        showToast('O horário de início deve ser menor que o horário final', 'warning');
        return;
    }

    const reservation = {
        dataReserva: date,
        horaInicio: startTime,
        horaFim: endTime,
        idSala: roomId,
        identificacaoCadastro: currentUser.email
    };

    const submitBtn = document.querySelector('#reservationForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.innerHTML = 'Processando...';
        submitBtn.disabled = true;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/reservations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reservation)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showToast('Reserva realizada com sucesso!', 'success');
            resetReservationForm();
            loadMyReservations();
        } else {
            showToast(result.error || 'Falha na reserva', 'error');
        }
    } catch (error) {
        console.error('ERRO: ', error);
        showToast('Erro de conexão com o servidor', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.innerHTML = 'Confirmar reserva';
            submitBtn.disabled = false;
        }
    }
}

async function loadMyReservations() {
    const container = document.getElementById('myReservationsContainer');

    if (!container) return;

    if (!currentUser) {
        container.innerHTML = '<p class="text-muted">Faça login para ver suas reservas</p>';
        return;
    }

    container.innerHTML = `
        <div class="text-center">
            <div class="spinner"></div>
            <p>Carregando suas reservas...</p>
        </div>`;

    try {
        const response = await fetch(`${API_BASE_URL}/reservations/user/${encodeURIComponent(currentUser.email)}`);
        const reservations = await response.json();

        if (!reservations || reservations.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info text-center">
                    Você não tem nenhuma reserva ainda.
                    <br><br>
                    <button class="btn btn-primary btn-sm" onclick="showTab('newReservation')">
                        Fazer Primeira Reserva
                    </button>
                </div>`;
            return;
        }

        reservations.sort((a, b) => b.dataReserva.localeCompare(a.dataReserva));

        container.innerHTML = `
            <div class="table-responsive">
                <table class="reservations-table">
                    <thead>
                        <tr>
                            <th>Sala</th>
                            <th>Data</th>
                            <th>Horário</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reservations.map(res => `
                            <tr>
                                <td><strong>${escapeHtml(res.idSala)}</strong></td>
                                <td>${formatDate(res.dataReserva)}</td>
                                <td>${res.horaInicio} - ${res.horaFim}</td>
                                <td><span class="status-active">Ativa</span></td>
                                <td>
                                    <button class="btn-cancel" onclick="cancelReservation('${res.id}')">
                                        Cancelar
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`;
    } catch (error) {
        console.error('ERRO: ', error);
        container.innerHTML = '<p class="text-danger">Erro ao carregar reservas</p>';
    }
}

async function cancelReservation(reservationId) {
    if (!confirm('Tem certeza que deseja cancelar sua reserva?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/reservations/${reservationId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast('Reserva cancelada com sucesso!', 'success');
            loadMyReservations();
            loadRooms();
        } else {
            const result = await response.json();
            showToast(result.error || 'Erro ao cancelar reserva', 'error');
        }
    } catch (error) {
        console.error('ERRO: ', error);
        showToast('Erro de conexão com o servidor', 'error');
    }
}

function resetReservationForm() {
    const form = document.getElementById('reservationForm');
    if (form) form.reset();
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('reservationDate');
    if (dateInput) dateInput.value = today;
    const roomSelect = document.getElementById('reservationRoomId');
    if (roomSelect) roomSelect.value = '';
}

// Funções de UI
function showTab(tabName) {
    const tabMap = {
        'rooms': 'roomsTab',
        'myReservations': 'myReservationsTab',
        'newReservation': 'newReservationTab',
        'newRoom': 'newRoomTab'
    };

    // Esconder todas as abas
    Object.values(tabMap).forEach(tabId => {
        const element = document.getElementById(tabId);
        if (element) element.style.display = 'none';
    });

    // Mostrar a aba selecionada
    const selectedTab = document.getElementById(tabMap[tabName]);
    if (selectedTab) selectedTab.style.display = 'block';

    // Ações específicas
    if (tabName === 'myReservations') {
        loadMyReservations();
    } else if (tabName === 'newReservation') {
        loadRoomsForSelect();
    }
}

function showLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'block';
        const emailInput = document.getElementById('loginEmail');
        if (emailInput) emailInput.focus();
    }
}

function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.style.display = 'none';
}

function showToast(message, type = 'info') {
    let toast = document.getElementById('customToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'customToast';
        toast.className = 'toast-notification';
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.className = `toast-notification toast-${type}`;
    toast.style.display = 'block';

    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// Funções utilitárias
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
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
}

async function checkServerHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();
        console.log('Servidor:', data);
        return data.status === 'online';
    } catch (error) {
        console.error('Servidor offline:', error);
        return false;
    }
}

// Verificar servidor ao carregar
setTimeout(async () => {
    const isOnline = await checkServerHealth();
    if (!isOnline) {
        showToast('Servidor não está online. Execute node server.js', 'warning');
    }
}, 1000);