// Mobile Fixes JavaScript

// Adicionar overlay ao body
document.addEventListener('DOMContentLoaded', function() {
    // Criar overlay
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.onclick = closeSidebar;
    document.body.appendChild(overlay);
    
    // Melhorar touch nos botões
    addTouchSupport();
    
    // Fix para gráficos mobile
    fixChartsForMobile();
    
    // Prevenir zoom no iOS quando foca input
    preventIOSZoom();
});

// Função melhorada para toggle sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    if (sidebar.classList.contains('open')) {
        closeSidebar();
    } else {
        sidebar.classList.add('open');
        overlay.classList.add('active');
        // Previne scroll do body quando sidebar está aberta
        document.body.style.overflow = 'hidden';
    }
}

// Fechar sidebar
function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
}

// Melhorar seleção de chat no mobile
function selectChat(chatId) {
    currentChatId = chatId;
    renderChatList();
    renderMessages();
    
    // Sempre fecha sidebar no mobile após selecionar
    if (window.innerWidth < 768) {
        closeSidebar();
    }
}

// Toggle leads view melhorado
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
    
    // Sempre fecha sidebar no mobile
    if (window.innerWidth < 768) {
        closeSidebar();
    }
}

// Adicionar suporte touch melhorado
function addTouchSupport() {
    // Detectar dispositivo touch
    const isTouch = 'ontouchstart' in window;
    
    if (isTouch) {
        // Adicionar classe para estilos específicos de touch
        document.body.classList.add('touch-device');
        
        // Melhorar responsividade dos botões
        document.querySelectorAll('button, .chat-item, .lead-card').forEach(el => {
            el.addEventListener('touchstart', function() {
                this.style.opacity = '0.7';
            });
            
            el.addEventListener('touchend', function() {
                this.style.opacity = '';
            });
        });
    }
}

// Fix para gráficos no mobile
function fixChartsForMobile() {
    if (window.innerWidth < 768) {
        // Configuração específica para mobile
        Chart.defaults.font.size = 11;
        Chart.defaults.plugins.legend.labels.boxWidth = 12;
        Chart.defaults.plugins.legend.labels.padding = 10;
    }
}

// Renderizar gráfico com responsividade melhorada
function renderChart(chartData, canvasId) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    const isMobile = window.innerWidth < 768;
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
            borderWidth: isMobile ? 2 : 3,
            tension: 0.1,
            pointRadius: isMobile ? 2 : 4,
            pointHoverRadius: isMobile ? 4 : 6
        });
    });
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: years.map(y => isMobile ? `A${y}` : `Ano ${y}`),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: !isMobile,
            aspectRatio: isMobile ? 1.5 : 2,
            interaction: {
                intersect: false,
                mode: 'index'
            },
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
                    position: isMobile ? 'bottom' : 'top',
                    labels: {
                        color: '#fff',
                        font: {
                            size: isMobile ? 11 : 12
                        },
                        boxWidth: isMobile ? 20 : 40,
                        padding: isMobile ? 10 : 15
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0,0,0,0.9)',
                    titleFont: {
                        size: isMobile ? 12 : 14
                    },
                    bodyFont: {
                        size: isMobile ? 11 : 13
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
                            if (isMobile) {
                                return 'R$ ' + (value/1000).toFixed(0) + 'k';
                            }
                            return 'R$ ' + value.toLocaleString('pt-BR');
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawBorder: false
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
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawBorder: false
                    }
                }
            }
        }
    });
}

// Prevenir zoom no iOS quando foca em inputs
function preventIOSZoom() {
    const metaViewport = document.querySelector('meta[name=viewport]');
    if (metaViewport) {
        metaViewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    }
    
    // Prevenir zoom duplo toque
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(event) {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
}

// Ajustar altura quando teclado aparece
let windowHeight = window.innerHeight;
window.addEventListener('resize', function() {
    if (window.innerHeight < windowHeight * 0.75) {
        // Teclado provavelmente está visível
        document.querySelector('.input-area').style.position = 'fixed';
    } else {
        // Teclado foi escondido
        document.querySelector('.input-area').style.position = 'sticky';
    }
});

// Melhorar scroll em mensagens
if (window.innerWidth < 768) {
    const messagesContainer = document.getElementById('messagesContainer');
    if (messagesContainer) {
        // Scroll suave para última mensagem
        messagesContainer.scrollTo({
            top: messagesContainer.scrollHeight,
            behavior: 'smooth'
        });
    }
}