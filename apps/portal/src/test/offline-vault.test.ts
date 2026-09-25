import { describe, expect, it } from 'vitest'
import type { CoreUser } from '@ebr-bpm/core-client'
import { enrollOfflineIdentity, listOfflinePackages, lockOfflineVault, offlineDb, openOfflineBinary, openOfflinePackage, rekeyOfflineIdentity, saveOfflineBinary, saveOfflinePackage, unlockOfflineIdentity } from '../offline/vault'

const evaluator = (id: string): CoreUser => ({ id, fullName: id, roleCode: 'EVALUATOR', status: 'APPROVED', companyId: null, authTime: Date.now() })

describe('paquetes locales cifrados', () => {
  it('abre tras recargar solo con la contraseña de la cuenta propietaria', async () => {
    await enrollOfflineIdentity(evaluator('eval-a'), 'clave-a')
    await saveOfflinePackage('eval-a', 'inspeccion-1', { inspection: { id: 'inspeccion-1' }, pending: [{ field: 'BPM', value: 'sí' }] })
    await enrollOfflineIdentity(evaluator('eval-b'), 'clave-b')
    await saveOfflinePackage('eval-b', 'inspeccion-2', { private: 'otra cuenta' })
    lockOfflineVault() // Equivale a recargar: desaparecen las claves en memoria.

    await expect(listOfflinePackages('eval-a')).rejects.toThrow('bloqueado')
    await expect(unlockOfflineIdentity('eval-a', 'clave-incorrecta')).rejects.toThrow()
    await unlockOfflineIdentity('eval-a', 'clave-a')
    expect(await listOfflinePackages('eval-a')).toEqual(['inspeccion-1'])
    expect(await openOfflinePackage<{ pending: unknown[] }>('eval-a', 'inspeccion-1')).toMatchObject({ pending: [{ field: 'BPM', value: 'sí' }] })
    await expect(openOfflinePackage('eval-a', 'inspeccion-2')).rejects.toThrow('no disponible')
    await expect(listOfflinePackages('eval-b')).rejects.toThrow('bloqueado')
    await offlineDb.identities.update('eval-a', { offlineUntil: Date.now() + 999_999_999 })
    lockOfflineVault()
    await unlockOfflineIdentity('eval-a', 'clave-a') // El campo editable ya no concede vigencia.
    expect(await listOfflinePackages('eval-a')).toEqual(['inspeccion-1'])
    lockOfflineVault()
  })
  it('no reemplaza identidad tras cambio de contraseña y rota paquete y binario juntos', async () => {
    await enrollOfflineIdentity(evaluator('eval-rotation'), 'anterior')
    await saveOfflinePackage('eval-rotation', 'inspeccion-r', { queue: [{ status: 'PENDING' }] })
    await saveOfflineBinary('eval-rotation', 'inspeccion-r', 'evidencia-r', new Uint8Array([1, 2, 3]))
    await expect(enrollOfflineIdentity(evaluator('eval-rotation'), 'actual')).rejects.toThrow()
    lockOfflineVault()
    await unlockOfflineIdentity('eval-rotation', 'anterior')
    expect(await openOfflinePackage('eval-rotation', 'inspeccion-r')).toMatchObject({ queue: [{ status: 'PENDING' }] })
    await expect(rekeyOfflineIdentity(evaluator('eval-rotation'), 'incorrecta', 'actual')).rejects.toThrow()
    await rekeyOfflineIdentity(evaluator('eval-rotation'), 'anterior', 'actual')
    lockOfflineVault()
    await expect(unlockOfflineIdentity('eval-rotation', 'anterior')).rejects.toThrow()
    await unlockOfflineIdentity('eval-rotation', 'actual')
    expect(await openOfflinePackage('eval-rotation', 'inspeccion-r')).toMatchObject({ queue: [{ status: 'PENDING' }] })
    expect([...await openOfflineBinary('eval-rotation', 'inspeccion-r', 'evidencia-r')]).toEqual([1, 2, 3])
    lockOfflineVault()
  })
})
