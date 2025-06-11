# Releasor 🚀

A modern Electron-based monitoring and testing tool for development and production environments with real-time log streaming and intelligent Docker container management.

## Overview

Releasor is a desktop application built with **Electron**, **React**, and **Vite** that provides:
- **Real-time log monitoring** for Docker containers across dev/production environments
- **SSH-based production monitoring** with secure remote log streaming  
- **Intelligent container discovery** and automatic service detection
- **Hot-reloading development environment** for rapid iteration
- **Configurable command system** with JSON-based configuration

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │  Command Runner │  │   IPC Handlers  │  │   Window    │ │
│  │     Backend     │  │                 │  │  Manager    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
                    ┌─────────────────┐
                    │    Preload      │
                    │   (Security)    │
                    └─────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                   Renderer Process (React)                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Header        │  │    Sidebar      │  │   Content   │ │
│  │ (Environment)   │  │  (Navigation)   │  │   Sections  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │  Logs Section   │  │ Deployment      │  │   Config    │ │
│  │ (Real-time)     │  │   Section       │  │   Modal     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Features

### 🔄 Real-Time Log Streaming
- Live Docker container log monitoring
- Support for both development and production environments
- SSH-based secure production log streaming
- Automatic timestamp formatting and stream management

### 🐳 Docker Integration
- Development: Direct `docker compose` command execution
- Production: SSH-based remote Docker container monitoring
- Container status checking before log streaming
- Support for multiple services (backend, wuzapi, etc.)

### ⚙️ Configuration Management  
- JSON-based command configuration (`config/commands.json`)
- Environment-specific command sets (dev/production)
- Editable configuration through built-in modal
- Working directory support for project-specific commands

### 🖥️ Modern UI
- React-based responsive interface
- Environment switching (Development/Production)
- Service selection and status monitoring
- Real-time log display with auto-scrolling

## Getting Started

### Prerequisites
- **Node.js** 16+ and npm
- **Docker** and Docker Compose for development
- **SSH access** to production servers (if monitoring production)
- Linux/macOS environment (Windows support via WSL)

### Installation

```bash
# Clone the repository
git clone https://github.com/dani139/Releasor.git
cd Releasor

# Install dependencies
npm install

# Configure your commands (optional)
# Edit config/commands.json with your specific Docker commands and SSH details
```

### Development Setup

The application uses Vite for hot reloading during development:

```bash
# Start development mode (with hot reload)
npm run dev
```

This will:
1. Start the Vite dev server on `http://localhost:5173`
2. Launch Electron with hot reloading enabled
3. Enable automatic refresh when code changes

### Production Build

```bash
# Build the application
npm run build

# The built application will be in the dist/ directory
```

### Testing

```bash
# Run the test suite (Playwright)
npm run test
```

## Configuration

### Commands Configuration

Edit `config/commands.json` to customize your monitoring commands:

```json
{
  "development": {
    "workingDirectory": "/path/to/your/project",
    "services": {
      "backend": {
        "logs": "docker compose -f docker-compose.dev.yml logs backend -f",
        "status": "docker compose -f docker-compose.dev.yml ps"
      }
    }
  },
  "production": {
    "workingDirectory": "/path/to/your/project", 
    "services": {
      "backend": {
        "logs": "ssh -i aws_key.pem user@server 'docker compose logs backend -f --tail=100'",
        "status": "ssh -i aws_key.pem user@server 'docker compose ps'"
      }
    }
  }
}
```

### Environment Variables

Create a `.env` file for sensitive configuration:

```bash
# Production SSH details
PROD_SSH_KEY=/path/to/your/ssh/key.pem
PROD_SSH_USER=ec2-user
PROD_SSH_HOST=your-server-ip

# Development settings
DEV_COMPOSE_FILE=docker-compose.dev.yml
PROD_COMPOSE_FILE=docker-compose.prod.yml
```

## Usage

### Starting the Application

```bash
npm run dev  # Development with hot reload
# or
npm start    # Production mode
```

### Using the Interface

1. **Environment Selection**: Choose between Development and Production in the header
2. **Service Selection**: Pick which Docker service to monitor from the sidebar
3. **Log Streaming**: Logs automatically stream in real-time when a service is selected
4. **Configuration**: Use the config button to edit command settings
5. **Navigation**: Use the sidebar to switch between different monitoring sections

### Working Directory

The application respects the `workingDirectory` setting in your configuration. Commands will be executed from this directory, which is useful for:
- Finding your `docker-compose.yml` files
- Locating SSH keys for production access
- Running project-specific scripts

## Project Structure

```
Releasor/
├── frontend/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── context/          # React context providers
│   │   └── main.jsx         # React entry point
│   ├── index.html           # Vite HTML template
│   └── vite.config.js       # Vite configuration
├── src/main/                # Electron main process
│   └── command-runner.js    # Backend command execution
├── config/
│   └── commands.json        # Command configuration
├── tests/                   # Playwright test files
├── main.js                  # Electron main process entry
├── preload.js              # Electron preload script
└── package.json            # Dependencies and scripts
```

## Scripts

- `npm run dev` - Start development with hot reload
- `npm run build` - Build production version  
- `npm run test` - Run Playwright tests
- `npm start` - Start production application

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with hot reloading: `npm run dev`
4. Run tests: `npm run test`
5. Commit your changes (`git commit -m 'Add some amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Troubleshooting

### Common Issues

**Hot reload not working**: Make sure Vite dev server is running on port 5173
**SSH connection fails**: Check your SSH key permissions and server access
**Docker commands fail**: Verify Docker is running and compose files exist
**Commands not found**: Check the `workingDirectory` setting in config

### Development Tips

- Use `npm run dev` for the best development experience
- Check the Electron DevTools (Ctrl+Shift+I) for debugging
- Monitor the terminal for backend command output and errors
- Test configuration changes through the built-in config modal

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Repository

- **GitHub**: [dani139/Releasor](https://github.com/dani139/Releasor)
- **Issues**: Report bugs and request features via GitHub Issues

---

**Releasor** - Modern monitoring made simple with Electron, React, and real-time streaming. 🖥️⚡ 


## Current

for frontend, dev in config, have optiont to define how to run it, it shou7ld have
(cd frontend && npm run dev-clean &)
so when click run on the frontend (like the other dockers for dev).
for getting status, also put in config how ever status get be retreived from this frtonend process, and also for logs, put command that gets logs for this.

- button to open in browser the web server 
- remove the main application serve text descitption

for database impl use
mui-datatables for table display

pg for backend Postgres access

Electron IPC for secure communication between UI and Node backend

🧱 1. Install Required Packages
📦 Frontend (React)
bash
Copy
Edit
npm install mui-datatables @mui/material @emotion/react @emotion/styled
📦 Backend (Electron Main)
bash
Copy
Edit
npm install pg
