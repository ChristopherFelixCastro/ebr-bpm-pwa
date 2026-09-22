# Base de datos local

1. Copie `.env.example` de la raíz a `.env` y cambie la contraseña local en todas las URL.
2. Inicie Docker Desktop y ejecute `docker compose up -d`.
3. Ejecute `npm install` desde la raíz.

```bash
npm run db:migrate
npm run db:verify
$env:DB_ALLOW_DESTRUCTIVE='true'; npm run db:down
$env:DB_ALLOW_DESTRUCTIVE='true'; npm run db:test:clean
npm run db:test:constraints
```

Las semillas son explícitas y todavía no existen. Las migraciones SQL son la fuente de verdad; no se ejecutan downs contra Supabase compartido. Cada `up` tiene SHA-256 registrado, advisory lock y transacción por migración.

`0002` no ejecuta semillas: los roles se cargarán después mediante una semilla explícita. La prueba SQL `db/tests/0002_constraints.sql` es transaccional y debe ejecutarse contra una base local migrada; valida FKs restrictivas, token no autorreferente y vigencia de contactos primarios.
