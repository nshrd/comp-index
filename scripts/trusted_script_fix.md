# Устранение ошибки TrustedScript

## Проблема

Ошибка `"This document requires 'TrustedScript' assignment"` возникает из-за:

1. **Строгой CSP политики** в браузере
2. **Динамического создания элементов DOM** через `innerHTML`
3. **Отсутствия Trusted Types Policy**

## Решение

### 1. Исправление CSP политики

Обновлена конфигурация nginx для более мягкой CSP:

```nginx
# nginx/nginx.conf
add_header Content-Security-Policy "default-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' wss: ws: https:; font-src 'self' data: https:; object-src 'none'; base-uri 'self';" always;
```

### 2. Безопасный JavaScript код

Создан `src/chart/trusted_script_fix.js` с безопасными функциями:

```javascript
// Безопасная очистка вместо innerHTML = ''
window.TrustedScriptUtils.safeClearElement(element);

// Безопасное создание элементов
const li = window.TrustedScriptUtils.safeCreateElement('li', text, className);

// Безопасное добавление событий
window.TrustedScriptUtils.safeAddEventListener(element, 'click', handler);
```

### 3. Инициализация Trusted Types

Добавлена инициализация Trusted Types Policy:

```javascript
window.TrustedScriptUtils.initializeTrustedTypes();
```

## Применение исправлений

### Автоматическое применение:

```bash
# Исправить CSP и перезапустить
./scripts/fix_csp.sh
docker-compose restart
```

### Ручное применение:

1. **Обновить Docker контейнеры:**
   ```bash
   docker-compose down
   docker-compose up -d
   ```

2. **Проверить работу:**
   ```bash
   # Проверить CSP заголовки
   curl -I http://charts.expert/

   # Проверить JavaScript консоль в браузере
   open http://charts.expert/
   ```

## Возможные источники ошибки

### 1. Расширения браузера

Если `injectLeap.js` упоминается в ошибке:
- Отключите расширения браузера
- Проверьте Leap Motion SDK
- Попробуйте инкогнито режим

### 2. Браузерные настройки

Chrome флаги, которые могут влиять:
- `chrome://flags/#enable-experimental-web-platform-features`
- `chrome://flags/#strict-origin-isolation`

### 3. Проблемы с внешними скриптами

Если проблема с TradingView Charts:
```html
<!-- Добавить атрибут integrity -->
<script src="https://unpkg.com/lightweight-charts@3.8.0/dist/lightweight-charts.standalone.production.js" 
        integrity="sha384-..." crossorigin="anonymous"></script>
```

## Отладка

### Проверка CSP заголовков:

```bash
curl -I http://charts.expert/ | grep -i content-security-policy
```

### Проверка JavaScript ошибок:

```javascript
// В консоли браузера
console.log('TrustedScriptUtils:', window.TrustedScriptUtils);
console.log('Trusted Types:', window.trustedTypes);
```

### Проверка Trusted Types поддержки:

```javascript
if (window.trustedTypes) {
    console.log('✅ Trusted Types поддерживается');
} else {
    console.log('❌ Trusted Types не поддерживается');
}
```

## Восстановление строгой CSP

После исправления кода можно вернуть строгую CSP:

```bash
# Восстановить из бэкапа
cp nginx/nginx.conf.backup nginx/nginx.conf

# Или добавить обратно:
# require-trusted-types-for 'script'; trusted-types default
```

## Дополнительные ресурсы

- [MDN: Trusted Types](https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API)
- [CSP Reference](https://content-security-policy.com/)
- [TradingView Charts Docs](https://tradingview.github.io/lightweight-charts/) 