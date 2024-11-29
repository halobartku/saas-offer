# SaaS Offer Platform

A modern SaaS platform for managing offers, clients, and products, built with React, Express, and PostgreSQL.

## Features

- 🔐 Secure authentication system
- 👥 Client management
- 📄 Offer creation and management
- 📊 Sales pipeline
- 📦 Product catalog
- 📧 Email system
- ⚙️ Customizable settings

## Prerequisites

- Node.js v18 or higher
- PostgreSQL v14 or higher
- pnpm (recommended) or npm

## Quick Start

### Development Setup

1. Clone the repository
```bash
git clone https://github.com/halobartku/saas-offer.git
cd saas-offer
```

2. Set up environment variables
```bash
# Copy environment templates
cp .env.example .env
cp server/.env.example server/.env

# Edit the .env files with your configuration
```

3. Install dependencies
```bash
# Install server dependencies
cd server
pnpm install

# Install client dependencies
cd ../client
pnpm install
```

4. Start development servers
```bash
# Start server (from server directory)
pnpm dev

# Start client (from client directory)
pnpm dev
```

### Docker Deployment

1. Build and run with Docker Compose
```bash
docker-compose up -d
```

## Project Structure

```
├── client/               # Frontend React application
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utilities and API
│   │   └── pages/        # Application pages
├── server/               # Backend Express application
│   ├── src/
│   │   ├── api/         # API routes
│   │   ├── config/      # Configuration
│   │   ├── db/          # Database migrations
│   │   └── utils/       # Utilities
└── shared/              # Shared types and utilities
```

## Available Scripts

### Server

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm migrate` - Run database migrations

### Client

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details