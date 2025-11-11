<div align="center">

# 📱 Nexus — API Backend de l’Application de Réseau Social  

🌀 Backend API construit avec **Express.js**, **PostgreSQL (Neon)** et **Clerk** pour une authentification sécurisée.

</div>

---

## 🚀 Fonctionnalités

### 👥 Gestion des Utilisateurs
- ✅ Authentification sécurisée avec **Clerk**  
- 👤 Profils personnalisables (photo, bio, bannière)  
- 🔍 Système de followers (suivre / ne plus suivre)  
- 📝 Informations personnelles enrichies  

### 📱 Publications
- ✨ Création de posts avec texte et images  
- 🖼️ Upload via **Cloudinary**  
- ❤️ Likes en temps réel  
- 🗑️ Suppression avec confirmation  
- 📊 Compteurs de likes & commentaires  

### 💬 Interactions Sociales
- 💬 Commentaires sur les posts  
- 🔖 Bookmarks (posts favoris)  
- 🔔 Notifications dynamiques  
- 👀 Flux d’actualités personnalisé  

### 🛡️ Sécurité & Performance
- 🔒 Authentification **JWT** via Clerk  
- 🛡️ Protection **Arcjet** contre les bots  
- ⚡ Rate limiting via **Upstash Redis**  
- 📡 API RESTful structurée  
- 🚀 Optimisation des performances  

---

## 🛠️ Stack Technique

| Catégorie | Technologies |
|------------|--------------|
| **Backend** | Node.js • Express.js |
| **Base de données** | PostgreSQL (Neon) |
| **Auth** | Clerk |
| **Stockage d'images** | Cloudinary |
| **Sécurité** | Arcjet |
| **Cache / Rate Limit** | Upstash Redis |

---

## 📦 Installation

### 🔧 Prérequis
- Node.js **v18+**  
- Compte **Clerk**  
- Base de données **PostgreSQL (Neon)**  
- Compte **Cloudinary**

---

### ⚙️ Étapes d’installation

#### 1️⃣ Cloner le projet
```bash
git clone https://github.com/Maxime015/nexus-backend.git
cd nexus-backend
```

#### 2️⃣ Installer les dépendances
```bash
npm install
```

#### 3️⃣ Configurer les variables d’environnement
```bash
cp .env.example .env
```

Puis remplir le fichier `.env` :
```env
# Database
DATABASE_URL=votre_url_neon

# Authentication
CLERK_PUBLISHABLE_KEY=votre_cle_publique
CLERK_SECRET_KEY=votre_cle_secrete

# Cloudinary
CLOUDINARY_CLOUD_NAME=votre_nom_cloud
CLOUDINARY_API_KEY=votre_cle_api
CLOUDINARY_API_SECRET=votre_secret

# Security
ARCJET_KEY=votre_cle_arcjet

# Redis
UPSTASH_REDIS_REST_URL=votre_url_redis
UPSTASH_REDIS_REST_TOKEN=votre_token_redis

# App
PORT=3000
NODE_ENV=development
API_URL=http://votre_url_render_ou_vercel/health
```

#### 4️⃣ Lancer l’application
```bash
# Mode développement
npm run dev

# Mode production
npm start
```

---

## 🗃️ Structure de la Base de Données

| Table | Description |
|--------|--------------|
| 👥 users | Utilisateurs |
| 📝 posts | Publications |
| ❤️ likes | Likes des posts |
| 💬 comments | Commentaires |
| 👀 follows | Relations de suivi |
| 🔔 notifications | Notifications |
| 🔖 bookmarks | Posts favoris |

---

## 🏗️ Architecture du Système

```mermaid
graph TB
    subgraph "📱 Clients"
        WEB[🌐 Web Browser]
        MOBILE[📱 Mobile App]
    end

    LB[🔄 Load Balancer]

    subgraph "⚡ Application Nexus"
        subgraph "🛡️ Middlewares"
            CORS[🌐 CORS]
            RATE_LIMIT[📊 Rate Limiting]
            ARCJET[🛡️ Arcjet Security]
            CLERK_AUTH[🔐 Clerk Auth]
            UPLOAD[📤 Upload Middleware]
        end

        subgraph "🚀 Routes API"
            USERS_ROUTE[👥 Users]
            POSTS_ROUTE[📝 Posts]
            COMMENTS_ROUTE[💬 Comments]
            NOTIFICATIONS_ROUTE[🔔 Notifications]
            BOOKMARKS_ROUTE[🔖 Bookmarks]
        end

        subgraph "🎯 Controllers"
            USERS_CTRL[👤 Users Controller]
            POSTS_CTRL[📮 Posts Controller]
            COMMENTS_CTRL[💭 Comments Controller]
            NOTIF_CTRL[🔔 Notifications Controller]
            BOOKMARKS_CTRL[⭐ Bookmarks Controller]
        end

        subgraph "🗃️ Models & Database"
            DB[(🐘 PostgreSQL Neon)]
        end
    end

    subgraph "🔗 Services Externes"
        CLERK[🔐 Clerk]
        CLOUDINARY[☁️ Cloudinary]
        ARCJET_SVC[🛡️ Arcjet]
        UPSTASH[🔴 Upstash Redis]
        CRON[⏰ Cron Jobs]
    end

    WEB --> LB
    MOBILE --> LB
    LB --> CORS
    CORS --> RATE_LIMIT
    RATE_LIMIT --> ARCJET
    ARCJET --> CLERK_AUTH
    CLERK_AUTH --> USERS_ROUTE
    USERS_ROUTE --> USERS_CTRL
    USERS_CTRL --> DB
    POSTS_ROUTE --> POSTS_CTRL
    POSTS_CTRL --> CLOUDINARY
    POSTS_CTRL --> DB
    ARCJET --> ARCJET_SVC
    RATE_LIMIT --> UPSTASH
```

---

## 📊 Flux de Données

```mermaid
sequenceDiagram
    participant C as 📱 Client
    participant LB as 🔄 Load Balancer
    participant MW as 🛡️ Middlewares
    participant API as 🚀 API Routes
    participant CTRL as 🎯 Controllers
    participant DB as 🗃️ Database
    participant EXT as 🔗 Services Externes

    C->>LB: Requête HTTP
    LB->>MW: Passage des middlewares
    MW->>EXT: Vérification Auth (Clerk)
    EXT-->>MW: Token valide/invalide
    MW->>API: Routage vers l'endpoint

    API->>CTRL: Appel du Controller
    CTRL->>EXT: Upload image (Cloudinary)
    EXT-->>CTRL: URL de l'image
    CTRL->>DB: Insertion du post
    DB-->>CTRL: Post créé
    CTRL-->>C: Réponse JSON
```

---

## 🗂️ Structure des Données

```mermaid
erDiagram
    USERS {
        uuid _id PK
        string clerk_id UK
        string username
        string fullname
        string email
        text bio
        string image
        int followers
        int following
        int posts
        timestamp created_at
    }

    POSTS {
        uuid _id PK
        uuid user_id FK
        string image_url
        string storage_id
        text caption
        int likes
        int comments
        timestamp created_at
    }

    LIKES {
        uuid _id PK
        uuid user_id FK
        uuid post_id FK
        timestamp created_at
    }

    COMMENTS {
        uuid _id PK
        uuid user_id FK
        uuid post_id FK
        text content
        timestamp created_at
    }

    FOLLOWS {
        uuid _id PK
        uuid follower_id FK
        uuid following_id FK
        timestamp created_at
    }

    NOTIFICATIONS {
        uuid _id PK
        uuid receiver_id FK
        uuid sender_id FK
        string type
        uuid post_id FK
        uuid comment_id FK
        timestamp created_at
    }

    BOOKMARKS {
        uuid _id PK
        uuid user_id FK
        uuid post_id FK
        timestamp created_at
    }

    USERS ||--o{ POSTS : "crée"
    USERS ||--o{ LIKES : "donne"
    USERS ||--o{ COMMENTS : "écrit"
    USERS ||--o{ FOLLOWS : "suit"
    USERS ||--o{ NOTIFICATIONS : "reçoit"
    USERS ||--o{ BOOKMARKS : "sauvegarde"
    POSTS ||--o{ LIKES : "reçoit"
    POSTS ||--o{ COMMENTS : "contient"
    POSTS ||--o{ NOTIFICATIONS : "déclenche"
    POSTS ||--o{ BOOKMARKS : "est sauvegardé"
    COMMENTS ||--o{ NOTIFICATIONS : "génère"
```

---

## 🔄 Flux des Requêtes

```mermaid
flowchart TD
    START([🌐 Requête Client]) --> VALIDATE{📋 Validation}
    VALIDATE -->|Invalide| ERROR_400[❌ 400 Bad Request]
    VALIDATE -->|Valide| AUTH{🔐 Authentification}
    AUTH -->|Non authentifié| ERROR_401[❌ 401 Unauthorized]
    AUTH -->|OK| RATE{📊 Rate Limit}
    RATE -->|Trop de requêtes| ERROR_429[❌ 429 Too Many Requests]
    RATE -->|OK| SECURITY{🛡️ Arcjet}
    SECURITY -->|Bot détecté| ERROR_403[❌ 403 Forbidden]
    SECURITY -->|OK| PROCESS[⚡ Traitement Métier]
    PROCESS --> DB_OP{🗃️ Opération DB}
    DB_OP -->|Succès| SUCCESS[✅ 200 OK]
    DB_OP -->|Erreur| ERROR_500[❌ 500 Server Error]
    SUCCESS --> LOG[📝 Log]
    ERROR_500 --> LOG
    LOG --> END([🏁 Fin])
```

---

## 📚 Documentation API

### 🔗 Accès
```
http://localhost:3000/api-docs
```

### 🛣️ Endpoints Principaux

#### 👥 Utilisateurs
```
POST   /api/users/sync
GET    /api/users/me
GET    /api/users/profile/:id
PUT    /api/users/profile
GET    /api/users/is-following/:followingId
POST   /api/users/toggle-follow
```

#### 📝 Publications
```
POST   /api/posts
GET    /api/posts/feed
GET    /api/posts/user/:userId
DELETE /api/posts/:postId
POST   /api/posts/toggle-like
```

#### 💬 Commentaires
```
POST   /api/comments
GET    /api/comments/:postId
```

#### 🔖 Favoris
```
POST   /api/bookmarks/toggle
GET    /api/bookmarks
```

#### 🔔 Notifications
```
GET    /api/notifications
```

---

## 🤝 Contribution

1. 🍴 Fork du projet  
2. 🌿 Crée une branche :
   ```bash
   git checkout -b feature/NouvelleFeature
   ```
3. 💾 Commit :
   ```bash
   git commit -m "Add NouvelleFeature"
   ```
4. 📤 Push :
   ```bash
   git push origin feature/NouvelleFeature
   ```
5. 🔀 Ouvre une Pull Request  

---

## 📄 Licence
Distribué sous la licence **MIT**.  
Voir [`LICENSE`](LICENSE) pour plus de détails.

---

## 👨‍💻 Auteur
**Maxime ANANIVI** — Développeur principal  
[GitHub](https://github.com/Maxime015) • [Portfolio](https://votresite.com)

---

## 🙏 Remerciements
- [Clerk](https://clerk.dev) — Authentification sécurisée  
- [Cloudinary](https://cloudinary.com) — Stockage et optimisation d’images  
- [Neon](https://neon.com) — PostgreSQL serverless  
- [Arcjet](https://arcjet.com) — Sécurité avancée  
- [Upstash](https://upstash.com) — Redis & Rate Limiting  

