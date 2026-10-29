/**
 * Dependency Injection Container
 * Wires up all dependencies following SOLID principles
 */

// Repositories
const PelangganRepository = require('./repositories/PelangganRepository');
const ProdukRepository = require('./repositories/ProdukRepository');
const PesananRepository = require('./repositories/PesananRepository');

// Controllers
const PelangganController = require('../presentation/controllers/PelangganController');

// Unit of Work
const UnitOfWork = require('./unit-of-work/UnitOfWork');

class DIContainer {
  constructor() {
    this.instances = new Map();
    this.registerDependencies();
  }

  registerDependencies() {
    // Register Repositories (Singleton)
    this.register('pelangganRepository', () => new PelangganRepository(), true);
    this.register('produkRepository', () => new ProdukRepository(), true);
    this.register('pesananRepository', () => new PesananRepository(), true);

    // Register Unit of Work (Singleton)
    this.register('unitOfWork', () => new UnitOfWork(), true);

    // Register Controllers (Transient - new instance per request)
    this.register('pelangganController', () => {
      return new PelangganController(this.resolve('pelangganRepository'));
    }, false);
  }

  register(name, factory, singleton = true) {
    this.instances.set(name, {
      factory,
      singleton,
      instance: null
    });
  }

  resolve(name) {
    const registration = this.instances.get(name);
    
    if (!registration) {
      throw new Error(`Dependency '${name}' not registered`);
    }

    if (registration.singleton) {
      if (!registration.instance) {
        registration.instance = registration.factory();
      }
      return registration.instance;
    }

    return registration.factory();
  }

  resolveAll() {
    return {
      pelangganController: this.resolve('pelangganController'),
      pelangganRepository: this.resolve('pelangganRepository'),
      produkRepository: this.resolve('produkRepository'),
      pesananRepository: this.resolve('pesananRepository'),
      unitOfWork: this.resolve('unitOfWork')
    };
  }
}

// Export singleton instance
module.exports = new DIContainer();
