# SaaS Offer Platform

## Description
A modern SaaS platform built with React, Express, and PostgreSQL.

## Prerequisites
- Node.js v18 or higher
- PostgreSQL v14 or higher
- pnpm (recommended) or npm

## Setup
1. Clone the repository
```bash
git clone https://github.com/halobartku/saas-offer.git
cd saas-offer
```

2. Install dependencies
```bash
pnpm install
```

3. Configure environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up the database
```bash
pnpm db:push
```

5. Start development servers
```bash
pnpm dev
```

## Project Structure
```
├── client/          # Frontend React application
├── server/          # Backend Express application
├── db/              # Database schemas and migrations
└── shared/          # Shared types and utilities
```

## Available Scripts
- `pnpm dev` - Start development servers
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm db:push` - Push database changes

## Contributing
Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details