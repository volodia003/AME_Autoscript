# 🔄 **Полная схема работы React + Go OAuth2 аутентификации**

## 📋 **Алгоритм действий (Step-by-Step)**

### **🎯 Шаг 0: Подготовка**

```
1. Go бэкенд запущен на localhost:8080
2. React фронтенд запущен на localhost:3000
3. OAuth приложение настроено в Google Cloud Console
```

---

## 🔄 **Последовательность запросов**

### **1. 👤 Пользователь открывает React приложение**

```
Браузер: GET http://localhost:3000
React: → Показывает кнопку "Login with Google"
```

### **2. 🔐 Пользователь нажимает кнопку Login**

```
React: window.location.href = "http://localhost:8080/auth/google/login"
Браузер: → Переходит на Go бэкенд
```

### **3. 🚀 Go бэкенд генерирует OAuth URL**

```go
// Go обработчик
func GoogleLogin(c *fiber.Ctx) error {
    authURL := oauthConfig.AuthCodeURL(state)
    return c.Redirect(authURL) // → Google OAuth
}
```

```
Браузер: GET http://localhost:8080/auth/google/login
Go: → 302 Redirect to https://accounts.google.com/o/oauth2/v2/auth?...
```

### **4. 🌐 Google OAuth страница**

```
Браузер: GET https://accounts.google.com/o/oauth2/v2/auth?...
Пользователь: → Выбирает аккаунт, разрешает доступ
Google: → 302 Redirect to http://localhost:8080/auth/google/callback?code=...&state=...
```

### **5. 🔄 Go бэкенд обрабатывает callback**

```go
func GoogleCallback(c *fiber.Ctx) error {
    code := c.Query("code") // Получаем код от Google

    // Обмениваем код на токен
    token, err := oauthConfig.Exchange(code)

    // Получаем данные пользователя
    userInfo := getUserInfo(token)

    // Создаем/обновляем пользователя в БД
    user := createOrUpdateUser(userInfo)

    // Создаем сессию
    sessionToken := createSession(user)

    // Устанавливаем cookie
    c.Cookie(sessionCookie)

    // Редирект на фронтенд
    return c.Redirect("http://localhost:3000?auth=success")
}
```

### **6. ✅ Возврат на React приложение**

```
Браузер: GET http://localhost:3000?auth=success
React: → Обнаруживает параметр auth=success
React: → Делает запрос для проверки аутентификации
```

### **7. 🔍 React проверяет статус аутентификации**

```typescript
// React хук useAuth
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("auth") === "success") {
    checkAuthStatus(); // Делает запрос к Go
  }
}, []);

const checkAuthStatus = async () => {
  const response = await fetch("http://localhost:8080/auth/check", {
    credentials: "include", // Важно для cookies!
  });
  const { authenticated, user } = await response.json();

  if (authenticated) {
    setUser(user);
    setIsAuthenticated(true);
  }
};
```

### **8. 🏠 React показывает аутентифицированный интерфейс**

```typescript
// Если аутентифицирован - показываем контент
{
  isAuthenticated ? <Dashboard user={user} /> : <LoginPage />;
}
```

---

## 📊 **Схема потоков данных**

```
┌───────────┐        ┌───────────┐        ┌─────────────┐
│           │        │           │        │             │
│  React    │ ────── │   Go      │ ────── │   Google    │
│  Frontend │        │  Backend  │        │    OAuth    │
│           │        │           │        │             │
└───────────┘        └───────────┘        └─────────────┘
      │                     │                     │
      │ 1. GET /            │                     │
      │ ← Index.html        │                     │
      │                     │                     │
      │ 2. Click Login      │                     │
      │ → GET /auth/google/login │                │
      │                     │                     │
      │                     │ 3. Generate OAuth URL
      │                     │ → Redirect to Google │
      │                     │                     │
      │                     │                     │ 4. User auth
      │                     │                     │ ← Code + State
      │                     │                     │
      │                     │ 5. Process callback │
      │                     │ ← User data         │
      │                     │ → Set session cookie│
      │                     │                     │
      │ 6. Redirect to React│                     │
      │ ← 302 /?auth=success│                     │
      │                     │                     │
      │ 7. Check auth status│                     │
      │ → GET /auth/check   │                     │
      │ ← {user, authenticated} │                │
      │                     │                     │
      │ 8. Show user content│                     │
      │ ← Dashboard         │                     │
```

---

## 🔐 **Детальная схема OAuth flow**

### **A. Initiation Phase**

```
React Component → Go /auth/google/login → Google OAuth
     ↓                   ↓                       ↓
LoginButton.tsx   auth_handler.go        accounts.google.com
```

### **B. Authentication Phase**

```
Google OAuth → Go /auth/google/callback → React /?auth=success
     ↓                   ↓                           ↓
User consent    token exchange +          auth detection +
                session creation          status check
```

### **C. Session Management Phase**

```
React App ↔ Go API (with session cookie)
     ↓              ↓
Protected    Auth middleware
routes       validates session
```

---

## 🛡️ **Защищенные API запросы**

### **React делает запросы с credentials:**

```typescript
// Все API запросы включают cookies
fetch("http://localhost:8080/api/protected-data", {
  method: "GET",
  credentials: "include", // ← ОЧЕНЬ ВАЖНО!
});
```

### **Go проверяет сессию:**

```go
func AuthMiddleware(c *fiber.Ctx) error {
    sessionToken := c.Cookies("session_token")
    user, err := authService.ValidateSession(sessionToken)

    if err != nil {
        return c.Status(401).JSON(...)
    }

    c.Locals("user", user) // Добавляем пользователя в контекст
    return c.Next()
}
```

---

## 🔄 **Полный цикл запросов**

### **Запрос 1: Инициализация логина**

```
FROM: React (localhost:3000)
TO:   Go (localhost:8080)
URL:  GET /auth/google/login
RESP: 302 Redirect to Google
```

### **Запрос 2: Google аутентификация**

```
FROM: Browser
TO:   Google OAuth
URL:  GET https://accounts.google.com/o/oauth2/v2/auth?...
RESP: 302 Redirect to Go callback
```

### **Запрос 3: OAuth callback**

```
FROM: Google
TO:   Go (localhost:8080)
URL:  GET /auth/google/callback?code=ABC123&state=XYZ789
RESP: 302 Redirect to React + Set-Cookie
```

### **Запрос 4: Проверка аутентификации**

```
FROM: React (localhost:3000)
TO:   Go (localhost:8080)
URL:  GET /auth/check
HEAD: Cookie: session_token=abcdef123456
RESP: 200 {authenticated: true, user: {...}}
```

### **Запрос 5: Защищенные API вызовы**

```
FROM: React (localhost:3000)
TO:   Go (localhost:8080)
URL:  GET /api/achievements, POST /api/events, etc.
HEAD: Cookie: session_token=abcdef123456
RESP: 200 + данные
```

---

## ⚠️ **Критически важные моменты**

### **1. CORS настройки (Go)**

```go
cors.New(cors.Config{
    AllowOrigins: "http://localhost:3000", // React адрес
    AllowCredentials: true, // Разрешить cookies
})
```

### **2. Credentials в запросах (React)**

```typescript
// ОБЯЗАТЕЛЬНО для всех API запросов
fetch(url, {
  credentials: "include", // Отправляем cookies
});
```

### **3. Cookie настройки (Go)**

```go
c.Cookie(&fiber.Cookie{
    Name:     "session_token",
    HTTPOnly: true, // Защита от XSS
    Secure:   false, // true в production
    SameSite: "Lax", // Защита от CSRF
})
```

### **4. Обработка redirect (React)**

```typescript
// После OAuth callback
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get("auth") === "success") {
  // Проверяем аутентификацию
  checkAuth();
  // Очищаем URL
  window.history.replaceState({}, "", window.location.pathname);
}
```

---

## 🚀 **Алгоритм запуска**

### **1. Запуск бэкенда**

```bash
cd backend
go run cmd/api/main.go
# Сервер запущен на localhost:8080
```

### **2. Запуск фронтенда**

```bash
cd frontend
npm run dev
# React запущен на localhost:3000
```

### **3. Тестирование потока**

```
1. Открыть http://localhost:3000
2. Нажать "Login with Google"
3. Выбрать аккаунт Google
4. Разрешить доступ
5. Должен произойти автоматический redirect обратно
6. Должен показаться аутентифицированный интерфейс
```

Эта схема обеспечивает безопасную и надежную OAuth2 аутентификацию между React и Go! 🎯
