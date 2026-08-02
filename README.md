# TaskFlow Dashboard

TaskFlow — tasklar, loyihalar, jamoa a’zolari, calendar eventlari, analytics va reportlarni bitta dashboard orqali boshqarish uchun yaratilgan web-ilova.

Loyiha **Nuxt 3**, **Vue 3**, **TypeScript** va **Tailwind CSS** asosida yozilgan. Frontend REST API bilan ishlaydi, JWT autentifikatsiyani qo‘llab-quvvatlaydi va desktop, tablet hamda mobil ekranlarga moslashadi.

## Asosiy imkoniyatlar

- Dashboard statistikasi va workload ko‘rsatkichlari
- Tasklarni List va Kanban ko‘rinishida ko‘rsatish
- Drag-and-drop orqali task statusini yangilash
- Tasklarni qidirish va priority bo‘yicha filterlash
- Loyihalarni yaratish, tahrirlash, yakunlash, arxivlash va o‘chirish
- Project manager, category va team memberlarni biriktirish
- Project progress, completed tasklar va member avatarlarini ko‘rsatish
- Calendar eventlarini yaratish
- Event yaratilgach detail oynasini avtomatik ochish
- Event nomi, turi, sana-vaqti, attendee’lari va meeting linkini ko‘rsatish
- Department memberlarini role va status bo‘yicha boshqarish
- Analytics grafiklari va 6 oylik bo‘sh-state fallback
- Custom report yaratish va tayyor report faylini yuklab olish
- Profile va security sozlamalari
- Light, Dark va System theme
- 10 tadan ortiq elementlar uchun pagination

## Texnologiyalar

| Texnologiya | Vazifasi |
| --- | --- |
| Nuxt 3 | Framework, routing va runtime config |
| Vue 3 | Reactive UI va Composition API |
| TypeScript | Type-safe kod |
| Tailwind CSS | Design system va responsive layout |
| Nuxt `useState` | Umumiy application state |
| REST API | Backend integratsiyasi |
| JWT | Access va refresh token autentifikatsiyasi |

## Talablar

- Node.js 18+
- Yarn 1.22+
- Ishlaydigan TaskFlow backend API

Versiyalarni tekshirish:

```bash
node --version
yarn --version
```

## O‘rnatish

Repository’ni clone qiling:

```bash
git clone <repository-url>
cd task-flow-dashboard
```

Dependency’larni o‘rnating:

```bash
yarn install
```

## Environment sozlamasi

Namuna fayldan `.env` yarating:

```bash
cp .env.example .env
```

API URL’ni kiriting:

```env
NUXT_PUBLIC_API_BASE=https://admin.task.websteredu.uz/api/v1
```

`NUXT_PUBLIC_` prefiksli qiymatlar browser’da ko‘rinadi. Ushbu faylga maxfiy API key yoki token yozmang.

## Development

Development serverni ishga tushiring:

```bash
yarn dev
```

Ilova odatda quyidagi manzilda ochiladi:

```text
http://localhost:3000
```

Agar `3000` port band bo‘lsa, Nuxt avtomatik ravishda boshqa port tanlaydi.

## Production

Production build yaratish:

```bash
yarn build
```

Buildni lokal tekshirish:

```bash
yarn preview
```

Static build generatsiya qilish:

```bash
yarn generate
```

## Scriptlar

| Buyruq | Tavsif |
| --- | --- |
| `yarn dev` | Development serverni ishga tushiradi |
| `yarn build` | Production build yaratadi |
| `yarn preview` | Production buildni preview qiladi |
| `yarn generate` | Static output generatsiya qiladi |

## Route’lar

| Route | Sahifa |
| --- | --- |
| `/` | Dashboard |
| `/tasks` | Tasks |
| `/projects` | Projects |
| `/analytics` | Analytics |
| `/calendar` | Calendar |
| `/team` | Team Members |
| `/reports` | Reports |
| `/messages` | Messages |
| `/settings` | Settings |
| `/help` | Help & Support |
| `/login` | Login |

## Loyiha tuzilmasi

```text
task-flow-dashboard/
├── assets/
│   └── css/tailwind.css       # Global, component va dark-theme stillari
├── composables/
│   ├── useTaskFlowApi.ts      # API client, endpointlar va mapperlar
│   └── useTaskFlowStore.ts    # Umumiy state va backend data loading
├── middleware/
│   └── auth.global.ts         # Global authentication guard
├── pages/
│   ├── index.vue              # Dashboard va asosiy bo‘limlar
│   ├── login.vue              # Login sahifasi
│   └── logout.vue             # Logout sahifasi
├── public/                    # Static fayllar va faviconlar
├── .env.example               # Environment namuna fayli
├── app.vue                    # Root component
├── nuxt.config.ts             # Nuxt va runtime config
├── tailwind.config.ts         # Tailwind design tokenlari
└── package.json               # Scriptlar va dependency’lar
```

## API integratsiyasi

API bilan ishlash logikasi `composables/useTaskFlowApi.ts` ichida joylashgan.

API client:

- access va refresh tokenlarni saqlaydi;
- protected requestlarga Bearer token qo‘shadi;
- access token eskirganda uni refresh qilishga urinadi;
- backend response’larini UI uchun kerakli ko‘rinishga map qiladi;
- backend validation xatolarini foydalanuvchiga chiqaradi.

Asosiy endpointlar:

```text
POST /auth/token/
POST /auth/token/refresh/

GET, POST, PATCH, DELETE /projects/
GET, PATCH /tasks/
GET, POST, PATCH, DELETE /members/
GET /members/summary/
GET, POST, PATCH, DELETE /events/
GET, POST /reports/
```

## Report yaratish

Custom report POST requestida report parametrlari JSON string sifatida yuboriladi:

```json
{
  "workspace": "workspace-uuid",
  "name": "Team Performance Report",
  "report_type": "team_performance",
  "parameters": "{\"start_date\":\"2026-08-01\",\"end_date\":\"2026-08-31\",\"priority\":null,\"status\":null,\"export_format\":\"pdf\"}"
}
```

Report `processing` holatida bo‘lsa download mavjud bo‘lmaydi. Backend `file` maydonini qaytargach download tugmasi faylni yuklaydi.

## Rollar va permissionlar

Department va project boshqaruv amallari quyidagi rollarga ruxsat etilgan:

- `owner`
- `admin`
- `manager`

Oddiy `member` boshqaruv mutationlarini bajara olmaydi.

> Frontend permission tekshiruvi xavfsizlik chegarasi emas. Backend har bir POST, PATCH va DELETE requestida ruxsatni qayta tekshirishi kerak.

## Theme

Ilova uchta theme’ni qo‘llab-quvvatlaydi:

- Light
- Dark
- System

Tanlangan theme browser `localStorage`ida saqlanadi. System rejimi qurilmaning color-scheme sozlamasidan foydalanadi.

## Development qoidalari

O‘zgarish yuborishdan oldin:

1. `yarn build` ishlashini tekshiring.
2. Light va Dark theme’da asosiy sahifalarni ko‘rib chiqing.
3. Desktop, tablet va mobil breakpointlarni tekshiring.
4. Backend request payload va response mapperlarini solishtiring.
5. `.env`, tokenlar va maxfiy ma’lumotlarni commit qilmang.

## Muammolarni aniqlash

### API ma’lumotlari kelmayapti

- `.env` ichidagi `NUXT_PUBLIC_API_BASE` qiymatini tekshiring.
- Backend CORS sozlamasini tekshiring.
- Access token eskirgan bo‘lsa qayta login qiling.
- Browser Network panelidagi response’ni tekshiring.

### Route reload’da 404 qaytmoqda

Hosting server barcha frontend route’larini `index.html`ga yo‘naltirishi kerak.

### Build warning chiqmoqda

Browserslist bazasini yangilash mumkin:

```bash
npx update-browserslist-db@latest
```

## License

Ushbu repository uchun alohida license belgilanmagan. Foydalanish va tarqatish shartlarini loyiha egasi bilan kelishib oling.
