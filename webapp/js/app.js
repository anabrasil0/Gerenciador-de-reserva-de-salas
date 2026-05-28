const { response } = require("express");

// Configuração do servidor
const API_BASE_URL = 'http://localhost:3000/api';

// Estado da app
let currentUser = null;
let currentCalendarDate = new Date();
let currentCalendarReservations = [];

// INICIALIZAÇÃO
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

// EVENT LISTENERS
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

// FUNÇÕES DE LOGIN
function checkLoginStatus() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUIForLoggedUser();
        
        // Verificar se precisa carregar reservas
        const myReservationsTab = document.getElementById('myReservationsTab');
        if (myReservationsTab && myReservationsTab.style.display !== 'none') {
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

    // Validação de email melhorada
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

    // Recarregar reservas
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

// FUNÇÕES DE SALAS
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
                    <br><br>
                    <small>Verifique se o servidor Node está rodando em ${API_BASE_URL}</small>
                </div>
            </div>
        `;
    }
}

async function registerRoom() {
    const roomData = {
        id: document.getElementById('roomId').value.trim(),
        localizacao: document.getElementById('roomLocation').value.trim(),
        tipo: document.getElementById('roomType').value,
        possuiComputadores: document.getElementById('roomHasComputers').checked
    };

    if (!roomData.id || !roomData.nome || !roomData.localizacao) {
        showToast('Preencha ID, nome e localização da sala', 'warning');
        return;
    }

    // Botão loading
    const submitBtn = document.querySelector('#roomForm button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = 'Cadastrando...';
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/rooms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(roomData)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showToast('Sala cadastrada com sucesso!', 'success');
            document.getElementById('roomForm').reset();
            loadRooms(); // Recarregar lista
            showTab('rooms'); // Volta para a aba de salas
        } else {
            showToast('ERRO: ' + (result.error || 'Falha ao cadastrar'), 'error');
        }

    } catch (error) {
        console.error('Erro: ', error);
        showToast('Erro de conexão com o servidor', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// FUNÇÕES DE RESERVAS
function prepareReservation(roomId) {
    if (!currentUser) {
        showToast('Faça login para reservar uma sala', 'warning');
        showLoginModal();
        return;
    }

    showTab('newReservation');

    //preenche com ID sala
    setTimeout(async ()=> {
        await loadRoomsForSelect();
        const select = document.getElementById('reservationRoomId');
        if(select) {
            //busca a localização da sala usando o ID
             try {
                const response = await fetch(`${API_BASE_URL}/rooms`);
                const rooms = await response.json();
                const room = rooms.find(r => r.id === roomId);
                if (room) {
                    select.value = room.localizacao;
                }
            } catch (error) {
                console.error('Erro ao buscar sala:', error);
            }
        }
    }, 100);
    
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
                select.innerHTML += `<option value="${room.localizacao}">${room.nome} (${room.localizacao})</option>`;
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

    // Pegar os valores do formulário
    const localizacao = document.getElementById('reservationRoomId').value;
    const date = document.getElementById('reservationDate').value;
    const startTime = document.getElementById('reservationStartTime').value;
    const endTime = document.getElementById('reservationEndTime').value;

    // Log para debug
    console.log('Dados da reserva:', { localizacao, date, startTime, endTime, currentUser });

    if (!localizacao || !date || !startTime || !endTime) {
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
        localizacao: localizacao,  
        identificacaoCadastro: currentUser.email
    };

    const submitBtn = document.querySelector('#reservationForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Processando...';
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
        console.log('Resposta do servidor:', result);

        if (response.ok && result.success) {
            showToast('Reserva realizada com sucesso!', 'success');
            resetReservationForm();
            loadMyReservations();
            loadRooms();
            if(document.getElementById('calendarTab').style.display !== 'none') {
                loadCalendar();
            }
        } else {
            showToast(result.error || 'Falha na reserva', 'error');
        }
    } catch (error) {
        console.error('ERRO:', error);
        showToast('Erro de conexão com o servidor: ' + error.message, 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Confirmar reserva';
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

        // Ordenar por data (mais recente primeiro)
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
                                <td><span class="badge bg-success">Ativa</span></td>
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
            loadRooms(); // Recarregar salas para atualizar disponibilidade
            if(document.getElementById('calendarTab').style.display !== 'none') {
                loadCalendar();
            }
        } else {
            const result = await response.json();
            showToast('ERRO' + (result.error || 'Erro ao cancelar reserva'), 'error');
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

//FUNÇÕES DO CALENDÁRIO 
async function loadCalendar() {
    const container = document.getElementById('calendarContainer');
    if(!container) return;

    const roomFilter= document.getElementById('calendarRoomFilter');
    const selectedRoom = roomFilter ? roomFilter.value : 'all';

    container.innerHTML = `
        <div class="loading-calendar">
            <div class="spinner"></div>
            <p>Carregando calendário...</p>
        </div>`;

    try {
        const year = currentCalendarDate.getFullYear();
        const month = currentCalendarDate.getMonth() + 1;

        let url = `${API_BASE_URL}/calendar/reservations?year=${year}&month=${month}`;

        if(selectedRoom !== 'all') {
            url +=  `&roomId=${selectedRoom}`;
        }

        const response = await fetch(url);

        if(!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const reservations = await response.json();
        currentCalendarReservations = reservations;

        renderCalendar(year, month, reservations);
    }catch (error) {
        console.error('Error loading calendar:', error);
        container.innerHTML = '<p class="text-danger">Erro ao carregar calendário. Verifique o status do servidor. </p>';
    }
}

function renderCalendar(year,month, reservations) {
    const container = document.getElementById('calendarContainer');
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    let startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    //ajuste para colocar segunda como o primeiro dia da semana
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    const prevMonthLastDay = new Date(year, month - 1, 0).getDate();

    let calendarHTML = `
        <div class="calendar-container">
            <div class="calendar-header">
                <h3>${getMonthName(month)} ${year}</h3>
                <div class="calendar-nav">
                    <button onclick="changeMonth(-1)">◀ Mês anterior</button>
                    <button onclick="changeMonth(0)">📅 Hoje</button>
                    <button onclick="changeMonth(1)">Próximo mês ▶</button>
                </div>
            </div>
            <div class="calendar-grid">
    `;

    const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    weekdays.forEach(day => {
        calendarHTML += '<div class="calendar-weekday">${day}</div>';
    });

    let nextMonthCounter = 1;
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month -1;
    const currentDay = today.getDate();

    //dias do mês anterior
    for (let i = 0; i < startDayOfWeek; i++) {
        const prevMonthDay = prevMonthLastDay - startDayOfWeek + i + 1;
        calendarHTML += `
            <div class="calendar-day other-month">
                <div class="day-number">${prevMonthDay}</div>
            </div>
        `;
    }

    //dias do mês atual
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayReservations = reservations.filter(r => r.dataReserva === dateStr);

        const isToday = isCurrentMonth && day === currentDay;
        const todayClass = isToday ? 'today' : '';

        calendarHTML += `
            <div class="calendar-day ${todayClass}" onclick="showDayReservations('${dateStr}')">
                <div class="day-number">${day}</div>
        `;

        dayReservations.slice(0, 2).forEach(res => {
            const isOwnReservation = currentUser && currentUser.email === res.identificacaoCadastro;
            const ownClass = isOwnReservation ? 'own reservation' : '';
            const timeRange =  `${res.horaInicio.substring(0,5)}-${res.horaFim.substring(0,5)}`;
            
            calendarHTML += `
                <div class="reservation-indicator ${ownClass}" onclick="event.stopPropagation(); showReservationDetail(${JSON.stringify(res).replace(/"/g, '&quot;')})">
                    ${timeRange} ${res.localizacao}
                </div>
            `;
        });

        if(dayReservations.length > 2) {
            calendarHTML += `
                <div class="more-indicator" onclick="event.stopPropagation(); showDayReservations('${dateStr}')">
                    +${dayReservations.length - 2} mais...
                </div>
            `;
        }

        calendarHTML += '</div>';
    }

    //dias do próximo mês
    const totalDaysShown = startDayOfWeek + daysInMonth;
    const remainingCells = 42 - totalDaysShown;
    for (let i = 1; i <= remainingCells; i++) {
         calendarHTML += `
            <div class="calendar-day other-month">
                <div class="day-number">${nextMonthCounter++}</div>
            </div>
        `;
    }

    calendarHTML += `
            </div>
        </div>
    `;

    container.innerHTML = calendarHTML;
}

function changeMonth(delta) {
    if (delta === 0) {
        currentCalendarDate = new Date();
    } else {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
    }
    loadCalendar();
}

async function showDayReservations(dateStr) {
    const roomFilter = document.getElementById('calendarRoomFilter');
    const selectedRoom = roomFilter ? roomFilter.value : 'all';

    try {
        let url = `${API_BASE_URL}/calendar/day/${dateStr}`;
        if(selectedRoom !== 'all') {
            url += `?roomId=${selectedRoom}`;
        }

        const response = await fetch(url);
        const reservations = await response.json();

        if(!reservations || reservations.length === 0) {
            showToast(`Nenhuma reserva para ${formatDate(dateStr)}`, 'info');
            return;
        }

        const modalBody = document.getElementById('reservationDetailBody');
        const formattedDate = formatDate(dateStr);

        modalBody.innerHTML = `
            <h4>Reservas do dia ${formattedDate}</h4>
            <div class="day-reservations-list">
                ${reservations.map(res => {
                    const isOwnReservation = currentUser && currentUser.email === res.identificacaoCadastro;
                    return `
                        <div style="border-bottom: 1px solid #dee2e6; padding: 10px 0;">
                            <p><strong>Sala:</strong> ${escapeHtml(res.localizacao)}</p>
                            <p><strong>Horário:</strong> ${res.horaInicio.substring(0,5)} - ${res.horaFim.substring(0,5)}</p>
                            <p><strong>Reservado por:</strong> ${escapeHtml(res.identificacaoCadastro)}</p>
                            ${isOwnReservation ? `
                                <button class="btn btn-danger btn-sm mt-2" onclick="cancelReservation('${res.id}'); closeReservationDetail();">
                                    Cancelar minha reserva
                                </button>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        document.getElementById('reservationDetailModal').style.display = 'flex';
    }catch (error) {
        console.error('Error loading day reservations:', error);
        showToast('Erro ao carregar as reservas do dia', 'error');
    }
}

function showReservationDetail(reservation) {
    const modalBody = document.getElementById('reservationDetailBody');
    const isOwnReservation = currentUser && currentUser.email === reservation.identificacaoCadastro;

    modalBody.innerHTML = `
        <div class="reservation-detail">
            <p><strong>Sala:</strong> ${escapeHtml(reservation.localizacao)}</p>
            <p><strong>Data:</strong> ${formatDate(reservation.dataReserva)}</p>
            <p><strong>Horário:</strong> ${reservation.horaInicio.substring(0,5)} - ${reservation.horaFim.substring(0,5)}</p>
            <p><strong>Reservado por:</strong> ${escapeHtml(reservation.identificacaoCadastro)}</p>
            <p><strong>Tipo da sala:</strong> ${escapeHtml(reservation.sala_tipo || 'Não informado')}</p>
            ${isOwnReservation ? `
                <hr>
                <button class="btn btn-danger btn-sm w-100" onclick="cancelReservation('${reservation.id}'); closeReservationDetail();">
                    Cancelar minha reserva
                </button>
            ` : ''}
        </div>
    `;

    document.getElementById('reservationDetailModal').style.display= 'flex';
}

function closeReservationDetail() {
    document.getElementById('reservationDetailModal').style.display='none';
}

function getMonthName(month) {
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho','Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return months[month - 1];
}

async function loadRoomsForCalendarFilter() {
    try {
        const response = await fetch (`${API_BASE_URL}/rooms`);

        if(!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const rooms = await response.json();
        const filter = document.getElementById('calendarRoomFilter');

        if (filter && rooms) {
            filter.innerHTML = '<option value="all">Todas as salas</option>';
            rooms.forEach(room => {
                filter.innerHTML += `<option value="${room.id}">${escapeHtml(room.id)} - ${escapeHtml(room.localizacao)}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading rooms for filter', error);
    }
}

// FUNÇÕES DE UI
function showTab(tabName) {
    const tabMap = {
        'rooms': 'roomsTab',
        'myReservations': 'myReservationsTab',
        'newReservation': 'newReservationTab',
        'newRoom': 'newRoomTab',
        'calendar': 'calendarTab'
    };

    // Esconder todas as abas
    const tabIds = ['roomsTab', 'myReservationsTab', 'newReservationTab', 'newRoomTab', 'calendarTab'];
    tabIds.forEach(tabId => {
        const element = document.getElementById(tabId);
        if (element) element.style.display = 'none';
    });

    // Mostrar a aba selecionada
    const selectedTab = document.getElementById(tabMap[tabName]);
    if (selectedTab) selectedTab.style.display = 'block';

    // Atualizar estilo dos botões
    const buttons = document.querySelectorAll('.nav-tabs button');
    const tabNames = {
        'rooms': 'Salas',
        'myReservations': 'Minhas Reservas',
        'newReservation': 'Nova Reserva',
        'newRoom': 'Cadastrar Sala',
        'calendar': 'Calendário'
    };
    
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.includes(tabNames[tabName])) {
            btn.classList.add('active');
        }
    });

    // Ações específicas
    if (tabName === 'myReservations') {
        loadMyReservations();
    } else if (tabName === 'newReservation') {
        loadRoomsForSelect();
    } else if (tabName === 'calendar') {
        loadRoomsForCalendarFilter();
        loadCalendar();
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

// FUNÇÕES UTILITÁRIAS
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
        showToast('Servidor não está online. Execute "npm start" na pasta node-server', 'warning');
    } else {
        console.log('Servidor conectado!');
    }
}, 1000);