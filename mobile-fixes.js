// ===== MOBILE FIXES MELHORADOS =====

// Prevenir scroll do body no mobile
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

// Adicionar botão expandir nos gráficos
function renderChart(chartData, canvasId) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    const isMobile = window.innerWidth < 768;
    
    // Se for mobile, adicionar botão expandir
    if (isMobile) {
        const canvas = document.getElementById(canvasId);
        const container = canvas.closest('.chart-container');
        
        if (!container.querySelector('.chart-expand-btn')) {
            const expandBtn = document.createElement('button');
            expandBtn.className = 'chart-expand-btn';
            expandBtn.textContent = '⛶ Expandir';
            expandBtn.onclick = function() {
                container.classList.toggle('expanded');
                this.textContent = container.classList.contains('expanded') ? '⛶ Recolher' : '⛶ Expandir';
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
    
    new Chart(ctx, {
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
                        size: 14
                    }
                },
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#fff',
                        font: {
                            size: 11
                        },
                        boxWidth: 15,
                        padding: 8
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#888',
                        font: {
                            size: 10
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
                            size: 10
                        }
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Melhorar scroll das mensagens
function renderMessages() {
    const messagesContainer = document.getElementById('messagesContainer');
    
    // ... código existente de renderMessages ...
    
    // No final, fazer scroll suave
    setTimeout(() => {
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }, 100);
}

// Fechar sidebar melhorado
function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    if (sidebar && overlay) {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = 'hidden'; // Manter hidden no mobile
    }
}
