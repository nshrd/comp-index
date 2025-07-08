// Безопасные функции для работы с DOM без TrustedScript ошибок

// Безопасная очистка содержимого элемента
function safeClearElement(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

// Безопасное создание элемента с содержимым
function safeCreateElement(tagName, textContent, className) {
    const element = document.createElement(tagName);
    if (textContent) {
        element.textContent = textContent;
    }
    if (className) {
        element.className = className;
    }
    return element;
}

// Безопасное добавление обработчика событий
function safeAddEventListener(element, eventType, handler) {
    element.addEventListener(eventType, handler);
    return element;
}

// Замена для проблемного кода поиска
function initializeSafeSearch() {
    const searchInput = document.getElementById('search-input');
    const suggBox = document.getElementById('search-suggestions');
    
    // Безопасная обработка поиска
    searchInput.addEventListener('input', function() {
        const query = this.value.trim().toUpperCase();
        
        // Безопасная очистка вместо innerHTML = ''
        safeClearElement(suggBox);
        
        if (!query) {
            suggBox.style.display = 'none';
            return;
        }
        
        // Фильтрация результатов (предполагается, что supportedSymbols доступен)
        const matches = window.supportedSymbols && Array.isArray(window.supportedSymbols)
            ? window.supportedSymbols.filter(s => s.startsWith(query)).slice(0, 20)
            : [];
            
        suggBox.style.display = 'block';
        
        if (matches.length) {
            matches.forEach(symbol => {
                const li = safeCreateElement('li', symbol);
                safeAddEventListener(li, 'click', function() {
                    selectSymbol(symbol);
                });
                suggBox.appendChild(li);
            });
        } else {
            const li = safeCreateElement('li', 'Тикер не найден', 'no-match');
            suggBox.appendChild(li);
        }
    });
}

// Инициализация Trusted Types Policy (если поддерживается)
function initializeTrustedTypes() {
    if (window.trustedTypes && window.trustedTypes.createPolicy) {
        try {
            const policy = window.trustedTypes.createPolicy('default', {
                createHTML: (string) => string,
                createScript: (string) => string,
                createScriptURL: (string) => string
            });
            
            console.log('✅ Trusted Types policy initialized');
        } catch (error) {
            console.warn('⚠️ Could not create Trusted Types policy:', error);
        }
    }
}

// Экспорт для использования в main script
window.TrustedScriptUtils = {
    safeClearElement,
    safeCreateElement,
    safeAddEventListener,
    initializeSafeSearch,
    initializeTrustedTypes
}; 