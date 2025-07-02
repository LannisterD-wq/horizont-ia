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
    document.body.addEventListener(
      'touchmove',
      function (e) {
        if (
          !e.target.closest('.messages-container') &&
          !e.target.closest('.chat-list') &&
          !e.target.closest('.leads-view') &&
          !e.target.closest('.admin-panel')
        ) {
          e.preventDefault();
        }
      },
      { passive: false }
    );
  }
}

// Handle login
async function handleLogin(event) {
  event.preventDefault();

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const errorDiv = document.getElementById('loginError');

  console.log('Tentando login:', { username, password }); // Debug

  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    console.log('Response status:', response.status); // Debug

    const data = await response.json();
    console.log('Response data:', data); // Debug

    if (data.success) {
      currentUser = {
        username: data.username,
        role: data.role,
        name: data.name,
        token: data.token,
      };

      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      showApp();
    } else {
      errorDiv.textContent = data.message || 'Erro ao fazer login';
      errorDiv.style.display = 'block';
    }
  } catch (error) {
    console.error('Login error completo:', error);
    errorDiv.textContent =
      'Erro de conexão com o servidor. Verifique se o servidor está rodando.';
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
    document.querySelector('.leads-btn').style.background =
      'rgba(52, 199, 89, 0.3)';
  } else {
    document.getElementById('chatArea').style.display = 'flex';
    document.getElementById('leadsView').style.display = 'none';
    document.querySelector('.leads-btn').style.background =
      'rgba(52, 199, 89, 0.1)';
  }

  // Close sidebar on mobile
  if (window.innerWidth < 768) {
    closeSidebar();
  }
}

// Load user leads
async function loadUserLeads() {
  try {
    const response = await fetch(`${API_URL}/leads/${currentUser.username}`);
    const data = await response.json();

    if (data.success) {
      userLeads = data.leads;
      updateLeadsView();
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
    notes: document.getElementById('userLeadNotes').value.trim(),
  };

  try {
    const response = await fetch(
      `${API_URL}/leads/${currentUser.username}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(leadData) }
    );

    const data = await response.json();

    if (data.success) {
      event.target.reset();
      await loadUserLeads();
      alert('Lead adicionado com sucesso!');
    }
  } catch (error) {
    console.error('Erro ao salvar lead:', error);
    alert('Erro ao adicionar lead');
  }
}

// Update leads view
function updateLeadsView() {
  document.getElementById('totalLeadsCount').textContent = userLeads.length;
  document.getElementById('hotLeadsCount').textContent = userLeads.filter(l => l.status === 'quente').length;

  const totalValue = userLeads.reduce((sum, lead) => sum + (lead.value || 0), 0);
  document.getElementById('totalValueSum').textContent = formatCurrency(totalValue);

  const leadsList = document.getElementById('userLeadsList');
  if (userLeads.length === 0) {
    leadsList.innerHTML =
      '<p style="text-align:center;color:#888;padding:40px;">Nenhum lead cadastrado ainda. Adicione seu primeiro lead!</p>';
    return;
  }

  leadsList.innerHTML = userLeads.map(lead => {
    const statusColors = {
      quente: { bg: 'rgba(255,59,48,0.2)', border: 'rgba(255,59,48,0.3)', text: '#ff3b30', label: '🔴 Quente' },
      morno: { bg: 'rgba(255,215,0,0.2)', border: 'rgba(255,215,0,0.3)', text: '#ffd700', label: '🟡 Morno' },
      frio: { bg: 'rgba(0,122,255,0.2)', border: 'rgba(0,122,255,0.3)', text: '#007aff', label: '🔵 Frio' }
    };
    const status = statusColors[lead.status] || statusColors.frio;

    return `
      <div class="lead-card">
        <div class="lead-header">
          <h3 class="lead-name">${lead.name}</h3>
          <span class="lead-badge" style="background:${status.bg};border:1px solid ${status.border};color:${status.text};">
            ${status.label}
          </span>
        </div>
        <div class="lead-info">
          <div class="lead-info-item">📱 ${lead.phone}</div>
          ${lead.email?`<div class="lead-info-item">📧 ${lead.email}</div>`:''}
          ${lead.product?`<div class="lead-info-item">📦 Interesse: ${getProductName(lead.product)}</div>`:''}
          <div class="lead-info-item">📅 Adicionado: ${new Date(lead.createdAt).toLocaleDateString('pt-BR')}</div>
        </div>
        ${lead.value>0?`<div class="lead-value">💰 ${formatCurrency(lead.value)}</div>`:''}
        ${lead.notes?`<div class="lead-notes">📝 ${lead.notes}</div>`:''}
        <div class="lead-actions">
          <button class="lead-action-btn whatsapp" onclick="contactLeadWhatsApp('${lead.phone}','${lead.name}')">
            📱 WhatsApp
          </button>
          <button class="lead-action-btn" onclick="editLead(${lead.id})">✏️ Editar</button>
          <button class="lead-action-btn delete" onclick="deleteLead(${lead.id})">🗑️ Deletar</button>
        </div>
      </div>
    `;
  }).join('');
}

// Get product name
function getProductName(product) {
  const products = { smart: 'Horizont Smart', trend: 'Horizont Trend', leverage: 'Horizont Leverage' };
  return products[product]||product;
}

// Contact lead via WhatsApp
function contactLeadWhatsApp(phone,name) {
  const cleanPhone = phone.replace(/\D/g,'');
  const message = `Olá ${name}! Sou ${currentUser.name} da Horizont Investimentos. Como posso ajudar você a alcançar seus objetivos financeiros?`;
  window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`,'_blank');
}

// Edit lead
async function editLead(leadId) {
  const lead = userLeads.find(l=>l.id===leadId);
  if(!lead)return;
  document.getElementById('userLeadName').value=lead.name;
  document.getElementById('userLeadPhone').value=lead.phone;
  document.getElementById('userLeadEmail').value=lead.email||'';
  document.getElementById('userLeadStatus').value=lead.status;
  document.getElementById('userLeadValue').value=lead.value||'';
  document.getElementById('userLeadProduct').value=lead.product||'';
  document.getElementById('userLeadNotes').value=lead.notes||'';
  try{
    await fetch(`${API_URL}/leads/${currentUser.username}/${leadId}`,{method:'DELETE'});
    await loadUserLeads();
  }catch(e){console.error(e);}
  document.querySelector('.add-lead-form').scrollIntoView({behavior:'smooth'});
}

// Delete lead
async function deleteLead(leadId) {
  if(!confirm('Tem certeza que deseja deletar este lead?'))return;
  try{
    await fetch(`${API_URL}/leads/${currentUser.username}/${leadId}`,{method:'DELETE'});
    await loadUserLeads();
  }catch(e){console.error(e);alert('Erro ao deletar lead');}
}

// Load user chats
async function loadChats() {
  try {
    const response = await fetch(`${API_URL}/chats/${currentUser.username}`);
    const data = await response.json();
    if (data.success) {
      chats = data.chats.filter(chat=>Array.isArray(chat.messages)&&chat.messages.length>0);
      renderChatList();
    }
  } catch (error) { console.error('Error loading chats:', error); }
}

// Render chat list
function renderChatList() {
  const chatList = document.getElementById('chatList');
  chatList.innerHTML = '';
  chats.forEach(chat=>{
    const chatItem=document.createElement('div');
    chatItem.className=`chat-item ${chat.id===currentChatId?'active':''}`;
    chatItem.onclick=()=>selectChat(chat.id);
    chatItem.innerHTML=`
      <span class="chat-title" ondblclick="editChatTitle('${chat.id}')">${chat.title}</span>
      <div class="chat-actions">
        <button class="chat-action-btn" onclick="editChatTitle('${chat.id}');event.stopPropagation();" title="Editar título">✏️</button>
        <button class="chat-action-btn" onclick="deleteChat('${chat.id}',event)" title="Deletar conversa">🗑️</button>
      </div>`;
    chatList.appendChild(chatItem);
  });
}

// Select a chat
function selectChat(chatId) {
  currentChatId=chatId; renderChatList(); renderMessages();
  if(window.innerWidth<768)closeSidebar();
}

// Create new chat
async function createNewChat() {
  try {
    const response=await fetch(`${API_URL}/chats/${currentUser.username}`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({title:'Nova Conversa'})
    });
    const data=await response.json();
    if(data.success){ await loadChats(); selectChat(data.chat.id); }
  } catch(e){ console.error('Error creating chat:', e); }
}

// Edit chat title
async function editChatTitle(chatId) {
  event.stopPropagation();
  const chat=chats.find(c=>c.id===chatId);
  const newTitle=prompt('Digite o novo título da conversa:',chat.title);
  if(!newTitle||!newTitle.trim())return;
  try {
    const res=await fetch(`${API_URL}/chats/${currentUser.username}/${chatId}/update`,{
      method:'PUT',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({title:newTitle.trim()})
    });
    const d=await res.json();
    if(d.success){ chat.title=newTitle.trim(); renderChatList(); }
  }catch(e){console.error('Error updating title:',e);}
}

// Delete a chat
async function deleteChat(chatId,event){
  event.stopPropagation();
  if(!confirm('Tem certeza que deseja deletar esta conversa?'))return;
  try{
    const response=await fetch(`${API_URL}/chats/${currentUser.username}/${chatId}`,{method:'DELETE'});
    const data=await response.json();
    if(data.success){
      await loadChats();
      if(chatId===currentChatId){
        if(chats.length>0)selectChat(chats[0].id);
        else{currentChatId=null; renderMessages();}
      }
    }
  }catch(e){console.error('Delete error:',e);alert('Erro ao deletar conversa');}
}

// Render messages
function renderMessages(){
  const messagesContainer=document.getElementById('messagesContainer');
  if(!currentChatId){
    messagesContainer.innerHTML=`<div style="text-align:center;padding:50px;color:#666;">
      <h2>Bem-vindo ao Horizont IA</h2><p>Selecione uma conversa ou crie uma nova para começar</p>
    </div>`;
    return;
  }
  const currentChat=chats.find(c=>c.id===currentChatId);
  if(!currentChat)return;
  messagesContainer.innerHTML='';
  currentChat.messages.forEach((msg,index)=>{
    const messageDiv=document.createElement('div');
    messageDiv.className=`message ${msg.role}`;
    const avatar=msg.role==='user'?'👤':'🤖';
    let messageContent=`<div class="message-avatar">${avatar}</div><div class="message-content">`;
    messageContent+=formatMessage(msg.content);
    messageContent+=`</div>`;
    messageDiv.innerHTML=messageContent;
    messagesContainer.appendChild(messageDiv);
    if(msg.chart){
      const chartContainer=document.createElement('div');
      chartContainer.className='chart-container';
      chartContainer.innerHTML=`<canvas id="chart-${index}"></canvas>`;
      messageDiv.querySelector('.message-content').appendChild(chartContainer);
      setTimeout(()=>renderChart(msg.chart,`chart-${index}`),100);
    }
  });
  setTimeout(()=>{messagesContainer.scrollTop=messagesContainer.scrollHeight;},100);
}

// Format message content
function formatMessage(content){
  content=content.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>');
  content=content.replace(/\n/g,'<br>');
  content=content.replace(/^- (.*?)$/gm,'• $1');
  content=content.replace(/R\$\s*([\d.,]+)/g,'<strong style="color:#ffd700;">R$ $1</strong>');
  return content;
}

// Send message
async function sendMessage(){
  const messageInput=document.getElementById('messageInput');
  const message=messageInput.value.trim();
  if(!message||!currentChatId)return;
  const sendBtn=document.getElementById('sendBtn');
  sendBtn.disabled=true; messageInput.disabled=true;
  const currentChat=chats.find(c=>c.id===currentChatId);
  const userMessage={role:'user',content:message,timestamp:new Date().toISOString()};
  if(selectedFiles.length>0){
    userMessage.files=selectedFiles.map(f=>({name:f.name,type:f.type,size:f.size}));
  }
  currentChat.messages.push(userMessage);
  messageInput.value=''; autoResizeTextarea(messageInput); renderMessages();
  try{
    const response=await fetch(`${API_URL}/message`,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({username:currentUser.username,chatId:currentChatId,message,files:selectedFiles})
    });
    const data=await response.json();
    if(data.success){
      currentChat.messages.push({role:'assistant',content:data.response,timestamp:new Date().toISOString(),chart:data.chart});
      renderMessages();
      if(currentChat.messages.length===2){
        currentChat.title=message.substring(0,50)+(message.length>50?'...':'');
        renderChatList();
      }
      selectedFiles=[]; updateFilePreview(); document.getElementById('fileInput').value='';
    } else {
      alert('Erro ao enviar mensagem');
      currentChat.messages.pop(); renderMessages();
    }
  }catch(e){console.error('Send error:',e);alert('Erro de conexão');currentChat.messages.pop();renderMessages();}
  sendBtn.disabled=false; messageInput.disabled=false; messageInput.focus();
}

// Handle enter key
function handleInputKeydown(event){
  if(event.key==='Enter'&&!event.shiftKey){
    event.preventDefault(); sendMessage();
  }
}

// Auto resize textarea
function autoResizeTextarea(textarea){
  textarea.style.height='auto';
  textarea.style.height=textarea.scrollHeight+'px';
}

// File handling omitted (continua igual ao acima)…  
// Chart rendering omitted (continua igual ao acima)…  
// Admin functions omitted (continua igual ao acima)…  
