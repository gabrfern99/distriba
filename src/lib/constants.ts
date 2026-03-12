export const ITEMS_PER_PAGE = 50

export const MOVEMENT_TYPE_LABELS = {
  ENTRY: 'Entrada',
  EXIT: 'Saída',
  ADJUSTMENT: 'Ajuste',
} as const

export const MOVEMENT_ORIGIN_LABELS = {
  SALE: 'Venda',
  PURCHASE_ORDER: 'Pedido de Compra',
  INVENTORY_ADJUSTMENT: 'Inventário',
  MANUAL: 'Manual',
} as const

export const SALE_STATUS_LABELS = {
  OPEN: 'Aberta',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
} as const

export const PURCHASE_ORDER_STATUS_LABELS = {
  DRAFT: 'Rascunho',
  SENT: 'Enviado',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
} as const

export const INVENTORY_STATUS_LABELS = {
  OPEN: 'Aberto',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
} as const

export const TENANT_ROLE_LABELS = {
  OWNER: 'Proprietário',
  ADMIN: 'Administrador',
  OPERATOR: 'Operador',
  STOCK_MANAGER: 'Estoque',
} as const

export const GLOBAL_ROLE_LABELS = {
  SUPER_ADMIN: 'Super Admin',
  USER: 'Usuário',
} as const
