const { spawn } = require('child_process');
const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

class CommandRunner extends EventEmitter {
  constructor() {
    super();
    this.config = null;
    this.streams = new Map();
    this.streamCounter = 0;
    this.loadConfig();
  }

  async loadConfig() {
    try {
      const configPath = path.join(__dirname, '../../config/commands.json');
      const configData = await fs.readFile(configPath, 'utf8');
      this.config = JSON.parse(configData);
    } catch (error) {
      console.error('Failed to load config:', error);
      this.config = { commands: {}, environments: {} };
    }
  }

  getConfig() {
    return this.config;
  }

  async updateConfig(newConfig) {
    try {
      const configPath = path.join(__dirname, '../../config/commands.json');
      await fs.writeFile(configPath, JSON.stringify(newConfig, null, 2));
      this.config = newConfig;
    } catch (error) {
      throw new Error(`Failed to update config: ${error.message}`);
    }
  }

  resolveCommand(commandKey, environment = null) {
    const parts = commandKey.split('.');
    let command = this.config.commands;

    for (const part of parts) {
      if (command[part] === undefined) {
        throw new Error(`Command not found: ${commandKey}`);
      }
      command = command[part];
    }

    // If environment is specified and command has environment-specific versions
    if (environment && typeof command === 'object' && command[environment]) {
      command = command[environment];
    }

    // If it's still an object, we might need to get a specific subcommand
    if (typeof command === 'object' && !Array.isArray(command)) {
      // Return the first available command or throw error
      const keys = Object.keys(command);
      if (keys.length > 0) {
        command = command[keys[0]];
      } else {
        throw new Error(`No executable command found for: ${commandKey}`);
      }
    }

    return command;
  }

  async execute(commandKey, environment = null) {
    return new Promise((resolve, reject) => {
      try {
        const command = this.resolveCommand(commandKey, environment);
        const [cmd, ...args] = command.split(' ');

        const options = {
          shell: true,
          stdio: ['pipe', 'pipe', 'pipe']
        };

        // Use working directory from config if available
        if (this.config.working_directory) {
          options.cwd = this.config.working_directory;
        }

        const process = spawn(cmd, args, options);

        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        process.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        process.on('close', (code) => {
          if (code === 0) {
            resolve({
              stdout: stdout.trim(),
              stderr: stderr.trim(),
              exitCode: code,
              command,
              timestamp: new Date().toISOString()
            });
          } else {
            reject(new Error(`Command failed with exit code ${code}: ${stderr || stdout}`));
          }
        });

        process.on('error', (error) => {
          reject(new Error(`Failed to execute command: ${error.message}`));
        });

        // Kill process after 30 seconds to prevent hanging
        setTimeout(() => {
          if (!process.killed) {
            process.kill();
            reject(new Error('Command timed out after 30 seconds'));
          }
        }, 30000);

      } catch (error) {
        reject(error);
      }
    });
  }

  async startStream(commandKey, environment = null) {
    try {
      const command = this.resolveCommand(commandKey, environment);
      const [cmd, ...args] = command.split(' ');
      const streamId = `stream_${++this.streamCounter}`;

      const options = {
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe']
      };

      // Use working directory from config if available
      if (this.config.working_directory) {
        options.cwd = this.config.working_directory;
      }

      const process = spawn(cmd, args, options);

      this.streams.set(streamId, {
        process,
        command,
        startTime: new Date(),
        environment
      });

      process.stdout.on('data', (data) => {
        this.emit('stream-data', streamId, {
          type: 'stdout',
          data: data.toString(),
          timestamp: new Date().toISOString()
        });
      });

      process.stderr.on('data', (data) => {
        this.emit('stream-data', streamId, {
          type: 'stderr',
          data: data.toString(),
          timestamp: new Date().toISOString()
        });
      });

      process.on('close', (code) => {
        this.emit('stream-end', streamId, {
          exitCode: code,
          timestamp: new Date().toISOString()
        });
        this.streams.delete(streamId);
      });

      process.on('error', (error) => {
        this.emit('stream-error', streamId, {
          error: error.message,
          timestamp: new Date().toISOString()
        });
        this.streams.delete(streamId);
      });

      return streamId;
    } catch (error) {
      throw new Error(`Failed to start stream: ${error.message}`);
    }
  }

  async startDynamicStream(command, streamId = null) {
    try {
      const [cmd, ...args] = command.split(' ');
      const actualStreamId = streamId || `dynamic_stream_${++this.streamCounter}`;

      const options = {
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe']
      };

      // Use working directory from config if available
      if (this.config.working_directory) {
        options.cwd = this.config.working_directory;
      }

      const process = spawn(cmd, args, options);

      this.streams.set(actualStreamId, {
        process,
        command,
        startTime: new Date(),
        dynamic: true
      });

      process.stdout.on('data', (data) => {
        this.emit('stream-data', actualStreamId, {
          type: 'stdout',
          data: data.toString(),
          timestamp: new Date().toISOString()
        });
      });

      process.stderr.on('data', (data) => {
        this.emit('stream-data', actualStreamId, {
          type: 'stderr',
          data: data.toString(),
          timestamp: new Date().toISOString()
        });
      });

      process.on('close', (code) => {
        this.emit('stream-end', actualStreamId, {
          exitCode: code,
          timestamp: new Date().toISOString()
        });
        this.streams.delete(actualStreamId);
      });

      process.on('error', (error) => {
        this.emit('stream-error', actualStreamId, {
          error: error.message,
          timestamp: new Date().toISOString()
        });
        this.streams.delete(actualStreamId);
      });

      return actualStreamId;
    } catch (error) {
      throw new Error(`Failed to start dynamic stream: ${error.message}`);
    }
  }

  async stopStream(streamId) {
    const stream = this.streams.get(streamId);
    if (!stream) {
      throw new Error(`Stream not found: ${streamId}`);
    }

    try {
      stream.process.kill();
      this.streams.delete(streamId);
    } catch (error) {
      throw new Error(`Failed to stop stream: ${error.message}`);
    }
  }

  getActiveStreams() {
    return Array.from(this.streams.entries()).map(([id, stream]) => ({
      id,
      command: stream.command,
      startTime: stream.startTime,
      environment: stream.environment
    }));
  }

  // Container management methods
  async startContainer(containerName, environment) {
    try {
      const command = this.config.commands.container[environment].start;
      const actualCommand = command.replace('{service}', containerName);
      return await this.executeContainerCommand(actualCommand);
    } catch (error) {
      throw new Error(`Failed to start container ${containerName}: ${error.message}`);
    }
  }

  async stopContainer(containerName, environment) {
    try {
      const command = this.config.commands.container[environment].stop;
      const actualCommand = command.replace('{service}', containerName);
      return await this.executeContainerCommand(actualCommand);
    } catch (error) {
      throw new Error(`Failed to stop container ${containerName}: ${error.message}`);
    }
  }

  async restartContainer(containerName, environment) {
    try {
      const command = this.config.commands.container[environment].restart;
      const actualCommand = command.replace('{service}', containerName);
      return await this.executeContainerCommand(actualCommand);
    } catch (error) {
      throw new Error(`Failed to restart container ${containerName}: ${error.message}`);
    }
  }

  async getContainerStatus(containerName, environment) {
    try {
      const command = this.config.commands.container[environment].status;
      const actualCommand = command.replace('{service}', containerName);
      const result = await this.executeContainerCommand(actualCommand);
      
      // Parse the result to determine if container is running
      const output = result.stdout.toLowerCase();
      const isRunning = output.includes('up') || output.includes('running');
      
      return {
        name: containerName,
        status: isRunning ? 'running' : 'stopped',
        rawOutput: result.stdout,
        timestamp: result.timestamp
      };
    } catch (error) {
      return {
        name: containerName,
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async getAllContainersStatus(environment) {
    try {
      const containers = this.config.containers[environment] || [];
      const statusPromises = containers.map(container => 
        this.getContainerStatus(container.service, environment)
      );
      
      const statuses = await Promise.all(statusPromises);
      
      // Map status results back to container config
      return containers.map((container, index) => ({
        ...container,
        status: statuses[index].status,
        error: statuses[index].error,
        timestamp: statuses[index].timestamp
      }));
    } catch (error) {
      throw new Error(`Failed to get containers status: ${error.message}`);
    }
  }

  async executeContainerCommand(command) {
    return new Promise((resolve, reject) => {
      try {
        const [cmd, ...args] = command.split(' ');

        const options = {
          shell: true,
          stdio: ['pipe', 'pipe', 'pipe']
        };

        // Use working directory from config if available
        if (this.config.working_directory) {
          options.cwd = this.config.working_directory;
        }

        const process = spawn(cmd, args, options);

        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        process.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        process.on('close', (code) => {
          resolve({
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode: code,
            command,
            timestamp: new Date().toISOString()
          });
        });

        process.on('error', (error) => {
          reject(new Error(`Failed to execute container command: ${error.message}`));
        });

        // Kill process after 15 seconds for container commands
        setTimeout(() => {
          if (!process.killed) {
            process.kill();
            reject(new Error('Container command timed out after 15 seconds'));
          }
        }, 15000);

      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = CommandRunner; 