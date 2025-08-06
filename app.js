// Global variables
let currentUser = null;
let currentChatId = null;
let chats = [];
let selectedFiles = [];
let userLeads = [];
let isLeadsView = false;

// Se estiver no Railway, use a URL completa
const API_URL = window.location.hostname.includes('railway.app') 
? `${window.location.origin}/api`
: window.location.protocol === 'file:' 
? 'http://127.0.0.1:8000/api'
: '/api';

// Debug - remover depois
console.log('API_URL:', API_URL);
console.log('Current URL:', window.location.href);

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
// Set viewport height
setVH();

// Check if user is already logged in
const savedUser = localStorage.getItem('currentUser');
if (savedUser) {
currentUser = JSON.parse(savedUser);
showApp();
}

// Setup viewport listeners
setupViewportListeners();

// Register service worker for PWA
if ('serviceWorker' in navigator) {
navigator.serviceWorker.register('/sw.js').catch(() => {
console.log('Service Worker não suportado ou erro ao registrar');
});
}
});

// Viewport height fix for mobile
function setVH() {
let vh = window.innerHeight * 0.01;
document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// Setup viewport listeners
function setupViewportListeners() {
// Update on resize
window.addEventListener('resize', setVH);

// Detect keyboard open/close
if (window.visualViewport) {
let windowHeight = window.innerHeight;
window.visualViewport.addEventListener('resize', () => {
if (window.visualViewport.height < windowHeight * 0.75) {
document.body.classList.add('keyboard-open');
} else {
document.body.classList.remove('keyboard-open');
}
});
}

// Prevent body scroll on mobile
if (window.innerWidth < 768) {
document.body.addEventListener('touchmove', function(e) {
if (!e.target.closest('.messages-container') && 
!e.target.closest('.chat-list') && 
!e.target.closest('.leads-view') &&
!e.target.closest('.admin-panel')) {
e.preventDefault();
}
}, { passive: false });
}
}

// Handle login
async function handleLogin(event) {
event.preventDefault();

const username = document.getElementById('username').value;
const password = document.getElementById('password').value;
const errorDiv = document.getElementById('loginError');

console.log('Tentando login:', { username }); // Não loga a senha

try {
const response = await fetch(`${API_URL}/login`, {
method: 'POST',
headers: {
'Content-Type': 'application/json'
},
body: JSON.stringify({ username, password })
});

console.log('Response status:', response.status);

const data = await response.json();
console.log('Login response:', data.success ? 'Success' : 'Failed');

if (data.success) {
currentUser = {
username: data.username,
role: data.role,
name: data.name,
token: data.token
};

localStorage.setItem('currentUser', JSON.stringify(currentUser));
showApp();
} else {
errorDiv.textContent = data.message || 'Erro ao fazer login';
errorDiv.style.display = 'block';
}
} catch (error) {
console.error('Login error:', error);
errorDiv.textContent = 'Erro de conexão com o servidor. Verifique se o servidor está rodando.';
errorDiv.style.display = 'block';
}
}

// Show main app
function showApp() {
document.getElementById('loginScreen').style.display = 'none';
document.getElementById('appContainer').style.display = 'block';
document.getElementById('userName').textContent = currentUser.name;

if (currentUser.role === 'admin') {
// Show admin panel for admin users
document.getElementById('chatArea').style.display = 'none';
document.getElementById('adminPanel').style.display = 'block';
document.getElementById('sidebar').style.display = 'none';
document.getElementById('companyLinks').style.display = 'none';
loadAdminUsers();
} else {
// Show chat interface for regular users
document.getElementById('chatArea').style.display = 'flex';
document.getElementById('adminPanel').style.display = 'none';
document.getElementById('sidebar').style.display = 'flex';
document.getElementById('companyLinks').style.display = 'block';
document.getElementById('leadsSection').style.display = 'block';
// Load chats for regular users
loadChats();
loadUserLeads();
}
}

// Handle logout
function handleLogout() {
localStorage.removeItem('currentUser');
currentUser = null;
currentChatId = null;
chats = [];
userLeads = [];

document.getElementById('loginScreen').style.display = 'flex';
document.getElementById('appContainer').style.display = 'none';
document.getElementById('loginForm').reset();
}

// Toggle sidebar on mobile
function toggleSidebar() {
const sidebar = document.getElementById('sidebar');
const overlay = document.querySelector('.sidebar-overlay');

sidebar.classList.toggle('open');
if (sidebar.classList.contains('open')) {
overlay.classList.add('active');
} else {
overlay.classList.remove('active');
}
}

// Close sidebar
function closeSidebar() {
const sidebar = document.getElementById('sidebar');
const overlay = document.querySelector('.sidebar-overlay');

sidebar.classList.remove('open');
overlay.classList.remove('active');
}

// Toggle leads view
function toggleLeadsView() {
isLeadsView = !isLeadsView;

if (isLeadsView) {
document.getElementById('chatArea').style.display = 'none';
document.getElementById('leadsView').style.display = 'flex';
document.querySelector('.leads-btn').style.background = 'rgba(52, 199, 89, 0.3)';
} else {
document.getElementById('chatArea').style.display = 'flex';
document.getElementById('leadsView').style.display = 'none';
document.querySelector('.leads-btn').style.background = 'rgba(52, 199, 89, 0.1)';
}

// Close sidebar on mobile
if (window.innerWidth < 768) {
closeSidebar();
}
}

// Load user leads
async function loadUserLeads() {
console.log('Carregando leads...');
try {
const response = await fetch(`${API_URL}/leads/${currentUser.username}`, {
headers: {
'Authorization': `Bearer ${currentUser.token}`
}
});
const data = await response.json();

if (data.success) {
userLeads = data.leads || [];
console.log(`${userLeads.length} leads carregados`);
updateLeadsView();
} else {
console.error('Erro ao carregar leads:', data.message);
}
} catch (error) {
console.error('Erro ao carregar leads:', error);
}
}

// Save user lead
async function saveUserLead(event) {
event.preventDefault();

const leadData = {
name: document.getElementById('userLeadName').value.trim(),
phone: document.getElementById('userLeadPhone').value.trim(),
email: document.getElementById('userLeadEmail').value.trim(),
status: document.getElementById('userLeadStatus').value,
value: parseFloat(document.getElementById('userLeadValue').value) || 0,
product: document.getElementById('userLeadProduct').value,
notes: document.getElementById('userLeadNotes').value.trim()
};

// Validação básica
if (!leadData.name || !leadData.phone || !leadData.status) {
alert('Por favor, preencha os campos obrigatórios (Nome, Telefone e Status)');
return;
}

console.log('Salvando lead:', leadData);

try {
const response = await fetch(`${API_URL}/leads/${currentUser.username}`, {
method: 'POST',
headers: {
'Content-Type': 'application/json',
'Authorization': `Bearer ${currentUser.token}`
},
body: JSON.stringify(leadData)
});

const data = await response.json();

if (data.success) {
event.target.reset();
await loadUserLeads(); // Recarrega a lista
alert('Lead adicionado com sucesso!');
} else {
alert(data.message || 'Erro ao adicionar lead');
}
} catch (error) {
console.error('Erro ao salvar lead:', error);
alert('Erro ao adicionar lead. Verifique sua conexão.');
}
}

// Update leads view
function updateLeadsView() {
// Update stats
document.getElementById('totalLeadsCount').textContent = userLeads.length;
document.getElementById('hotLeadsCount').textContent = userLeads.filter(l => l.status === 'quente').length;

const totalValue = userLeads.reduce((sum, lead) => sum + (lead.value || 0), 0);
document.getElementById('totalValueSum').textContent = formatCurrency(totalValue);

// Update list
const leadsList = document.getElementById('userLeadsList');

if (userLeads.length === 0) {
leadsList.innerHTML = '<p style="text-align: center; color: #888; padding: 40px;">Nenhum lead cadastrado ainda. Adicione seu primeiro lead!</p>';
return;
}

leadsList.innerHTML = userLeads.map(lead => {
const statusColors = {
'quente': { bg: 'rgba(255, 59, 48, 0.2)', border: 'rgba(255, 59, 48, 0.3)', text: '#ff3b30', label: '🔴 Quente' },
'morno': { bg: 'rgba(255, 215, 0, 0.2)', border: 'rgba(255, 215, 0, 0.3)', text: '#ffd700', label: '🟡 Morno' },
'frio': { bg: 'rgba(0, 122, 255, 0.2)', border: 'rgba(0, 122, 255, 0.3)', text: '#007aff', label: '🔵 Frio' }
};

const status = statusColors[lead.status] || statusColors['frio'];

return `
           <div class="lead-card">
               <div class="lead-header">
                   <h3 class="lead-name">${escapeHtml(lead.name)}</h3>
                   <span class="lead-badge" style="background: ${status.bg}; border: 1px solid ${status.border}; color: ${status.text};">
                       ${status.label}
                   </span>
               </div>
               
               <div class="lead-info">
                   <div class="lead-info-item">📱 ${escapeHtml(lead.phone)}</div>
                   ${lead.email ? `<div class="lead-info-item">📧 ${escapeHtml(lead.email)}</div>` : ''}
                   ${lead.product ? `<div class="lead-info-item">📦 Interesse: ${getProductName(lead.product)}</div>` : ''}
                   <div class="lead-info-item">📅 Adicionado: ${new Date(lead.createdAt).toLocaleDateString('pt-BR')}</div>
               </div>
               
               ${lead.value > 0 ? `<div class="lead-value">💰 ${formatCurrency(lead.value)}</div>` : ''}
               
               ${lead.notes ? `<div class="lead-notes">📝 ${escapeHtml(lead.notes)}</div>` : ''}
               
               <div class="lead-actions">
                   <button class="lead-action-btn whatsapp" onclick="contactLeadWhatsApp('${lead.phone}', '${escapeHtml(lead.name)}')">
                       📱 WhatsApp
                   </button>
                   <button class="lead-action-btn" onclick="editLead(${lead.id})">
                       ✏️ Editar
                   </button>
                   <button class="lead-action-btn delete" onclick="deleteLead(${lead.id})">
                       🗑️ Deletar
                   </button>
               </div>
           </div>
       `;
}).join('');
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
const map = {
'&': '&amp;',
'<': '&lt;',
'>': '&gt;',
'"': '&quot;',
"'": '&#039;'
};
return text.replace(/[&<>"']/g, m => map[m]);
}

// Get product name
function getProductName(product) {
const products = {
'smart': 'Horizont Smart',
'trend': 'Horizont Trend',
'leverage': 'Horizont Leverage'
};
return products[product] || product;
}

// Contact lead via WhatsApp
function contactLeadWhatsApp(phone, name) {
const cleanPhone = phone.replace(/\D/g, '');
const message = `Olá ${name}! Sou ${currentUser.name} da Horizont Investimentos. Como posso ajudar você a alcançar seus objetivos financeiros?`;
const encodedMessage = encodeURIComponent(message);
window.open(`https://wa.me/55${cleanPhone}?text=${encodedMessage}`, '_blank');
}

// Edit lead
async function editLead(leadId) {
const lead = userLeads.find(l => l.id === leadId);
if (!lead) return;

// Fill form with lead data
document.getElementById('userLeadName').value = lead.name;
document.getElementById('userLeadPhone').value = lead.phone;
document.getElementById('userLeadEmail').value = lead.email || '';
document.getElementById('userLeadStatus').value = lead.status;
document.getElementById('userLeadValue').value = lead.value || '';
document.getElementById('userLeadProduct').value = lead.product || '';
document.getElementById('userLeadNotes').value = lead.notes || '';

// Delete the lead to be edited
await deleteLead(leadId, false);

// Scroll to form
document.querySelector('.add-lead-form').scrollIntoView({ behavior: 'smooth' });
}

// Delete lead
async function deleteLead(leadId, confirmDelete = true) {
if (confirmDelete && !confirm('Tem certeza que deseja deletar este lead?')) return;

try {
const response = await fetch(`${API_URL}/leads/${currentUser.username}/${leadId}`, {
method: 'DELETE',
headers: {
'Authorization': `Bearer ${currentUser.token}`
}
});

if (response.ok) {
await loadUserLeads(); // Recarrega a lista
if (confirmDelete) {
alert('Lead deletado com sucesso!');
}
} else {
const data = await response.json();
alert(data.message || 'Erro ao deletar lead');
}
} catch (error) {
console.error('Erro ao deletar lead:', error);
if (confirmDelete) {
alert('Erro ao deletar lead');
}
}
}

// Load user chats
async function loadChats() {
    console.log('Carregando chats...');
    try {
        const response = await fetch(`${API_URL}/chats/${currentUser.username}`, {
            headers: {
                'Authorization': `Bearer ${currentUser.token}`
            }
        });
        const data = await response.json();

        if (data.success) {
            // Garante que cada chat tem um array de mensagens
            chats = data.chats.map(chat => ({
                ...chat,
                messages: Array.isArray(chat.messages) ? chat.messages : []
            }));
            
            console.log('Chats carregados:', chats);
            renderChatList();

            // Se não há chats, mostra mensagem
            if (chats.length === 0) {
                currentChatId = null;
                renderMessages();
            } else {
                // Seleciona o primeiro chat se houver
                selectChat(chats[0].id);
            }
        }
    } catch (error) {
        console.error('Error loading chats:', error);
        chats = [];
        renderChatList();
    }
}

// Render chat list
function renderChatList() {
const chatList = document.getElementById('chatList');
chatList.innerHTML = '';

chats.forEach(chat => {
const chatItem = document.createElement('div');
chatItem.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;
chatItem.onclick = () => selectChat(chat.id);

chatItem.innerHTML = `
            <span class="chat-title" ondblclick="editChatTitle('${chat.id}')">${escapeHtml(chat.title)}</span>
           <div class="chat-actions">
                <button class="chat-action-btn" onclick="editChatTitle('${chat.id}'); event.stopPropagation();" title="Editar título">✏️</button>
                <button class="chat-action-btn" onclick="deleteChat('${chat.id}', event)" title="Deletar conversa">🗑️</button>
           </div>
       `;

chatList.appendChild(chatItem);
});
}

// Select a chat
function selectChat(chatId) {
    console.log('Selecionando chat:', chatId);
    
    // Converte para número se necessário
    const numericChatId = typeof chatId === 'string' ? parseInt(chatId) : chatId;
    
    // Verifica se o chat existe
    const chatExists = chats.find(chat => chat.id === numericChatId);
    if (!chatExists) {
        console.error('Chat não existe:', numericChatId);
        return;
    }
    
    currentChatId = numericChatId;
    console.log('Chat selecionado:', currentChatId);
    
    renderChatList();
    renderMessages();

    // Close sidebar on mobile
    if (window.innerWidth < 768) {
        closeSidebar();
    }
}

// Create new chat
async function createNewChat() {
    console.log('Criando novo chat...');
    try {
        const response = await fetch(`${API_URL}/chats/${currentUser.username}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            },
            body: JSON.stringify({ title: 'Nova Conversa' })
        });

        const data = await response.json();
        console.log('Resposta do servidor:', data);

        if (data.success && data.chat) {
            // Adiciona o novo chat ao array local com array de mensagens vazio
            const newChat = {
                id: data.chat.id,
                title: data.chat.title,
                messages: [],
                createdAt: data.chat.createdAt || new Date().toISOString()
            };
            
            // Adiciona ao início do array
            chats.unshift(newChat);
            
            // Renderiza a lista
            renderChatList();
            
            // Seleciona o novo chat
            selectChat(data.chat.id);
            
            console.log('Chat criado e selecionado:', newChat);
        } else {
            console.error('Erro ao criar chat:', data.message);
            alert('Erro ao criar nova conversa');
        }
    } catch (error) {
        console.error('Error creating chat:', error);
        alert('Erro de conexão ao criar conversa');
    }
}

// Edit chat title
async function editChatTitle(chatId) {
event.stopPropagation();

const chat = chats.find(c => c.id === chatId);
if (!chat) return;

const newTitle = prompt('Digite o novo título da conversa:', chat.title);

if (newTitle && newTitle.trim() !== '') {
try {
const response = await fetch(`${API_URL}/chats/${currentUser.username}/${chatId}/update`, {
method: 'PUT',
headers: {
'Content-Type': 'application/json',
'Authorization': `Bearer ${currentUser.token}`
},
body: JSON.stringify({ title: newTitle.trim() })
});

const data = await response.json();

if (data.success) {
chat.title = newTitle.trim();
renderChatList();
}
} catch (error) {
console.error('Error updating title:', error);
}
}
}

// Delete a chat
async function deleteChat(chatId, event) {
event.stopPropagation();

if (!confirm('Tem certeza que deseja deletar esta conversa?')) {
return;
}

try {
const response = await fetch(`${API_URL}/chats/${currentUser.username}/${chatId}`, {
method: 'DELETE',
headers: {
'Authorization': `Bearer ${currentUser.token}`
}
});

const data = await response.json();

if (data.success) {
await loadChats();

// If deleted chat was active, select another
if (chatId === currentChatId) {
if (chats.length > 0) {
selectChat(chats[0].id);
} else {
currentChatId = null;
renderMessages();
}
}
}
} catch (error) {
console.error('Delete error:', error);
alert('Erro ao deletar conversa');
}
}

// Render messages
function renderMessages() {
    const messagesContainer = document.getElementById('messagesContainer');

    if (!currentChatId) {
        messagesContainer.innerHTML = `
            <div style="text-align: center; padding: 50px; color: #666;">
                <h2>Bem-vindo ao Horizont IA</h2>
                <p>Selecione uma conversa ou crie uma nova para começar</p>
            </div>
        `;
        return;
    }

    const currentChat = chats.find(chat => chat.id === currentChatId);
    if (!currentChat) return;

    messagesContainer.innerHTML = '';

    currentChat.messages.forEach((msg, index) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${msg.role}`;

        const avatar = msg.role === 'user' ? '👤' : '🤖';

        let messageContent = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
        `;

        // Add share button for assistant messages with valuable content
        if (msg.role === 'assistant' && (msg.content.includes('R$') || msg.chart)) {
            messageContent += `
                <button class="share-btn" onclick="shareViaWhatsApp(${index})">
                    📱 Compartilhar no WhatsApp
                </button>
            `;
        }

        // NOVO: Processa o conteúdo da mensagem
        let processedContent = formatMessage(msg.content);
        
        // NOVO: Substitui marcador do gráfico se existir
        if (msg.chart && processedContent.includes('{{GRAFICO_AQUI}}')) {
            const chartId = `chart-${currentChatId}-${index}`;
            const chartHtml = `
                <div class="chart-container" id="container-${chartId}">
                    <canvas id="${chartId}"></canvas>
                </div>
            `;
            processedContent = processedContent.replace('{{GRAFICO_AQUI}}', chartHtml);
        }
        
        // NOVO: Substitui marcador do artefato se existir
        if (msg.artifact && processedContent.includes('{{ARTEFATO_AQUI}}')) {
            const artifactHtml = `
                <div class="artifact-container">
                    <div class="artifact-header">
                        <span class="artifact-type">${msg.artifact.type || 'report'}</span>
                        <h3>${msg.artifact.title || 'Documento'}</h3>
                        <button onclick="copyArtifact('${index}')" class="artifact-copy-btn">
                            📋 Copiar
                        </button>
                    </div>
                    <div class="artifact-content">
                        ${formatArtifactContent(msg.artifact.content)}
                    </div>
                </div>
            `;
            processedContent = processedContent.replace('{{ARTEFATO_AQUI}}', artifactHtml);
        }

        messageContent += processedContent;
        messageContent += '</div>';

        messageDiv.innerHTML = messageContent;
        messagesContainer.appendChild(messageDiv);

        // NOVO: Renderiza o gráfico após inserir o HTML
        if (msg.chart) {
            const chartId = `chart-${currentChatId}-${index}`;
            setTimeout(() => {
                // Verifica se o canvas existe antes de renderizar
                if (document.getElementById(chartId)) {
                    renderChart(msg.chart, chartId);
                }
            }, 100);
        }
    });

    // Scroll to bottom
    setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 100);
}

// Format message content (basic markdown support)
function formatMessage(content) {
// Convert markdown bold
content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

// Convert line breaks
content = content.replace(/\n/g, '<br>');

// Convert bullet points
content = content.replace(/^- (.*?)$/gm, '• $1');

// Highlight monetary values
content = content.replace(/R\$\s*([\d.,]+)/g, '<strong style="color: #ffd700;">R$ $1</strong>');

return content;
}

/ Format artifact content
function formatArtifactContent(content) {
    if (!content) return '';
    
    // Converte markdown básico
    let formatted = content
        .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
        .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
        .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>')
        .replace(/^- (.*?)$/gm, '• $1');
    
    // Destaca valores monetários
    formatted = formatted.replace(/R\$\s*([\d.,]+)/g, '<strong style="color: #ffd700;">R$ $1</strong>');
    
    return formatted;
}

// Copy artifact to clipboard
function copyArtifact(messageIndex) {
    const currentChat = chats.find(chat => chat.id === currentChatId);
    if (!currentChat) return;
    
    const message = currentChat.messages[messageIndex];
    if (!message.artifact) return;
    
    // Remove HTML tags para copiar texto limpo
    const textContent = message.artifact.content
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'");
    
    // Copia para clipboard
    if (navigator.clipboard) {
        navigator.clipboard.writeText(textContent).then(() => {
            alert('Conteúdo copiado para a área de transferência!');
        }).catch(err => {
            console.error('Erro ao copiar:', err);
            fallbackCopyTextToClipboard(textContent);
        });
    } else {
        fallbackCopyTextToClipboard(textContent);
    }
}

// Fallback para copiar texto (navegadores antigos)
function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        alert('Conteúdo copiado!');
    } catch (err) {
        alert('Erro ao copiar. Por favor, selecione e copie manualmente.');
    }
    
    document.body.removeChild(textArea);
}

// Share via WhatsApp
function shareViaWhatsApp(messageIndex) {
const currentChat = chats.find(chat => chat.id === currentChatId);
const message = currentChat.messages[messageIndex];

let text = '*Horizont Investimentos*\n\n';

// Remove HTML and format for WhatsApp
let content = message.content
.replace(/<[^>]*>/g, '') // Remove HTML tags
.replace(/\*\*(.*?)\*\*/g, '*$1*') // Convert bold
.replace(/•/g, '•'); // Keep bullet points

text += content;

// Add chart data as text if exists
if (message.chart) {
text += '\n\n📊 *Comparativo de Investimentos*\n';
text += `Valor inicial: ${formatCurrency(message.chart.initialValue)}\n`;
text += `Período: ${message.chart.years} anos\n\n`;

Object.entries(message.chart.products || {}).forEach(([name, product]) => {
const finalValue = message.chart.initialValue * Math.pow(1 + (product.rate / 100), message.chart.years);
text += `*${name}*\n`;
text += `Valor final: ${formatCurrency(finalValue)}\n\n`;
});
}

text += '\n_Gerado pelo Horizont IA_';

// Encode and open WhatsApp
const encodedText = encodeURIComponent(text);
window.open(`https://wa.me/?text=${encodedText}`, '_blank');
}

// Format currency
function formatCurrency(value) {
return new Intl.NumberFormat('pt-BR', {
style: 'currency',
currency: 'BRL'
}).format(value);
}

// SUBSTITUA A FUNÇÃO sendMessage (linha 626) POR ESTA VERSÃO CORRIGIDA:

// Send message
async function sendMessage() {
    console.log('=== INÍCIO sendMessage ===');
    
    try {
        const messageInput = document.getElementById('messageInput');
        if (!messageInput) {
            console.error('messageInput não encontrado!');
            return;
        }
        
        const message = messageInput.value.trim();
        console.log('Mensagem:', message);
        
        if (!message) {
            console.log('Mensagem vazia');
            return;
        }
        
        if (!currentChatId) {
            console.log('Nenhum chat selecionado');
            alert('Por favor, crie uma nova conversa primeiro');
            return;
        }
        
        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) sendBtn.disabled = true;
        messageInput.disabled = true;
        
        // Busca o chat atual
        const currentChat = chats.find(chat => chat.id === currentChatId);
        if (!currentChat) {
            console.error('Chat não encontrado para ID:', currentChatId);
            alert('Erro: Chat não encontrado');
            if (sendBtn) sendBtn.disabled = false;
            messageInput.disabled = false;
            return;
        }
        
        // Cria mensagem do usuário
        const userMessage = {
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
        };
        
        if (selectedFiles && selectedFiles.length > 0) {
            userMessage.files = selectedFiles.map(f => ({
                name: f.name,
                type: f.type,
                size: f.size
            }));
        }
        
        // Adiciona mensagem do usuário ao chat
        if (!currentChat.messages) {
            currentChat.messages = [];
        }
        currentChat.messages.push(userMessage);
        
        // Limpa o input
        messageInput.value = '';
        autoResizeTextarea(messageInput);
        
        // Renderiza as mensagens
        renderMessages();
        
        try {
            // Envia para o servidor
            console.log('Enviando para servidor...');
            const response = await fetch(`${API_URL}/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentUser.token || ''}`
                },
                body: JSON.stringify({
                    username: currentUser.username,
                    chatId: currentChatId,
                    message: message,
                    files: selectedFiles || []
                })
            });
            
            console.log('Response status:', response.status);
            const data = await response.json();
            console.log('Response data:', data);
            
            if (data.success) {
                // Adiciona resposta da IA
                currentChat.messages.push({
                   role: 'assistant',
                   content: data.response,
                   timestamp: new Date().toISOString(),
                   chart: data.chart,
                   artifact: data.artifact  // ADICIONE ESTA LINHA
               });
                
                renderMessages();
                
                // Atualiza título se for primeira mensagem
                if (currentChat.messages.length === 2) {
                    currentChat.title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
                    renderChatList();
                }
                
                // Limpa arquivos
                selectedFiles = [];
                updateFilePreview();
                const fileInput = document.getElementById('fileInput');
                if (fileInput) fileInput.value = '';
            } else {
                console.error('Erro do servidor:', data.message);
                alert('Erro ao enviar mensagem: ' + (data.message || 'Erro desconhecido'));
                // Remove a mensagem do usuário se falhou
                currentChat.messages.pop();
                renderMessages();
            }
        } catch (error) {
            console.error('Erro na requisição:', error);
            alert('Erro de conexão: ' + error.message);
            // Remove a mensagem do usuário se falhou
            currentChat.messages.pop();
            renderMessages();
        }
        
        // Reabilita os controles
        if (sendBtn) sendBtn.disabled = false;
        messageInput.disabled = false;
        messageInput.focus();
        
    } catch (error) {
        console.error('Erro geral em sendMessage:', error);
        console.error('Stack:', error.stack);
    }
    
    console.log('=== FIM sendMessage ===');
}
// Handle input keydown
function handleInputKeydown(event) {
if (event.key === 'Enter' && !event.shiftKey) {
event.preventDefault();
sendMessage();
}
}

// Auto resize textarea
function autoResizeTextarea(textarea) {
textarea.style.height = 'auto';
textarea.style.height = textarea.scrollHeight + 'px';
}

// Handle file select
function handleFileSelect(event) {
const files = Array.from(event.target.files);

files.forEach(file => {
const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

if (!validTypes.includes(file.type)) {
alert(`Tipo de arquivo não suportado: ${file.name}`);
return;
}

const reader = new FileReader();
reader.onload = function(e) {
selectedFiles.push({
name: file.name,
type: file.type,
size: file.size,
data: e.target.result.split(',')[1] // Remove data URL prefix
});

updateFilePreview();
};
reader.readAsDataURL(file);
});
}

// Update file preview
function updateFilePreview() {
const filePreview = document.getElementById('filePreview');

if (selectedFiles.length === 0) {
filePreview.innerHTML = '';
return;
}

filePreview.innerHTML = selectedFiles.map((file, index) => `
       <div class="file-preview">
           <span class="file-name">${file.type.startsWith('image/') ? '🖼️' : '📄'} ${file.name}</span>
           <button class="file-remove" onclick="removeFile(${index})">×</button>
       </div>
   `).join('');
}

// Remove file
function removeFile(index) {
selectedFiles.splice(index, 1);
updateFilePreview();

if (selectedFiles.length === 0) {
document.getElementById('fileInput').value = '';
}
}

// Render chart
function renderChart(chartData, canvasId) {
const ctx = document.getElementById(canvasId).getContext('2d');
const isMobile = window.innerWidth < 768;

// Add expand button for mobile
if (isMobile) {
const canvas = document.getElementById(canvasId);
const container = canvas.closest('.chart-container');

if (!container.querySelector('.chart-expand-btn')) {
const expandBtn = document.createElement('button');
expandBtn.className = 'chart-expand-btn';
expandBtn.textContent = '⛶ Expandir';
expandBtn.style.display = 'block';
expandBtn.onclick = function() {
container.classList.toggle('expanded');
this.textContent = container.classList.contains('expanded') ? '⛶ Recolher' : '⛶ Expandir';

// Recreate chart with new size
setTimeout(() => {
ctx.chart.destroy();
renderChart(chartData, canvasId);
}, 300);
};
container.appendChild(expandBtn);
}
}

const datasets = [];
const years = Array.from({length: (chartData.years || 5) + 1}, (_, i) => i);

Object.entries(chartData.products || {}).forEach(([name, product]) => {
const values = years.map(year => {
return chartData.initialValue * Math.pow(1 + (product.rate / 100), year);
});

datasets.push({
label: name,
data: values,
borderColor: product.color,
backgroundColor: product.color + '20',
borderWidth: 2,
tension: 0.1,
pointRadius: isMobile ? 0 : 3
});
});

const chart = new Chart(ctx, {
type: 'line',
data: {
labels: years.map(y => `Ano ${y}`),
datasets: datasets
},
options: {
responsive: true,
maintainAspectRatio: false,
plugins: {
title: {
display: true,
text: chartData.title || 'Comparativo de Investimentos',
color: '#fff',
font: {
size: isMobile ? 14 : 16
}
},
legend: {
position: 'bottom',
labels: {
color: '#fff',
font: {
size: isMobile ? 11 : 12
},
boxWidth: isMobile ? 15 : 20,
padding: isMobile ? 8 : 10
}
}
},
scales: {
y: {
beginAtZero: true,
ticks: {
color: '#888',
font: {
size: isMobile ? 10 : 12
},
callback: function(value) {
return 'R$ ' + (value/1000).toFixed(0) + 'k';
}
},
grid: {
color: 'rgba(255, 255, 255, 0.1)'
}
},
x: {
ticks: {
color: '#888',
font: {
size: isMobile ? 10 : 12
}
},
grid: {
display: false
}
}
}
}
});

// Store chart instance for later use
ctx.chart = chart;
}

// Admin functions
function showAdminTab(tab) {
const tabs = document.querySelectorAll('.admin-tab');
tabs.forEach(t => t.classList.remove('active'));
event.target.classList.add('active');

switch(tab) {
case 'users':
loadAdminUsers();
break;
case 'settings':
loadAdminSettings();
break;
case 'reports':
loadAdminReports();
break;
}
}

// Load admin users
async function loadAdminUsers() {
const adminContent = document.getElementById('adminContent');
adminContent.innerHTML = '<div class="loading">Carregando usuários...</div>';

try {
const response = await fetch(`${API_URL}/admin/users`, {
headers: {
'Authorization': `Bearer ${currentUser.token}`
}
});
const data = await response.json();

if (data.success) {
let html = `
               <h3>Adicionar Novo Usuário</h3>
               <form onsubmit="createUser(event)" style="margin-bottom: 30px;">
                   <div style="display: grid; gap: 10px; margin-bottom: 15px;">
                       <input type="text" id="newUsername" placeholder="Nome de usuário" required style="padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; border-radius: 8px;">
                       <input type="password" id="newPassword" placeholder="Senha" required style="padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; border-radius: 8px;">
                       <input type="text" id="newName" placeholder="Nome completo" required style="padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; border-radius: 8px;">
                       <input type="text" id="newCpf" placeholder="CPF" required style="padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; border-radius: 8px;">
                   </div>
                   <button type="submit" class="action-btn" style="background: #0099ff; border-color: #0099ff;">Criar Usuário</button>
               </form>
               
               <h3>Usuários Cadastrados</h3>
               <table class="users-table">
                   <thead>
                       <tr>
                           <th>Usuário</th>
                           <th>Nome</th>
                           <th>CPF</th>
                           <th>Conversas</th>
                           <th>Ações</th>
                       </tr>
                   </thead>
                   <tbody>
           `;

data.users.forEach(user => {
html += `
                   <tr>
                       <td>${escapeHtml(user.username)}</td>
                       <td>${escapeHtml(user.name)}</td>
                       <td>${escapeHtml(user.cpf)}</td>
                       <td>${user.chatsCount}</td>
                       <td class="user-actions">
                           <button class="action-btn" onclick="viewUserChats('${user.username}')">Ver Chats</button>
                           <button class="action-btn delete" onclick="deleteUser('${user.username}')">Deletar</button>
                       </td>
                   </tr>
               `;
});

html += '</tbody></table>';
adminContent.innerHTML = html;
}
} catch (error) {
console.error('Error loading users:', error);
adminContent.innerHTML = '<div style="color: #ff3b30;">Erro ao carregar usuários</div>';
}
}

// Create user
async function createUser(event) {
event.preventDefault();

const userData = {
username: document.getElementById('newUsername').value,
password: document.getElementById('newPassword').value,
name: document.getElementById('newName').value,
cpf: document.getElementById('newCpf').value
};

try {
const response = await fetch(`${API_URL}/admin/users`, {
method: 'POST',
headers: {
'Content-Type': 'application/json',
'Authorization': `Bearer ${currentUser.token}`
},
body: JSON.stringify(userData)
});

const data = await response.json();

if (data.success) {
alert('Usuário criado com sucesso!');
loadAdminUsers();
} else {
alert(data.message || 'Erro ao criar usuário');
}
} catch (error) {
console.error('Error creating user:', error);
alert('Erro de conexão');
}
}

// Delete user
async function deleteUser(username) {
if (!confirm(`Tem certeza que deseja deletar o usuário ${username}?`)) {
return;
}

try {
const response = await fetch(`${API_URL}/admin/users/${username}`, {
method: 'DELETE',
headers: {
'Authorization': `Bearer ${currentUser.token}`
}
});

const data = await response.json();

if (data.success) {
alert('Usuário deletado com sucesso!');
loadAdminUsers();
} else {
alert('Erro ao deletar usuário');
}
} catch (error) {
console.error('Error deleting user:', error);
alert('Erro de conexão');
}
}

// View user chats
async function viewUserChats(username) {
try {
const response = await fetch(`${API_URL}/admin/users/${username}/chats`, {
headers: {
'Authorization': `Bearer ${currentUser.token}`
}
});
const data = await response.json();

if (data.success) {
let html = `<h3>Conversas de ${username}</h3>`;

if (data.chats.length === 0) {
html += '<p>Este usuário ainda não tem conversas.</p>';
} else {
html += '<ul style="list-style: none; padding: 0;">';
data.chats.forEach(chat => {
html += `
                       <li style="margin-bottom: 15px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px;">
                           <strong>${escapeHtml(chat.title)}</strong><br>
                           <small>Mensagens: ${chat.messagesCount} | Criado em: ${new Date(chat.createdAt).toLocaleDateString('pt-BR')}</small><br>
                           <em style="color: #888; font-size: 12px;">${escapeHtml(chat.lastMessage)}</em>
                       </li>
                   `;
});
html += '</ul>';
}

html += '<button class="action-btn" onclick="loadAdminUsers()">Voltar</button>';

document.getElementById('adminContent').innerHTML = html;
}
} catch (error) {
console.error('Error viewing chats:', error);
alert('Erro ao carregar conversas');
}
}

// Load admin settings
async function loadAdminSettings() {
const adminContent = document.getElementById('adminContent');
adminContent.innerHTML = '<div class="loading">Carregando configurações...</div>';

try {
const response = await fetch(`${API_URL}/admin/prompt`, {
headers: {
'Authorization': `Bearer ${currentUser.token}`
}
});
const data = await response.json();

if (data.success) {
adminContent.innerHTML = `
               <h3>Configuração do Prompt do Sistema</h3>
               <form onsubmit="updatePrompt(event)">
                   <textarea id="systemPrompt" style="width: 100%; height: 400px; padding: 15px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; border-radius: 8px; font-family: monospace; font-size: 14px;">${escapeHtml(data.prompt)}</textarea>
                   <button type="submit" class="action-btn" style="margin-top: 15px; background: #0099ff; border-color: #0099ff;">Salvar Configurações</button>
               </form>
           `;
}
} catch (error) {
console.error('Error loading settings:', error);
adminContent.innerHTML = '<div style="color: #ff3b30;">Erro ao carregar configurações</div>';
}
}

// Update prompt
async function updatePrompt(event) {
event.preventDefault();

const prompt = document.getElementById('systemPrompt').value;

try {
const response = await fetch(`${API_URL}/admin/prompt`, {
method: 'PUT',
headers: {
'Content-Type': 'application/json',
'Authorization': `Bearer ${currentUser.token}`
},
body: JSON.stringify({ prompt })
});

const data = await response.json();

if (data.success) {
alert('Configurações salvas com sucesso!');
} else {
alert('Erro ao salvar configurações');
}
} catch (error) {
console.error('Error updating prompt:', error);
alert('Erro de conexão');
}
}

// Load admin reports
function loadAdminReports() {
const adminContent = document.getElementById('adminContent');
adminContent.innerHTML = `
       <h3>Relatórios do Sistema</h3>
       <p style="color: #888;">Funcionalidade em desenvolvimento...</p>
       <div style="margin-top: 20px;">
           <button class="action-btn" onclick="alert('Relatório de uso em desenvolvimento')">Relatório de Uso</button>
           <button class="action-btn" onclick="alert('Relatório de conversas em desenvolvimento')">Relatório de Conversas</button>
           <button class="action-btn" onclick="alert('Relatório financeiro em desenvolvimento')">Relatório Financeiro</button>
       </div>
   `;
}
