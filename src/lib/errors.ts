export class AppError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Não autorizado') {
    super(message, 'UNAUTHORIZED')
    this.name = 'UnauthorizedError'
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado') {
    super(message, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

export class InsufficientStockError extends AppError {
  constructor(productName: string) {
    super(`Estoque insuficiente: ${productName}`, 'INSUFFICIENT_STOCK')
    this.name = 'InsufficientStockError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
  }
}
