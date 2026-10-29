# 🏗️ Clean Architecture Documentation

## Overview

This application follows **Clean Architecture** principles with **Domain-Driven Design (DDD)**, **CQRS**, **Unit of Work**, and **SOLID** principles.

## 📁 Project Structure

```
laundry-app/
├── src/
│   ├── domain/                    # Business Logic Layer (Pure)
│   │   ├── entities/              # Domain Entities with business logic
│   │   │   ├── Pelanggan.js
│   │   │   ├── Produk.js
│   │   │   └── Pesanan.js
│   │   ├── value-objects/         # Immutable value objects
│   │   │   └── Money.js
│   │   ├── repositories/          # Repository Interfaces (contracts)
│   │   │   ├── IPelangganRepository.js
│   │   │   ├── IProdukRepository.js
│   │   │   └── IPesananRepository.js
│   │   └── events/                # Domain Events
│   │
│   ├── application/               # Application Logic Layer
│   │   ├── commands/              # CQRS Commands (Write operations)
│   │   │   ├── CreatePelangganCommand.js
│   │   │   └── UpdatePelangganCommand.js
│   │   ├── queries/               # CQRS Queries (Read operations)
│   │   │   ├── GetAllPelangganQuery.js
│   │   │   └── GetPelangganByIdQuery.js
│   │   ├── handlers/              # Command & Query Handlers
│   │   │   ├── CreatePelangganHandler.js
│   │   │   └── GetAllPelangganHandler.js
│   │   └── dtos/                  # Data Transfer Objects
│   │
│   ├── infrastructure/            # External Concerns Layer
│   │   ├── database/              # Database configuration
│   │   │   └── prisma.client.js
│   │   ├── repositories/          # Repository Implementations
│   │   │   ├── PelangganRepository.js
│   │   │   ├── ProdukRepository.js
│   │   │   └── PesananRepository.js
│   │   ├── unit-of-work/          # Transaction Management
│   │   │   └── UnitOfWork.js
│   │   └── di-container.js        # Dependency Injection
│   │
│   ├── presentation/              # Presentation Layer
│   │   ├── controllers/           # HTTP Controllers
│   │   │   └── PelangganController.js
│   │   ├── routes/                # Route definitions
│   │   │   └── pelanggan.routes.js
│   │   └── middlewares/           # Express middlewares
│   │       └── errorHandler.js
│   │
│   └── shared/                    # Shared utilities
│       ├── exceptions/            # Custom exceptions
│       │   └── DomainException.js
│       └── utils/                 # Helper utilities
│           └── ResponseFormatter.js
│
├── prisma/                        # Prisma ORM
│   └── schema.prisma
├── views/                         # EJS templates
├── public/                        # Static assets
└── app.js                         # Application entry point
```

## 🎯 Design Patterns & Principles

### 1. **Clean Architecture**
- **Dependency Rule**: Dependencies point inward (Domain ← Application ← Infrastructure ← Presentation)
- **Domain** is independent of frameworks, UI, database
- **Application** contains use cases
- **Infrastructure** implements interfaces defined in domain
- **Presentation** handles HTTP requests/responses

### 2. **CQRS (Command Query Responsibility Segregation)**

#### Commands (Write Operations)
```javascript
// Command - represents intention to change state
class CreatePelangganCommand {
  constructor({ nama, no_hp, alamat }) {
    this.nama = nama;
    this.no_hp = no_hp;
    this.alamat = alamat;
  }
  validate() { /* validation logic */ }
}

// Command Handler - executes the command
class CreatePelangganHandler {
  async handle(command) {
    // 1. Validate
    // 2. Apply business rules
    // 3. Persist changes
    // 4. Return result
  }
}
```

#### Queries (Read Operations)
```javascript
// Query - requests data without side effects
class GetAllPelangganQuery {
  constructor({ page, limit }) {
    this.page = page;
    this.limit = limit;
  }
}

// Query Handler - fetches and returns data
class GetAllPelangganHandler {
  async handle(query) {
    // Fetch data optimized for reading
    return { data, meta };
  }
}
```

**Benefits**:
- Optimized read and write models
- Scalability (can separate read/write databases)
- Clear separation of concerns

### 3. **Repository Pattern**

#### Interface (Domain Layer)
```javascript
// Contract defined in domain
class IPelangganRepository {
  async findAll() { throw new Error('Not implemented'); }
  async findById(id) { throw new Error('Not implemented'); }
  async create(pelanggan) { throw new Error('Not implemented'); }
}
```

#### Implementation (Infrastructure Layer)
```javascript
// Concrete implementation using Prisma
class PelangganRepository extends IPelangganRepository {
  async findAll() {
    const data = await prisma.pelanggan.findMany();
    return data.map(Pelanggan.fromPrisma);
  }
}
```

**Benefits**:
- Abstraction over data access
- Easy to mock for testing
- Can swap ORM without changing business logic

### 4. **Unit of Work Pattern**

Manages transactions across multiple repositories ensuring ACID properties:

```javascript
const unitOfWork = new UnitOfWork();

await unitOfWork.executeInTransaction(async (tx) => {
  // All operations in this block are atomic
  const pelanggan = await pelangganRepo.create(data);
  const pesanan = await pesananRepo.create({ id_pelanggan: pelanggan.id });
  
  // If any fails, all rollback
  // If all succeed, all commit
});
```

**ACID Properties**:
- **Atomicity**: All or nothing
- **Consistency**: Data remains valid
- **Isolation**: Transactions don't interfere
- **Durability**: Committed changes persist

**Features**:
- Transaction management
- Automatic rollback on error
- Retry logic for transient failures
- Exponential backoff

### 5. **Domain-Driven Design (DDD)**

#### Entities
Rich domain models with business logic:
```javascript
class Pesanan {
  progressStatus() {
    const statusFlow = ['diterima', 'dicuci', 'disetrika', 'siap', 'selesai'];
    // Business logic for status progression
  }

  calculateTotal() {
    // Business logic for total calculation
  }

  isCompleted() {
    return this.status_cucian === 'selesai';
  }
}
```

#### Value Objects
Immutable objects representing concepts:
```javascript
class Money {
  constructor(amount, currency) {
    this._amount = amount;
    this._currency = currency;
  }

  add(other) {
    return new Money(this._amount + other._amount, this._currency);
  }

  // No setters - immutable
}
```

### 6. **SOLID Principles**

#### S - Single Responsibility
Each class has one reason to change:
- `PelangganRepository`: Only handles pelanggan data access
- `CreatePelangganHandler`: Only handles pelanggan creation logic

#### O - Open/Closed
Open for extension, closed for modification:
- New repositories can extend `IRepository` without modifying existing code

#### L - Liskov Substitution
Derived classes can substitute base classes:
- `PelangganRepository` can replace `IPelangganRepository` anywhere

#### I - Interface Segregation
Clients shouldn't depend on methods they don't use:
- Repository interfaces are specific (pelanggan, produk, pesanan)

#### D - Dependency Inversion
Depend on abstractions, not concretions:
- Controllers depend on `IPelangganRepository`, not `PelangganRepository`
- Injected via DI Container

### 7. **Dependency Injection**

```javascript
// DI Container wires up dependencies
class DIContainer {
  register('pelangganRepository', () => new PelangganRepository(), true);
  register('pelangganController', () => {
    return new PelangganController(this.resolve('pelangganRepository'));
  });
}

// Usage in routes
const controller = diContainer.resolve('pelangganController');
app.use('/pelanggan', pelangganRoutes(controller));
```

**Benefits**:
- Loose coupling
- Easy testing (mock dependencies)
- Centralized configuration

### 8. **ORM (Prisma)**

Type-safe database client:
```javascript
// Type-safe queries
const pelanggan = await prisma.pelanggan.findMany({
  where: { nama: { contains: 'John' } },
  include: { pesanan: true }
});
```

**Benefits**:
- Type safety
- Auto-complete in IDE
- Migrations
- Query optimization

## 🔄 Data Flow

### Write Operation (Command)
```
1. HTTP Request → Controller
2. Controller → Create Command
3. Controller → Command Handler
4. Handler → Repository
5. Repository → Prisma → Database
6. Database → Prisma → Repository
7. Repository → Handler → Controller
8. Controller → HTTP Response
```

### Read Operation (Query)
```
1. HTTP Request → Controller
2. Controller → Create Query
3. Controller → Query Handler
4. Handler → Repository
5. Repository → Prisma → Database
6. Database → Prisma → Repository
7. Repository → Handler → Controller
8. Controller → HTTP Response (optimized for display)
```

## 🧪 Testing Strategy

### Unit Tests
- **Domain**: Test entities and value objects
- **Application**: Test handlers with mocked repositories
- **Infrastructure**: Test repository implementations

### Integration Tests
- Test full flow with real database (test container)

### Example
```javascript
// Unit test with mocked repository
test('CreatePelangganHandler creates pelanggan', async () => {
  const mockRepo = {
    create: jest.fn().mockResolvedValue(new Pelanggan(...))
  };
  
  const handler = new CreatePelangganHandler(mockRepo);
  const result = await handler.handle(command);
  
  expect(mockRepo.create).toHaveBeenCalled();
  expect(result.success).toBe(true);
});
```

## 📊 Benefits of This Architecture

1. **Maintainability**: Clear separation of concerns
2. **Testability**: Easy to mock dependencies
3. **Scalability**: Can optimize read/write separately
4. **Flexibility**: Easy to swap implementations
5. **Domain Focus**: Business logic is isolated
6. **Team Collaboration**: Clear boundaries for different teams

## 🚀 Getting Started

### Development
```bash
npm install
npm run prisma:generate
npm start
```

### Endpoints
- **Web**: `http://localhost:3000`
- **API Docs**: `http://localhost:3000/api/docs`
- **Health**: `http://localhost:3000/health`

## 📚 Further Reading

- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design by Eric Evans](https://www.domainlanguage.com/ddd/)
- [CQRS Pattern](https://martinfowler.com/bliki/CQRS.html)
- [Unit of Work Pattern](https://martinfowler.com/eaaCatalog/unitOfWork.html)
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
