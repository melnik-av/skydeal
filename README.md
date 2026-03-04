# SkyDeal — деплой на Vercel

## Структура
```
skydeal/
  api/
    flights.js      ← прокси-функция (обходит CORS)
  public/
    index.html      ← фронтенд приложения
  vercel.json       ← конфиг роутинга
```

## Деплой за 3 шага

### 1. Установите Vercel CLI
```bash
npm install -g vercel
```

### 2. Войдите в аккаунт
```bash
vercel login
```

### 3. Задеплойте из папки skydeal
```bash
cd skydeal
vercel --prod
```

Vercel спросит несколько вопросов:
- Set up and deploy? → **Y**
- Which scope? → выберите ваш аккаунт
- Link to existing project? → **N**
- Project name? → **skydeal** (или любое)
- Directory? → **.** (точка — текущая папка)

После деплоя получите ссылку вида `skydeal.vercel.app` — приложение готово!

## Токен
Токен уже зашит в `api/flights.js`.
Для безопасности можно вынести в переменную окружения:
- В Vercel Dashboard → Settings → Environment Variables
- Добавьте `TP_TOKEN` = ваш токен
