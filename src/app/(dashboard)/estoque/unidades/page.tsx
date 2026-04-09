import { getUnits, deleteUnit } from '@/features/estoque/actions'
import { UnitForm } from './unit-form'
import { DeleteUnitButton } from './delete-unit-button'
import { EmptyState } from '@/components/shared/empty-state'
import { Ruler } from 'lucide-react'

export default async function UnidadesPage() {
  const units = await getUnits()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Unidades de Medida</h1>
        <p className="text-muted-foreground text-sm">Gerencie as unidades usadas nos produtos</p>
      </div>

      <UnitForm />

      {units.length === 0 ? (
        <EmptyState
          icon={Ruler}
          title="Nenhuma unidade cadastrada"
          description="Adicione unidades de medida como caixa, fardo, kg, etc."
        />
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Nome</th>
                <th className="text-left px-4 py-3 font-medium">Abreviação</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {units.map((unit) => (
                <tr key={unit.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{unit.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{unit.abbreviation}</td>
                  <td className="px-4 py-3 text-right">
                    <DeleteUnitButton unitId={unit.id} unitName={unit.name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
